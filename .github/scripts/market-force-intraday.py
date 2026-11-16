#!/usr/bin/env python3
"""Publish real observed crypto price history for Market Force 1H/4H/1D/1W.

The DefiLlama price chart returns observations, not exchange OHLC.
Never convert its observations into synthetic candlesticks.
Use the catalog's exact CoinGecko ID, not ticker guesses.
"""
from __future__ import annotations

import json
import math
import runpy
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "chart-history" / "crypto" / "intraday"
BASE = runpy.run_path(str(ROOT / ".github/scripts/crypto-price-backfill.py"))
HEADERS = {"Accept": "application/json", "User-Agent": "VertexMarketForceHistory/1.0"}
WINDOWS = {"1H": 3600, "4H": 4 * 3600, "1D": 86400, "1W": 7 * 86400}


def normalize(rows, now):
    seen = {}
    for row in rows or []:
        if isinstance(row, dict):
            timestamp, price = row.get("timestamp"), row.get("price")
        elif isinstance(row, (list, tuple)) and len(row) >= 2:
            timestamp, price = row[:2]
        else:
            continue
        try:
            timestamp, price = int(float(timestamp)), float(price)
        except (ValueError, TypeError, OverflowError):
            continue
        if timestamp > 10**11:
            timestamp //= 1000
        if not (946684800 <= timestamp <= now + 300) or not math.isfinite(price) or price <= 0:
            continue
        seen[timestamp] = [timestamp, float(f"{price:.12g}")]
    return [seen[t] for t in sorted(seen)]


def request_group(batch, period, span, now):
    keys = ["coingecko:" + coin for _ident, coin in batch]
    start = now - span * (300 if period == "5m" else 3600)
    url = ("https://coins.llama.fi/chart/" + quote(",".join(keys), safe=":,") +
           "?" + urlencode({"start": start, "span": span, "period": period}))
    try:
        with urlopen(Request(url, headers=HEADERS), timeout=28) as response:
            payload = json.load(response)
        records = payload.get("coins", {}) if isinstance(payload, dict) else {}
        return {
            ident: normalize((records.get("coingecko:" + coin) or {}).get("prices"), now)
            for ident, coin in batch
        }
    except HTTPError as error:
        print("DefiLlama", period, "HTTP", error.code, "batch", len(batch))
        if len(batch) > 1 and error.code in (400, 404, 422):
            middle = len(batch) // 2
            return {**request_group(batch[:middle], period, span, now),
                    **request_group(batch[middle:], period, span, now)}
    except (URLError, OSError, ValueError, TypeError) as error:
        print("DefiLlama", period, type(error).__name__, str(error)[:120])
    return {}



def coingecko_market_chart(coin, days, now):
    """CoinGecko-ID fallback for genuine observations absent at DefiLlama.
    Millisecond timestamps are normalized; no OHLC/high-low is fabricated.
    """
    url = ("https://api.coingecko.com/api/v3/coins/" + quote(coin, safe="") +
           "/market_chart?" + urlencode({"vs_currency": "usd", "days": days}))
    try:
        with urlopen(Request(url, headers=HEADERS), timeout=18) as response:
            data = json.load(response)
        if not isinstance(data, dict):
            return []
        return normalize(data.get("prices"), now)
    except HTTPError as error:
        print("CoinGecko historical prices", coin, days, "HTTP", error.code)
    except (URLError, OSError, ValueError, TypeError) as error:
        print("CoinGecko historical prices", coin, days, type(error).__name__)
    return []


def previous_archive(path, ident, coin):
    try:
        archive = json.loads(path.read_text(encoding="utf-8"))
        if archive.get("id") == ident and archive.get("coingeckoId") == coin:
            return archive.get("periods", {})
    except (OSError, ValueError, TypeError):
        pass
    return {}


def select_window(points, seconds, now):
    rows = [row for row in points if now - seconds - 900 <= row[0] <= now + 300]
    if len(rows) < 2:
        return []
    # A period must cover at least part of the actual selected interval.
    if rows[-1][0] - rows[0][0] < seconds * 0.25:
        return []
    if now - rows[-1][0] > 4 * 3600:
        return []
    return rows


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    assets = BASE["targets"]()
    now = int(datetime.now(timezone.utc).timestamp())
    print("Verified CoinGecko ID catalog:", len(assets))
    updated = 0
    for offset in range(0, len(assets), 8):
        batch = assets[offset:offset + 8]
        fine = request_group(batch, "5m", 315, now)
        hourly = request_group(batch, "1h", 177, now)
        for ident, coin in batch:
            path = OUT / (ident + ".json")
            previous = previous_archive(path, ident, coin)
            # The catalog includes niche assets absent from the first price
            # provider. Only these missing identities trigger CoinGecko calls.
            fine_points = fine.get(ident, [])
            hour_points = hourly.get(ident, [])
            used_cg = False
            if not fine_points:
                fine_points = coingecko_market_chart(coin, 1, now)
                used_cg = used_cg or bool(fine_points)
                time.sleep(0.2)
            if not hour_points:
                hour_points = coingecko_market_chart(coin, 7, now)
                used_cg = used_cg or bool(hour_points)
                time.sleep(0.2)
            periods = {}
            for timeframe, seconds in WINDOWS.items():
                observations = hour_points if timeframe == "1W" else fine_points
                chosen = select_window(observations, seconds, now)
                if not chosen:
                    # Retain verified earlier snapshots if the API is temporarily down,
                    # but never republish expired points as though they were current.
                    past = previous.get(timeframe, [])
                    chosen = select_window(normalize(past, now), seconds, now)
                if chosen:
                    periods[timeframe] = chosen
            if not periods:
                continue
            payload = {
                "id": ident, "coingeckoId": coin,
                "kind": "observed-price-line", "currency": "USD",
                "source": ("DefiLlama / CoinGecko · prezzi osservati in USD (non OHLC)"
                           if used_cg else "DefiLlama · prezzi osservati in USD (non OHLC)"),
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "periods": periods,
            }
            content = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                path.write_text(content, encoding="utf-8")
                updated += 1
        time.sleep(0.35)
    print("Published crypto intraday price histories:", updated)
    print("Missing observations are NOT replaced with synthetic market data.")


if __name__ == "__main__":
    main()
