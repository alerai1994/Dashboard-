#!/usr/bin/env python3
"""Download genuine historical monthly OHLC candles for Vertex crypto charts.

We use the oldest exchange-price history available from Yahoo Finance or,
when Yahoo does not cover the asset, Binance Spot. These are NOT genesis
dates or price series before an asset started trading on those platforms.
Synthetic OHLC candles and merged USD/USDT price histories are forbidden.
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
OUT = ROOT / "chart-history" / "crypto"
CONFIG = runpy.run_path(str(ROOT / ".github/scripts/market-data.py"))
# ORE must use its unambiguous exact LBank ORE/USDT market (separate collector).
CRYPTO = [identity for identity, _ in CONFIG["CRYPTO"] if identity != "ore"]

YAHOO_ALIASES = {
    "render": "RENDER-USD",
    "fet": "FET-USD",
    "lunc": "LUNC-USD",
    "hot": "HOT-USD",
    "tai": "TAI-USD",
    "virtual": "VIRTUAL-USD",
}
BINANCE_ALIASES = {"render": "RENDERUSDT", "lunc": "LUNCUSDT"}
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; VertexCryptoHistory/1.0)",
}


def positive(value):
    try:
        num = float(value)
        return num if math.isfinite(num) and num > 0 else None
    except (ValueError, TypeError, OverflowError):
        return None


def normalise(rows):
    verified = {}
    for row in rows:
        if not isinstance(row, (list, tuple)) or len(row) < 5:
            continue
        try:
            timestamp = int(float(row[0]))
        except (ValueError, TypeError, OverflowError):
            continue
        o, h, l, c = [positive(v) for v in row[1:5]]
        if None in (o, h, l, c) or h < max(o, c) or l > min(o, c):
            continue
        if not 946684800 <= timestamp <= int(datetime.now(timezone.utc).timestamp()) + 86400 * 32:
            continue
        verified[timestamp] = [
            timestamp, float(f"{o:.12g}"), float(f"{h:.12g}"),
            float(f"{l:.12g}"), float(f"{c:.12g}")
        ]
    return [verified[timestamp] for timestamp in sorted(verified)]


def yahoo(symbol):
    errors = []
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        url = ("https://" + host + "/v8/finance/chart/" + quote(symbol, safe="")
               + "?" + urlencode({"range": "max", "interval": "1mo"}))
        try:
            request = Request(url, headers=HEADERS)
            with urlopen(request, timeout=16) as response:
                raw = json.load(response)
            chart = (raw.get("chart", {}).get("result") or [])[0]
            stamps = chart.get("timestamp") or []
            sample = (chart.get("indicators", {}).get("quote") or [{}])[0]
            rows = normalise(zip_rows(stamps, sample))
            if len(rows) >= 2:
                return rows, "Yahoo Finance · " + symbol + " · OHLC mensile"
        except (OSError, ValueError, KeyError, IndexError, TypeError) as error:
            errors.append(str(error))
    raise RuntimeError("Yahoo: " + ("; ".join(errors) or "No verified OHLC"))


def zip_rows(stamps, sample):
    return [
        [timestamp, o, h, l, c]
        for timestamp, o, h, l, c in zip(
            stamps, sample.get("open") or [], sample.get("high") or [],
            sample.get("low") or [], sample.get("close") or [],
        )
    ]


def binance(symbol):
    errors = []
    params = urlencode({
        "symbol": symbol, "interval": "1M",
        "startTime": 0, "limit": 1000
    })
    for host in ("data-api.binance.vision", "api.binance.com"):
        url = "https://" + host + "/api/v3/klines?" + params
        try:
            request = Request(url, headers=HEADERS)
            with urlopen(request, timeout=14) as response:
                data = json.load(response)
            if not isinstance(data, list):
                raise ValueError("Invalid exchange candles")
            rows = normalise([
                [int(item[0]) // 1000, *item[1:5]]
                for item in data if isinstance(item, list) and len(item) >= 5
            ])
            if len(rows) >= 2:
                return rows, "Binance Spot · " + symbol + " · OHLC mensile"
        except (OSError, ValueError, TypeError, OverflowError) as error:
            errors.append(str(error))
    raise RuntimeError("Binance: " + ("; ".join(errors) or "No verified OHLC"))


def collect(identity):
    symbol = YAHOO_ALIASES.get(identity, identity.upper() + "-USD")
    exchange = BINANCE_ALIASES.get(identity, identity.upper() + "USDT")
    errors = []
    for target, source_symbol, fetcher in [
        ("USD", symbol, yahoo), ("USDT", exchange, binance)
    ]:
        try:
            rows, source = fetcher(source_symbol)
            return identity, {
                "id": identity,
                "symbol": source_symbol,
                "quoteCurrency": target,
                "timeframe": "1mo",
                "source": source,
                "first": rows[0][0],
                "last": rows[-1][0],
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "candles": rows,
            }, None
        except RuntimeError as error:
            errors.append(str(error))
    return identity, None, " | ".join(errors)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    changes, unavailable = 0, []
    with ThreadPoolExecutor(max_workers=7) as executor:
        jobs = [executor.submit(collect, identity) for identity in CRYPTO]
        for job in as_completed(jobs):
            identity, latest, error = job.result()
            dest = OUT / (identity + ".json")
            if latest is None:
                unavailable.append(identity + ": " + error)
                continue
            previous = None
            try:
                previous = json.loads(dest.read_text(encoding="utf-8"))
            except (OSError, ValueError, TypeError):
                pass
            # Preserve original capture date when the verified data did not change.
            if previous and previous.get("candles") == latest["candles"] and (
                previous.get("source") == latest["source"]
            ):
                continue
            encoded = json.dumps(latest, separators=(",", ":"), ensure_ascii=False) + "\n"
            dest.write_text(encoded, encoding="utf-8")
            changes += 1
            print(identity, "verified monthly candles:", len(latest["candles"]),
                  datetime.fromtimestamp(latest["first"], timezone.utc).date(),
                  "to", datetime.fromtimestamp(latest["last"], timezone.utc).date())
    print("Crypto ALL history:", changes, "updates,",
          len(unavailable), "unavailable assets out of", len(CRYPTO))
    for error in unavailable:
        print("Not available:", error)


if __name__ == "__main__":
    main()
