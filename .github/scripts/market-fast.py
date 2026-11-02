#!/usr/bin/env python3
"""Compact verified market quotes for Vertex (five-minute GitHub Actions feed).

No quotes or timestamps are simulated. Delayed/closed quotes retain their source
time; browser streaming separately upgrades supported crypto/FX pairs to LIVE.
"""
import json
import math
import runpy
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
BACKEND = runpy.run_path(str(Path(__file__).with_name("market-data.py")))
GROUPS = {
    "markets": BACKEND["MARKETS"] + BACKEND["TECH"],
    "bigtech": BACKEND["BIGTECH"],
    "commodities": BACKEND["COMMODITIES"],
    "forex": BACKEND["FOREX"],
}
COINS = BACKEND["CRYPTO"]
OUTPUT = ROOT / "market-quotes.json"
OLD_FULL = ROOT / "market-data.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; VertexDashboard/1.1)",
           "Accept": "application/json"}


def number(value):
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (TypeError, ValueError):
        return None


def positive(value):
    result = number(value)
    return result if result is not None and result > 0 else None


def request_json(url):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=9) as response:
        return json.load(response)


def iso(stamp):
    try:
        stamp = float(stamp)
        return datetime.fromtimestamp(stamp, timezone.utc).isoformat() if stamp > 0 else None
    except (ValueError, TypeError, OverflowError, OSError):
        return None


def yahoo_fast(pair):
    identity, symbol = pair
    row = {"id": identity, "symbol": symbol, "value": None, "change": None,
           "currency": None, "time": None, "source": "Yahoo Finance"}
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        try:
            url = ("https://" + host + "/v8/finance/chart/" + quote(symbol, safe="") +
                   "?" + urlencode({"range": "5d", "interval": "1d"}))
            data = request_json(url)
            result = (data.get("chart", {}).get("result") or [None])[0]
            if not isinstance(result, dict):
                continue
            meta = result.get("meta") or {}
            prices = (result.get("indicators", {}).get("quote") or [{}])[0].get("close") or []
            closes = [value for value in (positive(p) for p in prices) if value is not None]
            price = positive(meta.get("regularMarketPrice"))
            if price is None and closes:
                price = closes[-1]
            if price is None:
                continue
            previous = (positive(meta.get("previousClose")) or
                        positive(meta.get("regularMarketPreviousClose")) or
                        positive(meta.get("chartPreviousClose")))
            if previous is None and len(closes) >= 2:
                previous = closes[-2]
            row.update({"value": price, "currency": meta.get("currency") or "USD",
                        "time": iso(meta.get("regularMarketTime") or
                                    (result.get("timestamp") or [None])[-1])})
            if previous is not None:
                row["change"] = round((price / previous - 1) * 100, 4)
            delay = number(meta.get("exchangeDataDelayedBy"))
            if delay is not None and 0 <= delay <= 120:
                row["delayMinutes"] = int(delay)
            market_state = meta.get("marketState")
            if isinstance(market_state, str) and market_state:
                row["marketState"] = market_state
            return row
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, TypeError):
            continue
    return row


def crypto_fast():
    rows = {identity: {"id": identity, "symbol": coin.upper(), "value": None,
                       "change": None, "currency": "USD", "time": None,
                       "source": "CoinGecko"} for identity, coin in COINS}
    lookup = {coin: identity for identity, coin in COINS}
    url = "https://api.coingecko.com/api/v3/coins/markets?" + urlencode({
        "vs_currency": "usd", "ids": ",".join(lookup),
        "per_page": min(250, len(COINS)), "page": 1, "sparkline": "false",
    })
    try:
        data = request_json(url)
        if isinstance(data, list):
            for item in data:
                if not isinstance(item, dict) or item.get("id") not in lookup:
                    continue
                price = positive(item.get("current_price"))
                if price is None:
                    continue
                row = rows[lookup[item["id"]]]
                row.update({"value": price,
                            "change": number(item.get("price_change_percentage_24h")),
                            "time": item.get("last_updated") or None})
                image = item.get("image")
                if isinstance(image, str) and image.startswith(
                        ("https://coin-images.coingecko.com/", "https://assets.coingecko.com/")):
                    row["logo"] = image
    except (HTTPError, URLError, TimeoutError, ValueError, TypeError):
        pass
    missing = [(identity, coin) for identity, coin in COINS
               if rows[identity]["value"] is None]
    if missing:
        url = "https://api.coingecko.com/api/v3/simple/price?" + urlencode({
            "ids": ",".join(coin for _, coin in missing),
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_last_updated_at": "true",
        })
        try:
            data = request_json(url)
            if isinstance(data, dict):
                for identity, coin in missing:
                    item = data.get(coin)
                    if not isinstance(item, dict) or positive(item.get("usd")) is None:
                        continue
                    rows[identity].update({
                        "value": positive(item["usd"]),
                        "change": number(item.get("usd_24h_change")),
                        "time": iso(item.get("last_updated_at")),
                    })
        except (HTTPError, URLError, TimeoutError, ValueError, TypeError):
            pass
    return rows


def older_verified_rows():
    """Use the genuine preceding sample with its ORIGINAL quote time on outage."""
    previous = {}
    for path in (OLD_FULL, OUTPUT):
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            continue
        if not isinstance(data, dict):
            continue
        for group in (*GROUPS, "crypto"):
            for row in data.get(group) or []:
                if isinstance(row, dict) and row.get("id") and positive(row.get("value")):
                    previous[row["id"]] = row
    return previous


def main():
    older = older_verified_rows()
    payload = {"generatedAt": datetime.now(timezone.utc).isoformat(),
               "source": "Yahoo Finance / CoinGecko; some quotes delayed",
               **{group: [] for group in (*GROUPS, "crypto")}}
    received = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(yahoo_fast, pair): group
                   for group, pairs in GROUPS.items() for pair in pairs}
        for future in as_completed(futures):
            group = futures[future]
            row = future.result()
            if positive(row.get("value")):
                received += 1
            else:
                old = older.get(row["id"])
                if old:
                    row = {key: old[key] for key in
                           ("id", "symbol", "value", "change", "currency", "time",
                            "source", "marketState", "delayMinutes", "logo") if key in old}
            payload[group].append(row)
    crypto_rows = crypto_fast()
    for identity, _ in COINS:
        row = crypto_rows[identity]
        if positive(row.get("value")):
            received += 1
        elif older.get(identity):
            old = older[identity]
            row = {key: old[key] for key in
                   ("id", "symbol", "value", "change", "currency", "time",
                    "source", "marketState", "delayMinutes", "logo") if key in old}
        payload["crypto"].append(row)
    for group in GROUPS:
        order = {identity: idx for idx, (identity, _) in enumerate(GROUPS[group])}
        payload[group].sort(key=lambda row: order.get(row["id"], 9999))
    total = sum(len(rows) for group, rows in payload.items() if isinstance(rows, list))
    print("Verified new quotes:", received, "/", total)
    if received == 0:
        print("All primary feeds unavailable; leaving last snapshot timestamp unchanged.")
        return
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
                      encoding="utf-8")


if __name__ == "__main__":
    main()
