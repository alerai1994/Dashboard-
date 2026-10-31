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

OUTPUT = Path("market-data.json")
MARKETS = [
    ("sp500", "^GSPC"), ("nasdaq", "^IXIC"), ("tsx", "^GSPTSE"),
    ("ibov", "^BVSP"), ("ftse", "^FTSE"), ("dax", "^GDAXI"),
    ("cac", "^FCHI"), ("jse", "J200.JO"), ("tadawul", "^TASI.SR"), ("nikkei", "^N225"),
    ("hsi", "^HSI"), ("nifty", "^NSEI"), ("kospi", "^KS11"), ("asx", "^AXJO"),
]
TECH = [
    ("ndx", "^NDX"),
    ("sox", "^SOX"),
    ("xlk", "XLK"),
    ("qqq", "QQQ"),
    ("smh", "SMH"),
]
BIGTECH = [
    ("nvda", "NVDA"),
    ("msft", "MSFT"),
    ("aapl", "AAPL"),
    ("googl", "GOOGL"),
    ("amzn", "AMZN"),
    ("meta", "META"),
    ("tsla", "TSLA"),
    ("avgo", "AVGO"),
    ("amd", "AMD"),
    ("orcl", "ORCL"),
    ("tsm", "TSM"),
    ("asml", "ASML"),
]
COMMODITIES = [
    ("gold", "GC=F"), ("silver", "SI=F"), ("brent", "BZ=F"),
    ("wti", "CL=F"), ("naturalgas", "NG=F"), ("copper", "HG=F")
]
FOREX = [
    ("eurusd", "EURUSD=X"), ("gbpusd", "GBPUSD=X"), ("usdjpy", "JPY=X"),
    ("usdchf", "CHF=X"), ("audusd", "AUDUSD=X"), ("usdcny", "CNY=X")
]
CRYPTO = [
    ("btc", "bitcoin"), ("eth", "ethereum"), ("sol", "solana"),
    ("inj", "injective-protocol"), ("bnb", "binancecoin"),
    ("ore", "ore"),
    ("xrp", "ripple"), ("doge", "dogecoin"),
    ("ada", "cardano"),
    ("avax", "avalanche-2"),
    ("link", "chainlink"),
    ("dot", "polkadot"),
    ("trx", "tron"),
    ("ton", "the-open-network"),
    ("sui", "sui"),
    ("ltc", "litecoin"),
    ("bch", "bitcoin-cash"),
    ("xlm", "stellar"),
    ("hbar", "hedera-hashgraph"),
    ("near", "near"),
    ("apt", "aptos"),
    ("atom", "cosmos"),
    ("uni", "uniswap"),
    ("aave", "aave"),
    ("arb", "arbitrum"),
    ("op", "optimism"),
    ("shib", "shiba-inu"),
    ("pepe", "pepe"),
    ("render", "render-token"),
    ("ray", "raydium"),
    ("lunc", "terra-luna"),
    ("vra", "verasity"),
    ("wlfi", "world-liberty-financial"),
    ("hot", "holotoken"),
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
             "change": None, "currency": None, "history": [], "candles": [], "time": None}
    for domain in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        try:
            url = (
                "https://" + domain + "/v8/finance/chart/" + quote(symbol, safe="")
                + "?" + urlencode({"range": "1y", "interval": "1d"})
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
            entry["history"] = closes[-40:]
            quotes = result.get("indicators", {}).get("quote", [{}])[0]
            stamps = result.get("timestamp", [])
            opens, highs, lows = (quotes.get(key, []) for key in ("open", "high", "low"))
            candles = []
            for ts, op, hi, lo, cl in zip(stamps, opens, highs, lows, samples):
                o, h, l, c = valid(op), valid(hi), valid(lo), valid(cl)
                if None in (o, h, l, c) or l <= 0 or h < l or not ts:
                    continue
                # Preserve the significant decimals of tiny crypto prices (e.g. SHIB/PEPE).
                candles.append({"t": int(ts), "o": float(f"{o:.12g}"),
                                "h": float(f"{h:.12g}"),
                                "l": float(f"{l:.12g}"),
                                "c": float(f"{c:.12g}")})
            entry["candles"] = candles[-260:]
            t = meta.get("regularMarketTime")
            entry["time"] = datetime.fromtimestamp(t, timezone.utc).isoformat() if t else None
            if previous and previous > 0:
                entry["change"] = round((last / previous - 1) * 100, 4)
            return entry
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, TypeError) as e:
            print("Yahoo unavailable", symbol, domain, type(e).__name__)
    return entry

def real_ohlc_rows(rows, source, time_unit="ms"):
    """Validate real OHLC readings; never infer highs/lows from close prices."""
    out = []
    for raw in rows:
        if not isinstance(raw, (list, tuple)) or len(raw) < 5:
            continue
        try:
            stamp = int(raw[0])
            o, h, l, c = (valid(raw[i]) for i in range(1, 5))
            if None in (o, h, l, c) or min(o, h, l, c) <= 0:
                continue
            if h < max(o, c) or l > min(o, c):
                continue
            out.append({"t": stamp // 1000 if time_unit == "ms" else stamp,
                        "o": o, "h": h, "l": l, "c": c})
        except (ValueError, TypeError, OverflowError):
            continue
    out.sort(key=lambda row: row["t"])
    # Remove duplicate timestamps while keeping the latest verified reading.
    return list({row["t"]: row for row in out}.values())[-260:]


def binance_daily_candles(symbol):
    """Binance public daily OHLC for crypto pairs listed against USDT (not USD)."""
    url = "https://data-api.binance.vision/api/v3/klines?" + urlencode({
        "symbol": symbol, "interval": "1d", "limit": 260
    })
    try:
        result = request_json(url)
        if not isinstance(result, list):
            return []
        return real_ohlc_rows(result, "Binance USDT")
    except (HTTPError, URLError, TimeoutError, ValueError, TypeError, OSError):
        return []


def coingecko_daily_candles(token):
    """CoinGecko OHLC provides actual open/high/low/close data in USD."""
    url = "https://api.coingecko.com/api/v3/coins/" + quote(token, safe="") + "/ohlc?" + urlencode({
        "vs_currency": "usd", "days": "30"
    })
    try:
        result = request_json(url)
        if not isinstance(result, list):
            return []
        return real_ohlc_rows(result, "CoinGecko USD")
    except (HTTPError, URLError, TimeoutError, ValueError, TypeError, OSError):
        return []


def previous_crypto_snapshot():
    if not OUTPUT.exists():
        return {}
    try:
        data = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return {row["id"]: row for row in data.get("crypto", [])
                if isinstance(row, dict) and isinstance(row.get("id"), str)}
    except (OSError, ValueError, TypeError, KeyError):
        return {}


def crypto_quotes():
    """Return verified prices and image URLs for the configured CoinGecko coin IDs.

    One batched /coins/markets request supplies both metadata and market data.
    Fall back to /simple/price if the markets endpoint is denied or incomplete.
    """
    items = {
        cid: {"id": cid, "symbol": token.upper(), "value": None,
              "change": None, "currency": "USD", "history": [],
              "candles": [], "time": None, "logo": None}
        for cid, token in CRYPTO
    }
    ids = ",".join(token for _, token in CRYPTO)
    by_coingecko_id = {token: cid for cid, token in CRYPTO}
    markets_url = "https://api.coingecko.com/api/v3/coins/markets?" + urlencode({
        "vs_currency": "usd",
        "ids": ids,
        "per_page": min(250, len(CRYPTO)),
        "page": 1,
        "sparkline": "true",
    })
    try:
        data = request_json(markets_url)
        if not isinstance(data, list):
            raise ValueError("CoinGecko markets payload is not a list")
        for market in data:
            if not isinstance(market, dict):
                continue
            cid = by_coingecko_id.get(market.get("id"))
            if cid is None:
                continue
            # Verified 7-day close-price series, useful where Yahoo OHLC is unavailable.
            sparkline = market.get("sparkline_in_7d")
            samples = sparkline.get("price") if isinstance(sparkline, dict) else None
            if isinstance(samples, list):
                closes = [v for v in (valid(x) for x in samples) if v is not None and v > 0]
                if len(closes) >= 2:
                    items[cid]["history"] = closes[-168:]
            url = market.get("image")
            if isinstance(url, str) and url.startswith(
                    ("https://coin-images.coingecko.com/",
                     "https://assets.coingecko.com/")):
                items[cid]["logo"] = url
            price = valid(market.get("current_price"))
            if price is not None and price > 0:
                items[cid]["value"] = price
                items[cid]["change"] = valid(market.get("price_change_percentage_24h"))
                updated = market.get("last_updated")
                if isinstance(updated, str) and updated:
                    items[cid]["time"] = updated
    except (HTTPError, URLError, TimeoutError, ValueError, TypeError) as e:
        print("CoinGecko /coins/markets unavailable:", type(e).__name__)

    missing = [(cid, token) for cid, token in CRYPTO if items[cid]["value"] is None]
    if missing:
        # Keep existing price coverage if some assets are absent from /coins/markets.
        simple_url = "https://api.coingecko.com/api/v3/simple/price?" + urlencode({
            "ids": ",".join(token for _, token in missing),
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_last_updated_at": "true",
        })
        try:
            data = request_json(simple_url)
            if not isinstance(data, dict):
                raise ValueError("CoinGecko simple price payload is not an object")
            for cid, token in missing:
                market = data.get(token)
                if not isinstance(market, dict):
                    continue
                price = valid(market.get("usd"))
                if price is None or price <= 0:
                    continue
                items[cid]["value"] = price
                items[cid]["change"] = valid(market.get("usd_24h_change"))
                updated = market.get("last_updated_at")
                if updated:
                    items[cid]["time"] = datetime.fromtimestamp(
                        updated, timezone.utc).isoformat()
        except (HTTPError, URLError, TimeoutError, ValueError, TypeError, OSError) as e:
            print("CoinGecko /simple/price fallback unavailable:", type(e).__name__)

    # Reuse previously verified image URLs when a refresh fails temporarily.
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
            for old in previous.get("crypto", []):
                if not isinstance(old, dict):
                    continue
                cid, url = old.get("id"), old.get("logo")
                if cid in items and not items[cid]["logo"] and isinstance(url, str) \
                        and url.startswith(("https://coin-images.coingecko.com/",
                                            "https://assets.coingecko.com/")):
                    items[cid]["logo"] = url
        except (OSError, ValueError, TypeError):
            pass
    print("CoinGecko crypto logos:",
          sum(bool(item["logo"]) for item in items.values()), "/", len(items))
    # Daily OHLC from Yahoo Finance; unsupported pairs use verified Binance/CoinGecko candles.
    old_candles = previous_crypto_snapshot()
    now_utc = datetime.now(timezone.utc)
    try:
        for cid, _ in CRYPTO:
            old = old_candles.get(cid, {})
            if not items[cid]["logo"] and old.get("logo"):
                items[cid]["logo"] = old["logo"]
    except (KeyError, TypeError):
        pass
    history_symbols = {
        "btc": "BTC-USD", "eth": "ETH-USD", "sol": "SOL-USD",
        "inj": "INJ-USD", "bnb": "BNB-USD",
        "xrp": "XRP-USD", "doge": "DOGE-USD",
        "ada": "ADA-USD", "avax": "AVAX-USD", "link": "LINK-USD",
        "dot": "DOT-USD", "trx": "TRX-USD", "sui": "SUI-USD",
        "ltc": "LTC-USD", "hbar": "HBAR-USD", "ray": "RAY-USD",
        "lunc": "LUNC-USD"
    }
    try:
        histories = fetch_group([(cid, history_symbols[cid]) for cid, _ in CRYPTO if cid in history_symbols])
        for row in histories:
            cid = row["id"]
            if cid in items:
                # Prefer longer daily OHLC history, but never erase valid CoinGecko
                # historical line data merely because Yahoo is temporarily blocked.
                if row.get("history"):
                    items[cid]["history"] = row["history"]
                if row.get("candles"):
                    items[cid]["candles"] = row["candles"]
    except Exception as e:
        print("Crypto historical data unavailable:", type(e).__name__)

    # Use cached authentic OHLC in case an upstream data provider is temporarily unavailable.
    # Refresh cached fallback OHLC at most once per 6 hours to limit public API traffic.
    missing = [(cid, token) for cid, token in CRYPTO if len(items[cid]["candles"]) < 2]
    fallback_symbols = {
        "btc": "BTCUSDT", "eth": "ETHUSDT", "sol": "SOLUSDT",
        "inj": "INJUSDT", "bnb": "BNBUSDT", "xrp": "XRPUSDT",
        "doge": "DOGEUSDT", "ada": "ADAUSDT", "avax": "AVAXUSDT",
        "link": "LINKUSDT", "dot": "DOTUSDT", "trx": "TRXUSDT",
        "ton": "TONUSDT", "sui": "SUIUSDT", "ltc": "LTCUSDT",
        "bch": "BCHUSDT", "xlm": "XLMUSDT", "hbar": "HBARUSDT",
        "near": "NEARUSDT", "apt": "APTUSDT", "atom": "ATOMUSDT",
        "uni": "UNIUSDT", "aave": "AAVEUSDT", "arb": "ARBUSDT",
        "op": "OPUSDT", "shib": "SHIBUSDT", "pepe": "PEPEUSDT",
        "render": "RENDERUSDT", "ray": "RAYUSDT",
        "lunc": "LUNCUSDT", "hot": "HOTUSDT", "wlfi": "WLFIUSDT",
        "vra": "VRAUSDT"
    }
    for cid, token in missing:
        old = old_candles.get(cid, {})
        old_rows = old.get("candles") if isinstance(old.get("candles"), list) else []
        # Only trust fully validated OHLC, including older persisted observations.
        old_rows = real_ohlc_rows(
            [[r.get("t"), r.get("o"), r.get("h"), r.get("l"), r.get("c")]
             for r in old_rows if isinstance(r, dict)], "cache", time_unit="s")
        last_check = old.get("ohlcCheckedAt")
        try:
            last_check = datetime.fromisoformat(last_check.replace("Z", "+00:00")) if last_check else None
            if last_check and last_check.tzinfo is None:
                last_check = last_check.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError, AttributeError):
            last_check = None
        recent = bool(last_check and (now_utc - last_check).total_seconds() < 6 * 3600)
        rows = []
        source = None
        if not recent:
            symbol = fallback_symbols.get(cid)
            if symbol:
                rows = binance_daily_candles(symbol)
                if len(rows) >= 2:
                    source = "Binance Spot USDT"
            if len(rows) < 2:
                rows = coingecko_daily_candles(token)
                if len(rows) >= 2:
                    source = "CoinGecko USD"
        if len(rows) >= 2:
            items[cid]["candles"] = rows
            items[cid]["candleSource"] = source
        elif len(old_rows) >= 2:
            items[cid]["candles"] = old_rows
            items[cid]["candleSource"] = old.get("candleSource") or "Storico verificato"
        if recent:
            if last_check:
                items[cid]["ohlcCheckedAt"] = last_check.isoformat()
        else:
            items[cid]["ohlcCheckedAt"] = now_utc.isoformat()

    print("Crypto OHLC coverage:",
          sum(len(row["candles"]) >= 2 for row in items.values()), "/", len(items))
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
        "markets": fetch_group(MARKETS + TECH),
        "bigtech": fetch_group(BIGTECH),
        "commodities": fetch_group(COMMODITIES),
        "forex": fetch_group(FOREX),
        "crypto": crypto_quotes(),
    }
    ready = sum(1 for group in ("markets", "bigtech", "commodities", "forex", "crypto")
                for row in data[group] if row["value"] is not None)
    print("Verified quotes:", ready, "of", sum(map(len, (MARKETS, TECH, BIGTECH, COMMODITIES, FOREX, CRYPTO))))
    # If every request is denied, preserve the last successful snapshot rather than
    # overwriting real existing prices with empty values.
    if ready == 0 and OUTPUT.exists():
        try:
            old = json.loads(OUTPUT.read_text(encoding="utf-8"))
            if any(x.get("value") is not None for g in ("markets", "bigtech", "commodities", "forex", "crypto")
                   for x in old.get(g, [])):
                print("All APIs unavailable; retaining last successful snapshot")
                return
        except (OSError, ValueError, TypeError):
            pass
    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
