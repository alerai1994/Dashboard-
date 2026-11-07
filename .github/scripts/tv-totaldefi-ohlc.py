#!/usr/bin/env python3
"""Retrieve actual CRYPTOCAP:TOTALDEFI historical OHLC bars for Vertex.

Uses the anonymous public chart-data connection (no credentials).
Never replaces existing dataset on partial/failing responses.
"""
import json
import math
import secrets
import time
from datetime import datetime, timezone

START = int(datetime(2017, 5, 8, tzinfo=timezone.utc).timestamp())
END = int(datetime(2026, 11, 8, tzinfo=timezone.utc).timestamp())


def get_totaldefi_ohlc():
    from websocket import create_connection
    sid = "cs_" + secrets.token_hex(6)
    qid = "qs_" + secrets.token_hex(6)
    candles = {}
    ws = None

    def send(method, params):
        body = json.dumps({"m": method, "p": params}, separators=(",", ":"))
        ws.send("~m~" + str(len(body)) + "~m~" + body)

    try:
        ws = create_connection(
            "wss://data.tradingview.com/socket.io/websocket",
            timeout=15, origin="https://www.tradingview.com",
            header={"User-Agent": "Mozilla/5.0"},
        )
        send("set_auth_token", ["unauthorized_user_token"])
        send("chart_create_session", [sid, ""])
        send("quote_create_session", [qid])
        send("resolve_symbol", [
            sid, "symbol_1",
            '={"symbol":"CRYPTOCAP:TOTALDEFI","adjustment":"splits","session":"regular"}',
        ])
        send("create_series", [sid, "s1", "s1", "symbol_1", "1D", 4500])
        seen_series = False
        began = time.monotonic()
        while time.monotonic() - began < 85:
            try:
                message = ws.recv()
            except Exception as err:
                if seen_series:
                    break
                print("TradingView socket recv error:", type(err).__name__, str(err)[:180])
                break
            if not isinstance(message, str):
                continue
            pieces = message.split("~m~")
            for blob in pieces:
                if not blob or not blob.startswith("{"):
                    continue
                try:
                    obj = json.loads(blob)
                except (ValueError, TypeError):
                    continue
                method = obj.get("m")
                if method in ("symbol_error", "series_error", "critical_error"):
                    print("TradingView error", method, str(obj.get("p"))[:240])
                if method in ("timescale_update", "du"):
                    for item in obj.get("p", []):
                        if not isinstance(item, dict):
                            continue
                        s = item.get("s1")
                        if not isinstance(s, dict):
                            continue
                        for bar in s.get("s", []):
                            values = bar.get("v")
                            if not isinstance(values, list) or len(values) < 5:
                                continue
                            try:
                                stamp = int(values[0])
                                op,hi,lo,cl = [float(v) for v in values[1:5]]
                            except (ValueError, TypeError, OverflowError):
                                continue
                            if not(START <= stamp < END):
                                continue
                            if not all(math.isfinite(x) and x > 0 for x in (op,hi,lo,cl)):
                                continue
                            if not(lo <= min(op,cl) <= max(op,cl) <= hi):
                                continue
                            candles[stamp*1000] = [stamp*1000,op,hi,lo,cl]
                        seen_series = bool(candles)
                if method == "series_completed":
                    print("TradingView series_completed; received", len(candles), "valid bars")
                    break
            else:
                continue
            break
    except Exception as err:
        print("TradingView connection unavailable:", type(err).__name__, str(err)[:220])
    finally:
        if ws:
            try:
                ws.close()
            except Exception:
                pass
    result = [candles[k] for k in sorted(candles)]
    print("TOTALDEFI daily OHLC from public chart source:", len(result))
    if result:
        print("Earliest:", datetime.fromtimestamp(result[0][0]/1000, timezone.utc).date(),
              "Latest:", datetime.fromtimestamp(result[-1][0]/1000, timezone.utc).date())
    return result


if __name__ == "__main__":
    candles=get_totaldefi_ohlc()
    if candles:
        print("Sample first:", candles[0], "last:", candles[-1])
