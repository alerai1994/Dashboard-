#!/usr/bin/env python3
"""Publish verified exchange-traded ETF/ETP share-price history for Vertex.

The chart values are the actual closes returned by Yahoo Finance. No synthetic
data, interpolation from the underlying coin, or invented exchange timestamps.
"""
import json
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "etf-history.json"
FUNDS = {
    "etf-ibit": "IBIT",
    "etf-etha": "ETHA",
    "etf-bsol": "BSOL",
    "etf-ainj": "AINJ.AS",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; VertexDashboard/1.1)",
    "Accept": "application/json",
}


def positive(value):
    try:
        number = float(value)
        return number if math.isfinite(number) and number > 0 else None
    except (ValueError, TypeError, OverflowError):
        return None


def chart(symbol, span, interval):
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        try:
            url = ("https://" + host + "/v8/finance/chart/" + quote(symbol, safe="") +
                   "?" + urlencode({"range": span, "interval": interval,
                                     "includePrePost": "false"}))
            with urlopen(Request(url, headers=HEADERS), timeout=12) as response:
                payload = json.load(response)
            record = (payload.get("chart", {}).get("result") or [None])[0]
            if not isinstance(record, dict):
                continue
            candles = (record.get("indicators", {}).get("quote") or [{}])[0]
            timestamps = record.get("timestamp") or []
            closes = candles.get("close") or []
            rows = []
            for timestamp, close in zip(timestamps, closes):
                price = positive(close)
                if price is None:
                    continue
                try:
                    stamp = int(timestamp)
                except (ValueError, TypeError, OverflowError):
                    continue
                if stamp > 946684800:
                    rows.append([stamp, round(price, 8)])
            rows.sort(key=lambda item: item[0])
            # A missing instrument may return a valid but empty chart.
            if len(rows) < 2:
                continue
            meta = record.get("meta") or {}
            return {
                "rows": rows,
                "currency": meta.get("currency") or None,
                "timezone": meta.get("exchangeTimezoneName") or "UTC",
                "symbol": symbol,
            }
        except (HTTPError, URLError, TimeoutError, ValueError, TypeError,
                IndexError, KeyError, OverflowError):
            continue
    return None


def last_session(rows, tz_name):
    try:
        zone = ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, KeyError, TypeError, ValueError):
        zone = timezone.utc
    latest_day = datetime.fromtimestamp(rows[-1][0], zone).date()
    return [row for row in rows
            if datetime.fromtimestamp(row[0], zone).date() == latest_day]


def previous_verified():
    if not OUTPUT.exists():
        return {}
    try:
        payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
        funds = payload.get("funds")
        return funds if isinstance(funds, dict) else {}
    except (ValueError, OSError, TypeError):
        return {}


def collect(identity, symbol, previous):
    existing = previous.get(identity) or {}
    old_periods = existing.get("periods") or {}
    period_rows = {}
    currency = None
    used_symbol = symbol
    for span, interval, selections in (
        ("5d", "5m", ("1D", "5D")),
        ("1mo", "60m", ("1M",)),
        ("1y", "1d", ("1A",)),
    ):
        observed = chart(symbol, span, interval)
        if observed is None and identity == "etf-ainj":
            observed = chart("AINJ.PA", span, interval)
        if observed is None:
            continue
        used_symbol = observed["symbol"]
        currency = observed["currency"] or currency
        for selection in selections:
            rows = observed["rows"]
            if selection == "1D":
                rows = last_session(rows, observed["timezone"])
            if len(rows) >= 2:
                period_rows[selection] = rows
    # A partial upstream outage must not erase a previously verified series.
    for period in ("1D", "5D", "1M", "1A"):
        old = old_periods.get(period)
        if period not in period_rows and isinstance(old, list) and len(old) >= 2:
            period_rows[period] = old
    if not period_rows:
        return identity, None
    timestamps = [part[-1][0] for part in period_rows.values()
                  if isinstance(part, list) and part]
    last_time = datetime.fromtimestamp(max(timestamps), timezone.utc).isoformat()
    result = {
        "symbol": used_symbol if currency else existing.get("symbol") or used_symbol,
        "currency": currency or existing.get("currency"),
        "asOf": last_time,
        "source": "Yahoo Finance · close storico di borsa",
        "periods": period_rows,
    }
    return identity, result


def main():
    previous = previous_verified()
    funds = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(collect, identity, symbol, previous)
                   for identity, symbol in FUNDS.items()]
        for future in as_completed(futures):
            identity, result = future.result()
            if result:
                funds[identity] = result
    if not funds:
        print("ETF history: all sources unavailable; preserving existing file.")
        return
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance · actual ETF/ETP share prices; may be delayed",
        "funds": funds,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) +
                      "\n", encoding="utf-8")
    print("ETF history: verified instruments", len(funds), "/", len(FUNDS))


if __name__ == "__main__":
    main()
