#!/usr/bin/env python3
"""Refresh public market quotes for the static Global dashboard.
Missing/blocked API responses are explicitly represented as unavailable, not simulated.
Source: Yahoo Finance chart API (indices, FX, futures); CoinGecko (crypto).
"""
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

OUTPUT = Path("global-quotes.json")
MARKETS = [
    ("sp500", "^GSPC"), ("nasdaq", "^IXIC"), ("tsx", "^GSPTSE"),
    ("ibov", "^BVSP"), ("ftse", "^FTSE"), ("dax", "^GDAXI"),
    ("cac", "^FCHI"), ("jse", "J200.JO"), ("nikkei", "^N225"),
    ("hsi", "^HSI"), ("nifty", "^NSEI"), ("kospi", "^KS11"), ("asx", "^AXJO"),
]
COMMODITIES = [
    ("gold", "GC=F"), ("silver", "SI=F"), ("brent", "BZ=F"),
    ("wti", "CL=F"), ("naturalgas", "NG=F")
]
FOREX = [
    ("eurusd", "EURUSD=X"), ("gbpusd", "GBPUSD=X"), ("usdjpy", "JPY=X"),
    ("usdchf", "CHF=X"), ("audusd", "AUDUSD=X")
]
CRYPTO = [
    ("btc", "bitcoin"), ("eth", "ethereum"), ("sol", "solana"),
    ("inj", "injective-protocol"), ("bnb", "binancecoin"),
]
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; GlobalMarketsDashboard/1.0; +https://github.com/)",
    "Accept": "application/json",
}

def valid(value):
    try:
        n = float(value)
        return n if n == n and abs(n) != float("inf") else None
    except (ValueError, TypeError):
        return None

def request_json(url):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=18) as response:
        return json.load(response)

def yahoo_quote(pair):
    identity, symbol = pair
    entry = {"id": identity, "symbol": symbol, "value": None,
             "change": None, "currency": None, "history": [], "time": None}
    for domain in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        try:
            url = (
                "https://" + domain + "/v8/finance/chart/" + quote(symbol, safe="")
                + "?" + urlencode({"range": "1mo", "interval": "1d"})
            )
            payload = request_json(url)
            result = (payload.get("chart", {}).get("result") or [])[0]
            meta = result.get("meta", {})
            samples = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
            closes = [x for x in (valid(x) for x in samples) if x is not None and x > 0]
            last = valid(meta.get("regularMarketPrice"))
            if last is None and closes:
                last = closes[-1]
            previous = valid(meta.get("previousClose"))
            if previous is None:
                previous = valid(meta.get("regularMarketPreviousClose"))
            if previous is None and len(closes) > 1:
                previous = closes[-2]
            if last is None or last <= 0:
                continue
            entry["value"] = last
            entry["currency"] = str(meta.get("currency") or "USD")
            entry["history"] = closes[-12:]
            t = meta.get("regularMarketTime")
            entry["time"] = datetime.fromtimestamp(t, timezone.utc).isoformat() if t else None
            if previous and previous > 0:
                entry["change"] = round((last / previous - 1) * 100, 4)
            return entry
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, TypeError) as e:
            print("Yahoo unavailable", symbol, domain, type(e).__name__)
    return entry

def crypto_quotes():
    items = {cid: {"id": cid, "symbol": token.upper(), "value": None,
                   "change": None, "currency": "USD", "history": [], "time": None}
             for cid, token in CRYPTO}
    ids = ",".join(token for _, token in CRYPTO)
    url = "https://api.coingecko.com/api/v3/simple/price?" + urlencode({
        "ids": ids,
        "vs_currencies": "usd",
        "include_24hr_change": "true",
        "include_last_updated_at": "true",
    })
    try:
        payload = request_json(url)
        for cid, token in CRYPTO:
            data = payload.get(token, {})
            price = valid(data.get("usd"))
            if price is None or price <= 0:
                continue
            items[cid]["value"] = price
            items[cid]["change"] = valid(data.get("usd_24h_change"))
            when = data.get("last_updated_at")
            items[cid]["time"] = datetime.fromtimestamp(when, timezone.utc).isoformat() if when else None
    except (HTTPError, URLError, TimeoutError, ValueError, TypeError) as e:
        print("CoinGecko unavailable", type(e).__name__)
    return [items[cid] for cid, _ in CRYPTO]

def fetch_group(pairs):
    results = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs = [pool.submit(yahoo_quote, item) for item in pairs]
        for job in as_completed(jobs):
            result = job.result()
            results[result["id"]] = result
    return [results[k] for k, _ in pairs]

def main():
    data = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance chart + CoinGecko, delayed/not real-time",
        "markets": fetch_group(MARKETS),
        "commodities": fetch_group(COMMODITIES),
        "forex": fetch_group(FOREX),
        "crypto": crypto_quotes(),
    }
    ready = sum(1 for group in ("markets", "commodities", "forex", "crypto")
                for row in data[group] if row["value"] is not None)
    print("Verified quotes:", ready, "of", sum(map(len, (MARKETS, COMMODITIES, FOREX, CRYPTO))))
    # If every request is denied, preserve the last successful snapshot rather than
    # overwriting real existing prices with empty values.
    if ready == 0 and OUTPUT.exists():
        try:
            old = json.loads(OUTPUT.read_text(encoding="utf-8"))
            if any(x.get("value") is not None for g in ("markets", "commodities", "forex", "crypto")
                   for x in old.get(g, [])):
                print("All APIs unavailable; retaining last successful snapshot")
                return
        except (OSError, ValueError, TypeError):
            pass
    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
