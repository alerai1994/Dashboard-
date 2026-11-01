#!/usr/bin/env python3
"""Build verified OHLC history for static Vertex market charts.

Yahoo Finance chart samples are captured server-side because its public chart
endpoint may be blocked by browser CORS. Only genuine complete OHLC bars are
published; errors never produce synthetic candles or erase verified history.
"""
from __future__ import annotations

import json
import math
import runpy
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "chart-history"
CONFIG = runpy.run_path(str(ROOT / ".github/scripts/market-data.py"))
ASSETS = dict(
    CONFIG["MARKETS"] + CONFIG["TECH"] + CONFIG["BIGTECH"]
    + CONFIG["COMMODITIES"] + CONFIG["FOREX"]
)
# 1m: ranges 1h–5h; 5m: 12h–3D; 60m: 1W–2W.
# Yahoo MAX monthly candles cover the oldest exchange history Yahoo
# actually provides; they are not claimed to be the instrument's birth date.
# Intraday views remain unchanged.
REQUESTS = (
    ("1m", "5d", 2400),
    ("5m", "5d", 1200),
    ("60m", "1mo", 900),
    ("1mo", "max", 4000),
)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; VertexMarketCharts/1.0)",
    "Accept": "application/json",
}


def positive(value):
    try:
        n = float(value)
        return n if math.isfinite(n) and n > 0 else None
    except (TypeError, ValueError, OverflowError):
        return None


def fetch(symbol, interval, window, limit):
    query = urlencode({"range": window, "interval": interval,
                       "includePrePost": "false"})
    last_error = None
    for domain in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        url = ("https://" + domain + "/v8/finance/chart/"
               + quote(symbol, safe="") + "?" + query)
        try:
            req = Request(url, headers=HEADERS)
            with urlopen(req, timeout=15) as response:
                payload = json.load(response)
            result = (payload.get("chart", {}).get("result") or [])[0]
            stamps = result.get("timestamp") or []
            quotes = (result.get("indicators", {}).get("quote") or [{}])[0]
            opens = quotes.get("open") or []
            highs = quotes.get("high") or []
            lows = quotes.get("low") or []
            closes = quotes.get("close") or []
            rows = []
            for t, o, h, l, c in zip(stamps, opens, highs, lows, closes):
                o, h, l, c = map(positive, (o, h, l, c))
                if None in (o, h, l, c) or h < max(o, c) or l > min(o, c):
                    continue
                try:
                    epoch = int(t)
                except (TypeError, ValueError, OverflowError):
                    continue
                if epoch < 946684800:
                    continue
                rows.append([epoch, float(f"{o:.12g}"),
                             float(f"{h:.12g}"), float(f"{l:.12g}"),
                             float(f"{c:.12g}")])
            rows.sort(key=lambda row: row[0])
            unique = {row[0]: row for row in rows}
            candles = list(unique.values())[-limit:]
            if len(candles) >= 2:
                return candles
            last_error = "fewer than two complete OHLC bars"
        except (ValueError, OSError, KeyError, IndexError, TypeError) as exc:
            last_error = str(exc)
    raise RuntimeError(last_error or "no data from Yahoo Finance")


def collect(identity, symbol, interval, window, limit):
    try:
        return identity, interval, fetch(symbol, interval, window, limit), None
    except Exception as exc:
        return identity, interval, None, str(exc)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    previous = {}
    for identity in ASSETS:
        path = OUT / (identity + ".json")
        try:
            old = json.loads(path.read_text(encoding="utf-8"))
            if old.get("id") == identity and old.get("symbol") == ASSETS[identity]:
                previous[identity] = old.get("sets", {})
        except (OSError, ValueError, TypeError, AttributeError):
            pass

    results = {identity: {} for identity in ASSETS}
    errors = 0
    tasks = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        for identity, symbol in ASSETS.items():
            for interval, window, limit in REQUESTS:
                tasks.append(pool.submit(collect, identity, symbol,
                                         interval, window, limit))
        for task in as_completed(tasks):
            identity, interval, candles, error = task.result()
            if candles:
                results[identity][interval] = candles
            else:
                errors += 1
                print(f"{identity} {interval}: {error}")

    created = 0
    for identity, symbol in ASSETS.items():
        stored = previous.get(identity, {})
        sets = {}
        for interval, _, _ in REQUESTS:
            candles = results[identity].get(interval)
            old = stored.get(interval, {}) if isinstance(stored, dict) else {}
            old_candles = old.get("candles") if isinstance(old, dict) else None
            if candles is not None:
                if old_candles == candles:
                    sets[interval] = old
                else:
                    sets[interval] = {
                        "capturedAt": datetime.now(timezone.utc).isoformat(),
                        "candles": candles,
                    }
            elif isinstance(old_candles, list) and len(old_candles) >= 2:
                sets[interval] = old
        if not sets:
            continue
        entry = {
            "id": identity,
            "symbol": symbol,
            "source": "Yahoo Finance Chart · OHLC ritardato",
            "sets": sets,
        }
        text = json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n"
        path = OUT / (identity + ".json")
        try:
            if path.read_text(encoding="utf-8") == text:
                continue
        except OSError:
            pass
        path.write_text(text, encoding="utf-8")
        created += 1
    print(f"Chart snapshots: {created} updated, {errors} unavailable queries"
          f" out of {len(ASSETS) * len(REQUESTS)}")


if __name__ == "__main__":
    main()
