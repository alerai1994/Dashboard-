#!/usr/bin/env python3
"""Build verified altcoin season and BTC/ETH rainbow price inputs.

Index: CoinMarketCap Altcoin Season Index (0-100), historic max 90d.
Prices: CryptoCompare USD daily closes, no interpolated missing days.
If an upstream provider fails, retain last verified archive; a monthly
Yahoo fallback is allowed only when no CryptoCompare archive exists.
Rainbow bands are fitted in Vertex's browser, not downloaded prices.
"""
import json
import math
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "global-special-charts.json"
USER_AGENT = "VertexGlobal/1.0 (https://github.com/alerai1994/Dashboard-)"


def request_json(url, timeout=22):
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def stamp(value):
    try:
        if isinstance(value, str):
            return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)
        return int(value) * (1000 if float(value) < 10**11 else 1)
    except (ValueError, TypeError, OverflowError):
        return None


def valid_price(n):
    try:
        n = float(n)
        return n if math.isfinite(n) and n > 0 else None
    except (ValueError, TypeError, OverflowError):
        return None


def normalize(rows, low=0, high=float("inf")):
    dedup = {}
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, (list, tuple)) or len(row) < 2:
            continue
        try:
            t, value = int(row[0]), float(row[1])
        except (TypeError, ValueError):
            continue
        if 1_260_000_000_000 <= t <= int(time.time() * 1000) + 86400_000:
            if math.isfinite(value) and low <= value <= high:
                dedup[t] = [t, round(value, 9)]
    return [dedup[key] for key in sorted(dedup)]


def read_previous():
    try:
        payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except (ValueError, TypeError, OSError):
        return {}


def fetch_altcoin_season(previous):
    url = "https://pro-api.coinmarketcap.com/public-api/v1/altcoin-season-index/historical?timeframe=90d"
    try:
        raw = request_json(url)
        status = raw.get("status") or {}
        if str(status.get("error_code", "0")) != "0":
            raise ValueError("CMC error " + str(status.get("error_message")))
        data = raw.get("data") or {}
        points = []
        for row in data.get("points", []):
            t = stamp(row.get("timestamp"))
            value = valid_price(row.get("altcoin_index"))
            if t is not None and value is not None and value <= 100:
                # One observation per UTC date, preserving its supplied timestamp.
                points.append([t, value])
        previous_rows = previous.get("altcoin", {}).get("points", [])
        result = normalize(previous_rows + points, 0, 100)
        if result:
            return {"source": "CoinMarketCap · Altcoin Season Index", "unit": "index 0-100",
                    "frequency": "1D", "points": result}
    except (OSError, ValueError, TypeError, OverflowError) as err:
        print("CMC Altcoin Season history:", type(err).__name__, str(err)[:140])
    return previous.get("altcoin") or {"source": "CoinMarketCap · Altcoin Season Index",
                                       "unit": "index 0-100", "frequency": "1D", "points": []}


def fetch_cryptocompare_daily(symbol):
    path = "https://min-api.cryptocompare.com/data/v2/histoday"
    target = {"BTC": 2010, "ETH": 2015}[symbol]
    last = int(time.time())
    found = {}
    for batch in range(6):
        query = urllib.parse.urlencode({"fsym": symbol, "tsym": "USD",
                                         "limit": 2000, "toTs": last, "aggregate": 1})
        raw = request_json(path + "?" + query, timeout=24)
        if str(raw.get("Response", "")).lower() != "success":
            raise ValueError(str(raw.get("Message", "CryptoCompare unavailable"))[:170])
        items = (raw.get("Data") or {}).get("Data") or []
        oldest = None
        count = 0
        for bar in items:
            t = stamp(bar.get("time"))
            price = valid_price(bar.get("close"))
            if t is None:
                continue
            oldest = min(oldest, t) if oldest is not None else t
            if price is None or datetime.fromtimestamp(t / 1000, timezone.utc).year < target:
                continue
            found[t] = [t, price]
            count += 1
        print(symbol, "batch", batch, "valid", count)
        if oldest is None:
            break
        oldest_s = oldest // 1000
        if oldest_s >= last or datetime.fromtimestamp(oldest_s, timezone.utc).year <= target:
            break
        last = oldest_s - 86400
        time.sleep(.15)
    return normalize(list(found.values()), low=1e-7)


def load_monthly_fallback(symbol):
    name = symbol.lower()
    path = ROOT / "chart-history" / "crypto" / (name + ".json")
    try:
        feed = json.loads(path.read_text(encoding="utf-8"))
        rows = []
        for bar in feed.get("candles", []):
            if not isinstance(bar, list) or len(bar) < 5:
                continue
            t = stamp(bar[0])
            value = valid_price(bar[4])
            if t and value:
                rows.append([t, value])
        return normalize(rows, 1e-7)
    except (ValueError, TypeError, OSError):
        return []


def fetch_rainbow_prices(symbol, previous):
    existing = previous.get("rainbow", {}).get(symbol) or {}
    old_rows = existing.get("points", [])
    old_source = existing.get("source", "")
    try:
        recent = fetch_cryptocompare_daily(symbol)
        if len(recent) < 1000:
            raise ValueError("Too few daily prices from CryptoCompare: " + str(len(recent)))
        # Merge only with earlier points from the SAME provider and sampling.
        same = old_rows if "CryptoCompare" in old_source else []
        combined = normalize(same + recent, 1e-7)
        return {"source": "CryptoCompare · daily USD closes",
                "frequency": "1D", "points": combined}
    except (OSError, ValueError, TypeError) as err:
        print(symbol, "historical prices:", type(err).__name__, str(err)[:160])
    if len(old_rows) > 50:
        return existing
    fallback = load_monthly_fallback(symbol)
    print(symbol, "using verified monthly Yahoo fallback", len(fallback))
    return {"source": "Yahoo Finance · USD monthly closes (daily feed unavailable)",
            "frequency": "1M", "points": fallback}


def main():
    old = read_previous()
    payload = {"updatedAt": datetime.now(timezone.utc).isoformat(),
               "altcoin": fetch_altcoin_season(old),
               "rainbow": {}}
    for symbol in ("BTC", "ETH"):
        payload["rainbow"][symbol] = fetch_rainbow_prices(symbol, old)
        rows = payload["rainbow"][symbol]["points"]
        print(symbol, len(rows), "price observations")
    old_alt = len(payload["altcoin"].get("points", []))
    print("Altcoin Season Index observations:", old_alt)
    if not any(len(item.get("points", [])) for item in
               [payload["altcoin"], *payload["rainbow"].values()]):
        print("No verified data returned; leaving prior archive unchanged.")
        return
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Saved", OUTPUT.name, OUTPUT.stat().st_size)


if __name__ == "__main__":
    main()
