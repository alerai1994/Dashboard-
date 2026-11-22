#!/usr/bin/env python3
"""Verified multi-exchange Spot order books for the complete 288-coin Vertex catalog.

The primary 42-coin collector and original source labels remain intact.
Additional venues are stored separately: NEVER combine order depth across venues.
A market is accepted only when CoinGecko maps the EXACT CoinGecko coin ID to
the named exchange AND the exchange reports the same tradable Spot pair.
Absent markets remain unavailable; no synthetic price or depth is generated.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from urllib.parse import quote
import json
import re
import sys
import time

MODULE = spec_from_file_location("vertex_expanded", ".github/scripts/crypto-orderbooks-expanded.py")
expanded = module_from_spec(MODULE)
MODULE.loader.exec_module(expanded)
base = expanded.base

OUT_JSON = Path("crypto-orderbooks.json")
OUT_JS = Path("crypto-orderbooks-data.js")
SOURCE_TTL = 7 * 86400
BOOK_TTL = 25 * 60
SCAN_INTERVAL = 2 * 3600
SCAN_BATCH = 32
BOOK_BATCH = 220
# Prioritize assets shown without books in the mobile/desktop catalog.
# Verification still requires exact CoinGecko ID AND an exchange-listed pair.
PRIORITY = ("xmr", "leo", "wbt", "dai", "cro", "paxg", "ondo", "algo",
            "icp", "kcs", "pol", "jup", "kas", "morpho", "rlusd", "pyusd",
            "usdg", "xaut", "usdt", "bgb", "okb", "gt", "mnt", "usdd",
            "btc", "eth", "sol", "usdc", "hype", "usde", "shib", "inj", "ore")
KNOWN = {
    "Binance Spot": {"keys": {"binance"}},
    "Gate Spot": {"keys": {"gate", "gate-io"}},
    "MEXC Spot": {"keys": {"mxc", "mexc"}},
    "Bybit Spot": {"keys": {"bybit_spot"}},
    "OKX Spot": {"keys": {"okex", "okx"}},
    "KuCoin Spot": {"keys": {"kucoin"}},
    "Coinbase Exchange Spot": {"keys": {"gdax"}},
    "Kraken Spot": {"keys": {"kraken"}},
}
VENUE_ORDER = ("Binance Spot", "Gate Spot", "MEXC Spot", "Bybit Spot", "OKX Spot", "KuCoin Spot", "Coinbase Exchange Spot", "Kraken Spot", "LBank Spot")
QUOTE_PRIORITY = ("USDT", "USDC", "USD")

# Explicit catalog identity mappings for widely traded assets whose public
# CoinGecko tickers are often inaccessible from GitHub Actions. The exchange
# must STILL report an active Spot instrument for the exact base/quote before
# its live BID/ASK depth is accepted. Never infer order levels from prices.
CURATED_SPOT = {
    "xmr": ("XMR", "monero", (("Kraken Spot", "USD"), ("Gate Spot", "USDT"))),
    "paxg": ("PAXG", "pax-gold", (("Kraken Spot", "USD"), ("Binance Spot", "USDT"))),
    "dai": ("DAI", "dai", (("Coinbase Exchange Spot", "USD"), ("Kraken Spot", "USD"), ("OKX Spot", "USDT"))),
    "algo": ("ALGO", "algorand", (("Coinbase Exchange Spot", "USD"), ("Kraken Spot", "USD"), ("OKX Spot", "USDT"))),
    "cro": ("CRO", "crypto-com-chain", (("Coinbase Exchange Spot", "USD"), ("Kraken Spot", "USD"))),
    "ondo": ("ONDO", "ondo-finance", (("Coinbase Exchange Spot", "USD"), ("OKX Spot", "USDT"))),
    "icp": ("ICP", "internet-computer", (("Coinbase Exchange Spot", "USD"), ("Kraken Spot", "USD"))),
    "jup": ("JUP", "jupiter-exchange-solana", (("Coinbase Exchange Spot", "USD"), ("Kraken Spot", "USD"))),
    "kas": ("KAS", "kaspa", (("Kraken Spot", "USD"), ("Gate Spot", "USDT"))),
    "kcs": ("KCS", "kucoin-shares", (("KuCoin Spot", "USDT"),)),
    "gt": ("GT", "gatechain-token", (("Gate Spot", "USDT"),)),
    "pol": ("POL", "polygon-ecosystem-token", (("Coinbase Exchange Spot", "USD"), ("OKX Spot", "USDT"))),
    "morpho": ("MORPHO", "morpho", (("Coinbase Exchange Spot", "USD"), ("Kraken Spot", "USD"))),
    "usdt": ("USDT", "tether", (("Coinbase Exchange Spot", "USD"), ("Kraken Spot", "USD"), ("OKX Spot", "USDC"))),
}


def stamp(value):
    try:
        value = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return value.timestamp() if value.tzinfo else 0
    except (ValueError, TypeError, OverflowError):
        return 0


def coin_ids():
    text = expanded.CATALOG.read_text(encoding="utf-8")
    block = re.search(r"window\.__VERTEX_EXTRA_CRYPTO__\s*=\s*(\[[\s\S]*?\]);", text)
    if not block:
        raise ValueError("Extended catalog missing")
    return {str(item[0]).upper(): str(item[2])
            for item in json.loads(block.group(1))
            if isinstance(item, list) and len(item) >= 3}


def catalog_with_ids():
    registry = expanded.catalog()
    ids = coin_ids()
    return {cid: (sym, coin_id or ids.get(sym), extended)
            for cid, (sym, coin_id, extended) in registry.items()}


def source_valid(row, symbol, coin_id, ts):
    if not isinstance(row, dict):
        return False
    if (row.get("coingeckoId") != coin_id or
        row.get("symbol") != symbol or
        row.get("venue") not in KNOWN or
        row.get("pair") not in {symbol + "/" + q for q in QUOTE_PRIORITY}):
        return False
    try:
        age = ts - float(row["verifiedAt"])
        return 0 <= age < SOURCE_TTL
    except (ValueError, TypeError, KeyError):
        return False


def candidate_tickers(rows, symbol):
    result = {}
    if not isinstance(rows, list):
        return result
    for item in rows:
        if not isinstance(item, dict) or not isinstance(item.get("market"), dict):
            continue
        market = str(item["market"].get("identifier", "")).lower()
        if (str(item.get("base", "")).upper() != symbol or
            str(item.get("target", "")).upper() != "USDT" or
            item.get("is_stale") is True or item.get("is_anomaly") is True or
            item.get("trust_score") == "red"):
            continue
        try:
            if float(item.get("last") or 0) <= 0:
                continue
        except (TypeError, ValueError):
            continue
        for venue, desc in KNOWN.items():
            if market in desc["keys"]:
                result[venue] = True
    return result


def candidate_quoted_markets(rows, symbol):
    """Require CoinGecko ID plus exact ticker and an exchange-verified pair."""
    found = {}
    if not isinstance(rows, list):
        return found
    for item in rows:
        if not isinstance(item, dict) or not isinstance(item.get("market"), dict):
            continue
        venue_id = str(item["market"].get("identifier", "")).lower()
        quoted = str(item.get("target", "")).upper()
        if (str(item.get("base", "")).upper() != symbol or
            quoted not in QUOTE_PRIORITY or
            item.get("is_stale") is True or item.get("is_anomaly") is True or
            item.get("trust_score") == "red"):
            continue
        try:
            if float(item.get("last") or 0) <= 0:
                continue
        except (ValueError, TypeError):
            continue
        for venue, desc in KNOWN.items():
            if venue_id in desc["keys"]:
                found.setdefault(venue, set()).add(quoted)
    return {venue: [q for q in QUOTE_PRIORITY if q in quotes]
            for venue, quotes in found.items()}


def kraken_alias(symbol):
    return {"BTC": "XBT", "DOGE": "XDG"}.get(symbol, symbol)


def exchange_market_valid(venue, payload, symbol, quote='USDT'):
    if venue == "Binance Spot":
        return isinstance(payload, dict) and any(
            isinstance(row, dict) and
            row.get("symbol") == symbol + quote and
            row.get("baseAsset") == symbol and
            row.get("quoteAsset") == quote and
            row.get("status") == "TRADING" and
            row.get("isSpotTradingAllowed") is not False
            for row in payload.get("symbols", [])
        )
    if venue == "Gate Spot":
        return (isinstance(payload, dict) and
                payload.get("id") == symbol + "_" + quote and
                payload.get("base") == symbol and
                payload.get("quote") == quote and
                payload.get("trade_status") == "tradable")
    if venue == "MEXC Spot":
        if not isinstance(payload, dict):
            return False
        return any(
            isinstance(row, dict) and
            row.get("symbol") == symbol + quote and
            row.get("baseAsset") == symbol and
            row.get("quoteAsset") == quote and
            str(row.get("status", "")).upper() in ("1", "TRADING", "ENABLED") and
            row.get("isSpotTradingAllowed") is not False
            for row in payload.get("symbols", [])
        )
    if venue == "Bybit Spot":
        return (isinstance(payload, dict) and payload.get("retCode") == 0 and
                any(isinstance(m, dict) and
                    m.get("symbol") == symbol + quote and
                    m.get("baseCoin") == symbol and m.get("quoteCoin") == quote and
                    m.get("status") == "Trading"
                    for m in (payload.get("result") or {}).get("list", [])))
    if venue == "OKX Spot":
        return (isinstance(payload, dict) and str(payload.get("code")) == "0" and
                any(isinstance(m, dict) and
                    m.get("instId") == symbol + "-" + quote and
                    m.get("instType") == "SPOT" and
                    m.get("baseCcy") == symbol and m.get("quoteCcy") == quote and
                    m.get("state") == "live"
                    for m in payload.get("data", [])))
    if venue == "KuCoin Spot":
        m = payload.get("data") if isinstance(payload, dict) else None
        return (isinstance(m, dict) and str(payload.get("code")) == "200000" and
                m.get("symbol") == symbol + "-" + quote and
                m.get("baseCurrency") == symbol and
                m.get("quoteCurrency") == quote and
                m.get("enableTrading") is True)
    if venue == "Kraken Spot":
        if not isinstance(payload, dict) or payload.get("error") or not isinstance(payload.get("result"), dict):
            return False
        expected = kraken_alias(symbol) + "/" + quote
        return any(isinstance(m, dict) and m.get("wsname") == expected and
                   m.get("status", "online") == "online"
                   for m in payload["result"].values())
    if venue == "Coinbase Exchange Spot":
        return (isinstance(payload, dict) and
                payload.get("id") == symbol + "-" + quote and
                payload.get("base_currency") == symbol and
                payload.get("quote_currency") == quote and
                payload.get("status") == "online" and
                payload.get("trading_disabled") is not True)
    return False


def exchange_info_url(venue, symbol, quote='USDT'):
    if venue == "Binance Spot":
        return ("https://data-api.binance.vision/api/v3/exchangeInfo?symbol="
                + symbol + quote)
    if venue == "Gate Spot":
        return ("https://api.gateio.ws/api/v4/spot/currency_pairs/"
                + symbol + "_" + quote)
    if venue == "MEXC Spot":
        return "https://api.mexc.com/api/v3/exchangeInfo?symbol=" + symbol + quote
    if venue == "Bybit Spot":
        return ("https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=" +
                symbol + quote)
    if venue == "OKX Spot":
        return ("https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=" +
                symbol + "-" + quote)
    if venue == "KuCoin Spot":
        return ("https://api.kucoin.com/api/v2/symbols/" + symbol + "-" + quote)
    if venue == "Coinbase Exchange Spot":
        return ("https://api.exchange.coinbase.com/products/" +
                symbol + "-" + quote)
    if venue == "Kraken Spot":
        return "https://api.kraken.com/0/public/AssetPairs?pair=" + kraken_alias(symbol) + quote
    raise ValueError("Unsupported venue")


def discover_one(cid, symbol, coin_id, ts):
    if not coin_id or not re.fullmatch(r"[A-Z0-9]{2,20}", symbol):
        return cid, None
    try:
        tickers = base.fetch(
            "https://api.coingecko.com/api/v3/coins/" +
            quote(coin_id, safe="") +
            "/tickers?order=trust_score_desc&depth=false&page=1"
        )
        candidates = candidate_quoted_markets(tickers.get("tickers"), symbol)
        # CoinGecko's first ticker page often contains only the most liquid
        # pairs, not every Spot book. For coins with no verified candidates,
        # search deeper pages without treating API errors as absent markets.
        # Stop once verified-looking pairs are found to limit public API calls.
        if not candidates:
            for page in (2, 3):
                try:
                    extra_tickers = base.fetch(
                        "https://api.coingecko.com/api/v3/coins/" +
                        quote(coin_id, safe="") +
                        "/tickers?order=trust_score_desc&depth=false&page=" +
                        str(page)
                    )
                    if not isinstance(extra_tickers, dict):
                        break
                    matched = candidate_quoted_markets(extra_tickers.get("tickers"), symbol)
                    for venue, quotes in matched.items():
                        prior = set(candidates.get(venue, []))
                        candidates[venue] = [q for q in QUOTE_PRIORITY
                                             if q in prior or q in quotes]
                    if candidates or not extra_tickers.get("tickers"):
                        break
                except (OSError, ValueError, TypeError, KeyError):
                    break
        # A filtered exchange page can expose genuine listings missing from
        # CoinGecko's global top-volume pages. Probe only priority assets,
        # and only venues not already found, to respect public rate limits.
        # Both the exact CoinGecko ID and current exchange metadata must agree.
        if cid in PRIORITY[:12]:
            for venue, exchange_id in (
                ("Binance Spot", "binance"), ("Gate Spot", "gate"),
                ("MEXC Spot", "mxc"), ("Bybit Spot", "bybit_spot"),
                ("OKX Spot", "okex"), ("KuCoin Spot", "kucoin"),
                ("Coinbase Exchange Spot", "gdax"),
                ("Kraken Spot", "kraken")
            ):
                if candidates.get(venue):
                    continue
                try:
                    rows = base.fetch(
                        "https://api.coingecko.com/api/v3/coins/" +
                        quote(coin_id, safe="") +
                        "/tickers?exchange_ids=" + exchange_id +
                        "&order=trust_score_desc&depth=false&page=1"
                    )
                    matched = candidate_quoted_markets(rows.get("tickers"), symbol)
                    for exchange, quotes in matched.items():
                        prior = set(candidates.get(exchange, []))
                        candidates[exchange] = [q for q in QUOTE_PRIORITY
                                                if q in prior or q in quotes]
                except (OSError, ValueError, TypeError, KeyError):
                    pass
        sources = []
        for venue in VENUE_ORDER:
            for quoted in candidates.get(venue, []):
                try:
                    market = base.fetch(exchange_info_url(venue, symbol, quoted))
                    if exchange_market_valid(venue, market, symbol, quoted):
                        sources.append({
                            "venue": venue, "pair": symbol + "/" + quoted,
                            "symbol": symbol, "coingeckoId": coin_id,
                            "verifiedAt": ts,
                        })
                        break  # Prefer USDT > USDC > USD within this venue.
                except (OSError, ValueError, TypeError, KeyError):
                    continue
        return cid, sources
    except (OSError, ValueError, TypeError, KeyError):
        return cid, None  # API failure, not proof that this market is absent.


def discover_curated_markets(registry, sources, ts):
    """Independently confirm curated identity pairs with current Spot metadata.

    A curated candidate is NOT a book. The exchange must confirm the active
    instrument, and load_depth must retrieve authentic uncrossed order levels.
    """
    checks = []
    for cid, (expected_symbol, expected_id, pairs) in CURATED_SPOT.items():
        if cid not in registry:
            continue
        symbol, coin_id, _ = registry[cid]
        if symbol != expected_symbol or coin_id != expected_id:
            continue
        current = {(m["venue"], m["pair"]) for m in sources.get(cid, [])}
        for venue, quoted in pairs:
            if (venue, symbol + "/" + quoted) not in current:
                checks.append((cid, symbol, coin_id, quoted, venue))
    discovered = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        jobs = [pool.submit(verify_bulk_pair, cid, symbol, coin_id, quoted,
                            venue, ts)
                for cid, symbol, coin_id, quoted, venue in checks]
        for task in as_completed(jobs):
            try:
                cid, market = task.result()
                if market:
                    market["identityMethod"] = "curated-catalog-and-live-spot-metadata"
                    discovered.append((cid, market))
            except (OSError, ValueError, TypeError):
                continue
    return discovered, len(checks)


def bulk_exchange_candidates(tickers, registry):
    """Match CoinGecko's EXACT coin_id and base symbol; ticker alone is unsafe.
    Exchange metadata must separately verify the live Spot pair.
    """
    catalog_by_id = {}
    for cid, (symbol, coin_id, _) in registry.items():
        if coin_id:
            catalog_by_id.setdefault(coin_id, []).append((cid, symbol))
    matches = []
    if not isinstance(tickers, list):
        return matches
    for row in tickers:
        if not isinstance(row, dict):
            continue
        coin_id = str(row.get("coin_id") or "")
        quoted = str(row.get("target") or "").upper()
        base_symbol = str(row.get("base") or "").upper()
        if (quoted not in QUOTE_PRIORITY or row.get("is_stale") is True or
            row.get("is_anomaly") is True or row.get("trust_score") == "red"):
            continue
        try:
            if float(row.get("last") or 0) <= 0:
                continue
        except (ValueError, TypeError):
            continue
        for cid, symbol in catalog_by_id.get(coin_id, []):
            if symbol == base_symbol:
                matches.append((cid, symbol, coin_id, quoted))
    return matches


def verify_bulk_pair(cid, symbol, coin_id, quoted, venue, ts):
    try:
        meta = base.fetch(exchange_info_url(venue, symbol, quoted))
        if exchange_market_valid(venue, meta, symbol, quoted):
            return cid, {
                "venue": venue, "pair": symbol + "/" + quoted,
                "symbol": symbol, "coingeckoId": coin_id, "verifiedAt": ts
            }
    except (OSError, ValueError, TypeError, KeyError):
        pass
    return cid, None


def depth_url(venue, symbol, quote='USDT'):
    pair = symbol + quote
    if venue == "Binance Spot":
        return "https://data-api.binance.vision/api/v3/depth?symbol=" + pair + "&limit=20"
    if venue == "Gate Spot":
        return ("https://api.gateio.ws/api/v4/spot/order_book?currency_pair=" +
                symbol + "_" + quote + "&limit=20")
    if venue == "MEXC Spot":
        return "https://api.mexc.com/api/v3/depth?symbol=" + pair + "&limit=20"
    if venue == "Bybit Spot":
        return ("https://api.bybit.com/v5/market/orderbook?category=spot&symbol=" +
                pair + "&limit=20")
    if venue == "OKX Spot":
        return "https://www.okx.com/api/v5/market/books?instId=" + symbol + "-" + quote + "&sz=20"
    if venue == "KuCoin Spot":
        return ("https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=" +
                symbol + "-" + quote)
    if venue == "Coinbase Exchange Spot":
        return ("https://api.exchange.coinbase.com/products/" +
                symbol + "-" + quote + "/book?level=2")
    if venue == "Kraken Spot":
        return "https://api.kraken.com/0/public/Depth?pair=" + kraken_alias(symbol) + quote + "&count=20"
    raise ValueError("Unsupported venue")


def normalize_exchange_depth(venue, raw):
    if not isinstance(raw, dict):
        raise ValueError("Not an exchange depth response")
    if venue == "Bybit Spot":
        if raw.get("retCode") != 0:
            raise ValueError("Bybit API rejected spot orderbook")
        book = (raw.get("result") or {})
        return {"bids": book.get("b"), "asks": book.get("a")}
    if venue == "OKX Spot":
        if str(raw.get("code")) != "0" or not raw.get("data"):
            raise ValueError("OKX API rejected spot orderbook")
        book = raw["data"][0]
        return {"bids": book.get("bids"), "asks": book.get("asks")}
    if venue == "KuCoin Spot":
        if str(raw.get("code")) != "200000" or not isinstance(raw.get("data"), dict):
            raise ValueError("KuCoin API rejected spot orderbook")
        book = raw["data"]
        return {"bids": book.get("bids"), "asks": book.get("asks")}
    if venue == "Kraken Spot":
        if raw.get("error") or not isinstance(raw.get("result"), dict) or len(raw["result"]) != 1:
            raise ValueError("Kraken API rejected spot orderbook")
        book = next(iter(raw["result"].values()))
        return {"bids": book.get("bids"), "asks": book.get("asks")}
    if venue == "Coinbase Exchange Spot":
        if not isinstance(raw.get("bids"), list) or not isinstance(raw.get("asks"), list):
            raise ValueError("Coinbase Exchange API rejected spot orderbook")
    return raw


def preserve_recent(row, cid, source, ts):
    if (not isinstance(row, dict) or row.get("id") != cid or
        row.get("venue") != source["venue"] or
        row.get("pair") != source["pair"] or
        row.get("unit") != source["symbol"]):
        return None
    captured = stamp(row.get("capturedAt"))
    if not 0 <= ts - captured < BOOK_TTL:
        return None
    try:
        bids, asks = base.checked({"bids": row["bids"], "asks": row["asks"]},
                                  "Binance")
        return {**row, "bids": bids, "asks": asks}
    except (ValueError, KeyError, TypeError):
        return None


def load_depth(cid, source, previous):
    venue, symbol = source["venue"], source["symbol"]
    try:
        quote_currency = source["pair"].split("/")[1]
        raw = base.fetch(depth_url(venue, symbol, quote_currency))
        bids, asks = base.checked(normalize_exchange_depth(venue, raw), "Binance")
        data = {
            "id": cid, "venue": venue, "pair": source["pair"],
            "unit": symbol, "bids": bids, "asks": asks,
            "capturedAt": base.now().isoformat(),
        }
        # Last price is optional and is NEVER derived from midpoint.
        return cid, venue, data
    except (OSError, ValueError, TypeError, KeyError):
        return cid, venue, preserve_recent(previous, cid, source,
                                           base.now().timestamp())


def check_fixture():
    assert len(catalog_with_ids()) == 288
    assert CURATED_SPOT["xmr"][:2] == ("XMR", "monero")
    assert CURATED_SPOT["usdt"][:2] == ("USDT", "tether")
    assert exchange_market_valid("Kraken Spot", {"error": [], "result": {
        "XXBTZUSD": {"wsname": "XBT/USD", "status": "online"}}}, "BTC", "USD")
    assert not exchange_market_valid("Kraken Spot", {"error": [], "result": {
        "XXBTZUSD": {"wsname": "XBT/USD", "status": "online"}}}, "ETH", "USD")
    assert normalize_exchange_depth("Kraken Spot", {"error": [], "result": {
        "XXBTZUSD": {"bids": [["100", "1", 123]], "asks": [["101", "2", 123]]}}})["bids"]
    # Confirm a valid identity-specific USD market is still retained.
    assert candidate_quoted_markets([
        {"base": "BTC", "target": "USD",
         "market": {"identifier": "gdax"}, "last": 123},
        {"base": "BTC", "target": "USDT",
         "market": {"identifier": "binance"}, "last": 122}
    ], "BTC") == {"Coinbase Exchange Spot": ["USD"], "Binance Spot": ["USDT"]}
    assert candidate_tickers([
        {"base": "HYPE", "target": "USDT", "market": {"identifier": "gate"},
         "last": 35, "is_stale": False},
        {"base": "HYPE", "target": "USDT", "market": {"identifier": "mxc"},
         "last": 34},
        {"base": "OTHER", "target": "USDT", "market": {"identifier": "binance"},
         "last": 1},
    ], "HYPE") == {"Gate Spot": True, "MEXC Spot": True}
    assert exchange_market_valid("Gate Spot", {
        "id": "HYPE_USDT", "base": "HYPE", "quote": "USDT",
        "trade_status": "tradable",
    }, "HYPE")
    assert not exchange_market_valid("Gate Spot", {
        "id": "HYPE_USDT", "base": "OTHER", "quote": "USDT",
        "trade_status": "tradable",
    }, "HYPE")
    assert not exchange_market_valid("MEXC Spot", {
        "symbols": [{"symbol": "HYPEUSDT", "baseAsset": "OTHER",
                     "quoteAsset": "USDT", "status": "1"}],
    }, "HYPE")
    assert not candidate_tickers([
        {"base": "HYPE", "target": "USDT", "market": {"identifier": "gate"},
         "last": 35, "is_stale": True},
    ], "HYPE")
    assert candidate_tickers([
        {"base": "HYPE", "target": "USDT", "market": {"identifier": "bybit_spot"},
         "last": 34}, {"base": "HYPE", "target": "USDT",
         "market": {"identifier": "okex"}, "last": 34},
        {"base": "HYPE", "target": "USDT",
         "market": {"identifier": "kucoin"}, "last": 34}
    ], "HYPE") == {"Bybit Spot": True, "OKX Spot": True, "KuCoin Spot": True}
    assert exchange_market_valid("Bybit Spot", {
        "retCode": 0, "result": {"list": [
            {"symbol": "HYPEUSDT", "baseCoin": "HYPE",
             "quoteCoin": "USDT", "status": "Trading"}]}}, "HYPE")
    assert not exchange_market_valid("Bybit Spot", {
        "retCode": 0, "result": {"list": [
            {"symbol": "HYPEUSDT", "baseCoin": "OTHER",
             "quoteCoin": "USDT", "status": "Trading"}]}}, "HYPE")
    assert exchange_market_valid("OKX Spot", {
        "code": "0", "data": [{
            "instId": "HYPE-USDT", "instType": "SPOT", "baseCcy": "HYPE",
            "quoteCcy": "USDT", "state": "live"}]}, "HYPE")
    assert not exchange_market_valid("OKX Spot", {
        "code": "0", "data": [{
            "instId": "HYPE-USDT", "instType": "SPOT", "baseCcy": "HYPE",
            "quoteCcy": "USDT", "state": "suspend"}]}, "HYPE")
    assert exchange_market_valid("KuCoin Spot", {
        "code": "200000", "data": {
            "symbol": "HYPE-USDT", "baseCurrency": "HYPE",
            "quoteCurrency": "USDT", "enableTrading": True}}, "HYPE")
    assert not exchange_market_valid("KuCoin Spot", {
        "code": "200000", "data": {
            "symbol": "HYPE-USDT", "baseCurrency": "HYPE",
            "quoteCurrency": "USDT", "enableTrading": False}}, "HYPE")
    assert normalize_exchange_depth("Bybit Spot", {
        "retCode": 0, "result": {"b": [["1", "2"]], "a": [["2", "2"]]}})["bids"]
    assert normalize_exchange_depth("OKX Spot", {
        "code": "0", "data": [{"bids": [["1", "2", "0", "1"]],
                               "asks": [["2", "2", "0", "1"]]}]})["asks"]
    assert normalize_exchange_depth("KuCoin Spot", {
        "code": "200000", "data": {"bids": [["1", "2"]],
                                    "asks": [["2", "2"]]}})["asks"]
    assert candidate_quoted_markets([
        {"base": "USDT", "target": "USDC", "market": {"identifier": "okex"},
         "last": 1.0},
        {"base": "USDT", "target": "USD", "market": {"identifier": "kraken"},
         "last": 1.0},
        {"base": "OTHER", "target": "USDC", "market": {"identifier": "okex"},
         "last": 1.0}
    ], "USDT") == {"OKX Spot": ["USDC"], "Kraken Spot": ["USD"]}
    assert exchange_market_valid("OKX Spot", {
        "code": "0", "data": [{"instId": "USDT-USDC", "instType": "SPOT",
        "baseCcy": "USDT", "quoteCcy": "USDC", "state": "live"}]},
        "USDT", "USDC")
    assert not exchange_market_valid("OKX Spot", {
        "code": "0", "data": [{"instId": "USDT-USDC", "instType": "SPOT",
        "baseCcy": "OTHER", "quoteCcy": "USDC", "state": "live"}]},
        "USDT", "USDC")
    assert exchange_market_valid("Coinbase Exchange Spot", {
        "id": "BTC-USD", "base_currency": "BTC", "quote_currency": "USD",
        "status": "online", "trading_disabled": False}, "BTC", "USD")
    assert not exchange_market_valid("Coinbase Exchange Spot", {
        "id": "BTC-USD", "base_currency": "OTHER", "quote_currency": "USD",
        "status": "online", "trading_disabled": False}, "BTC", "USD")
    assert normalize_exchange_depth("Coinbase Exchange Spot", {
        "bids": [["10", "1", 1]], "asks": [["11", "2", 1]]})["bids"]
    assert bulk_exchange_candidates([
        {"coin_id": "hyperliquid", "base": "HYPE", "target": "USDC",
         "last": 2.0, "is_stale": False},
        {"coin_id": "other", "base": "HYPE", "target": "USDT", "last": 2.0},
        {"coin_id": "hyperliquid", "base": "WRONG", "target": "USDT", "last": 2.0},
    ], {"hype": ("HYPE", "hyperliquid", True)}) == [
        ("hype", "HYPE", "hyperliquid", "USDC")
    ]
    assert source_valid({"coingeckoId": "tether", "symbol": "USDT",
        "venue": "OKX Spot", "pair": "USDT/USDC",
        "verifiedAt": 1000}, "USDT", "tether", 1100)
    assert not source_valid({"coingeckoId": "other", "symbol": "USDT",
        "venue": "OKX Spot", "pair": "USDT/USDC",
        "verifiedAt": 1000}, "USDT", "tether", 1100)
    print("PASS: 288 assets, identity-verified real USDT/USDC/USD Spot pair support")



def run():
    registry = catalog_with_ids()
    if "--selftest" in sys.argv:
        check_fixture()
        return
    data = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    ts = base.now().timestamp()
    default_books = data.get("books", {})
    if not isinstance(default_books, dict):
        default_books = {}
    previous_source = data.get("marketSources", {})
    previous_books = data.get("venueBooks", {})
    checked = data.get("multiDiscoveryCheckedAt", {})
    previous_source = previous_source if isinstance(previous_source, dict) else {}
    previous_books = previous_books if isinstance(previous_books, dict) else {}
    checked = checked if isinstance(checked, dict) else {}
    if data.get('multiDiscoveryVersion') != 5:
        checked = {}  # New all-exchange CoinGecko scan replaces a filtered query.

    sources = {}
    for cid, (symbol, coin_id, _) in registry.items():
        prior = previous_source.get(cid)
        accepted = [r for r in prior if source_valid(r, symbol, coin_id, ts)] \
            if isinstance(prior, list) and coin_id else []
        if accepted:
            sources[cid] = accepted

    # Keep 42 original verified market books, and Binance source identities
    # already independently established by the first expanded collector.
    venue_books = {}
    for cid, value in default_books.items():
        if cid in registry and isinstance(value, dict):
            venue_books[cid] = {value["venue"]: value}
    for cid, market in data.get("verifiedMarkets", {}).items():
        if (cid in registry and isinstance(market, dict) and
            source_valid(market, registry[cid][0], registry[cid][1], ts)):
            existing = sources.setdefault(cid, [])
            if not any(m["venue"] == market["venue"] for m in existing):
                existing.append(market)

    # The prior collector keeps these extra keys through its 42-coin refresh.
    for cid, venues in previous_books.items():
        if cid not in registry or not isinstance(venues, dict):
            continue
        for venue, book in venues.items():
            src = next((s for s in sources.get(cid, [])
                        if s["venue"] == venue), None)
            if src and (kept := preserve_recent(book, cid, src, ts)):
                venue_books.setdefault(cid, {})[venue] = kept

    eligible = [(cid, *data_row) for cid, data_row in registry.items()
                if data_row[1] and
                re.fullmatch(r"[A-Z0-9]{2,20}", data_row[0])]
    def elapsed(cid):
        try:
            return ts - float(checked.get(cid, 0))
        except (TypeError, ValueError):
            return 1e12

    candidates = [r for r in eligible if elapsed(r[0]) >= SCAN_INTERVAL]
    candidates.sort(key=lambda r: (
        PRIORITY.index(r[0]) if r[0] in PRIORITY else len(PRIORITY),
        -elapsed(r[0]), r[0]))
    selected = candidates[:SCAN_BATCH]
    if selected:
        with ThreadPoolExecutor(max_workers=3) as pool:
            jobs = {pool.submit(discover_one, cid, sym, coin_id, ts): cid
                    for cid, sym, coin_id, _ in selected}
            for future in as_completed(jobs):
                cid = jobs[future]
                try:
                    _, new_markets = future.result()
                    # On provider failure retry after 15 minutes; do not report the
                    # asset as successfully verified merely because a call ran.
                    checked[cid] = ts if new_markets is not None else ts - SCAN_INTERVAL + 900
                    if new_markets:
                        mapping = {s["venue"]: s for s in sources.get(cid, [])}
                        mapping.update({s["venue"]: s for s in new_markets})
                        sources[cid] = list(mapping.values())
                except (OSError, ValueError, TypeError):
                    continue

    # When CoinGecko cannot serve its ticker pages, verify a short, explicit
    # set of catalog identities against the exchange's own CURRENT Spot listing.
    # No depth is attributed to a coin until its exchange metadata and actual
    # orderbook both pass validation.
    curated, curated_checked = discover_curated_markets(registry, sources, ts)
    for cid, mapping in curated:
        records = {m["venue"]: m for m in sources.get(cid, [])}
        records[mapping["venue"]] = mapping
        sources[cid] = list(records.values())
    print("Curated Spot metadata checks:", curated_checked, "verified", len(curated))

    # Each run scans four public ticker pages of one exchange, rotating venues.
    # The CoinGecko ticker's coin_id AND base symbol must agree with the Vertex
    # catalog; the exchange then independently confirms Spot trading status.
    # Missing IDs, DEX pool quotes and same-symbol impostors are rejected.
    # CoinGecko identifies MEXC as 'mxc', not its current display spelling.
    bulk_venues = [(venue, "mxc" if venue == "MEXC Spot"
                    else sorted(data["keys"])[0])
                   for venue, data in KNOWN.items()]
    bulk_venue, bulk_id = bulk_venues[int(ts // 300) % len(bulk_venues)]
    all_tickers = []
    for page in (1, 2, 3, 4):
        try:
            result = base.fetch(
                "https://api.coingecko.com/api/v3/exchanges/" +
                quote(bulk_id, safe="") +
                "/tickers?page=" + str(page) + "&order=volume_desc"
            )
            if isinstance(result, dict) and isinstance(result.get("tickers"), list):
                all_tickers.extend(result["tickers"])
        except (OSError, ValueError, TypeError, KeyError):
            break
    verified_by_id = {cid: {m["venue"] for m in markets}
                      for cid, markets in sources.items()}
    bulk_missing = []
    for cid, symbol, coin_id, quoted in bulk_exchange_candidates(all_tickers, registry):
        if bulk_venue in verified_by_id.get(cid, set()):
            continue
        bulk_missing.append((cid, symbol, coin_id, quoted))
    # Prefer USDT first for each coin and cap public metadata requests.
    bulk_missing.sort(key=lambda row: (QUOTE_PRIORITY.index(row[3]), row[0]))
    chosen_bulk = []
    used_ids = set()
    for item in bulk_missing:
        if item[0] in used_ids:
            continue
        used_ids.add(item[0])
        chosen_bulk.append(item)
        if len(chosen_bulk) >= 40:
            break
    if chosen_bulk:
        with ThreadPoolExecutor(max_workers=6) as pool:
            jobs = {pool.submit(verify_bulk_pair, cid, symbol, coin_id,
                                quoted, bulk_venue, ts): cid
                    for cid, symbol, coin_id, quoted in chosen_bulk}
            for task in as_completed(jobs):
                try:
                    cid, mapping = task.result()
                    if mapping and mapping["venue"] not in verified_by_id.get(cid, set()):
                        sources.setdefault(cid, []).append(mapping)
                        verified_by_id.setdefault(cid, set()).add(mapping["venue"])
                except (OSError, ValueError, TypeError):
                    pass
    print("Exchange-wide discovery:", bulk_venue, "ticker pages",
          len(all_tickers), "identity-matched checks", len(chosen_bulk))

    tasks = []
    for cid, venue_sources in sources.items():
        for source in venue_sources:
            if source["venue"] not in KNOWN:
                continue
            old = venue_books.get(cid, {}).get(source["venue"])
            age = ts - stamp(old.get("capturedAt")) if isinstance(old, dict) else 1e12
            tasks.append((age, cid, source, old))
    # Refresh the least-recently-updated first; bounded for GitHub runners.
    # All verified exchanges stay separate; do not synthesize a consolidated book.
    tasks.sort(key=lambda row: (-row[0], row[1]))
    tasks = tasks[:BOOK_BATCH]
    if tasks:
        with ThreadPoolExecutor(max_workers=12) as pool:
            jobs = {pool.submit(load_depth, cid, src, prior): (cid, src)
                    for _, cid, src, prior in tasks}
            for future in as_completed(jobs):
                try:
                    cid, venue, book = future.result()
                except (OSError, ValueError, TypeError):
                    continue
                if book:
                    venue_books.setdefault(cid, {})[venue] = book

    # Remove old/identity-unverified alternative snapshots.
    for cid, venues in list(venue_books.items()):
        if not isinstance(venues, dict):
            del venue_books[cid]
            continue
        for venue, book in list(venues.items()):
            source = next((s for s in sources.get(cid, [])
                           if s["venue"] == venue), None)
            primary = default_books.get(cid)
            if primary is book:
                if cid in base.ALL:
                    # The original 42 were already curated by the original fetcher.
                    continue
                # Expanded primary Binance books were verified by their
                # CoinGecko coin ID. Keep them as venue-specific snapshots only
                # while that proof and the actual levels are both fresh.
                mapped = (data.get("verifiedMarkets") or {}).get(cid)
                meta = registry.get(cid)
                if (meta and source_valid(mapped, meta[0], meta[1], ts) and
                    mapped.get("venue") == venue and
                    preserve_recent(book, cid, mapped, ts)):
                    continue
            if (not source or not preserve_recent(book, cid, source, ts)):
                del venues[venue]
        if not venues:
            del venue_books[cid]

    # Preserve the original 42-coin preferred venue, but allow every extra
    # coin to use an independently validated real Gate/MEXC/Binance book.
    for cid, venues in venue_books.items():
        if cid in default_books:
            continue
        for venue in VENUE_ORDER:
            if venue in venues:
                default_books[cid] = venues[venue]
                break

    # The expanded Binance collector has already verified the exact
    # CoinGecko identity of these genuine primary books. Preserve them as
    # separate exchange snapshots too; never let the alternative-feed
    # cleanup make their exchange disappear from the venue selector.
    for cid, book in default_books.items():
        if cid in base.ALL or cid not in registry or not isinstance(book, dict):
            continue
        mapping = (data.get("verifiedMarkets") or {}).get(cid)
        symbol, coin_id, _ = registry[cid]
        if (source_valid(mapping, symbol, coin_id, ts) and
            mapping.get("venue") == book.get("venue") and
            mapping.get("pair") == book.get("pair") and
            book.get("id") == cid and book.get("unit") == symbol and
            preserve_recent(book, cid, mapping, ts)):
            venue_books.setdefault(cid, {})[book["venue"]] = book

    data["books"] = default_books
    data["available"] = len(default_books)
    data["coverage"] = {
        "catalogAssets": len(registry),
        "verifiedBooks": len(default_books),
        "assetsWithMultipleVenues": sum(1 for v in venue_books.values() if len(v) >= 2),
        "verifiedVenueSnapshots": sum(len(v) for v in venue_books.values()),
        "identitiesChecked": sum(1 for cid in registry if cid in checked),
        "updatedAt": base.now().isoformat(),
    }
    data["venueBooks"] = venue_books
    data["marketSources"] = sources
    data["multiDiscoveryVersion"] = 5
    data["multiDiscoveryCheckedAt"] = {cid: checked[cid] for cid in registry
                                        if cid in checked}
    data["unavailable"] = {cid: "Nessun book pubblico verificato"
                           for cid in registry if cid not in default_books}
    compact = json.dumps(data, ensure_ascii=False, separators=(",", ":"),
                         allow_nan=False)
    OUT_JSON.write_text(compact + "\n", encoding="utf-8")
    OUT_JS.write_text("window.__VERTEX_CRYPTO_BOOKS__ = " + compact + ";\n",
                      encoding="utf-8")
    print("Verified Spot multi-venue:", len(default_books), "/", len(registry),
          "crypto,", sum(len(v) for v in venue_books.values()),
          "source-specific books,", len(selected), "new identities scanned")


if __name__ == "__main__":
    run()
