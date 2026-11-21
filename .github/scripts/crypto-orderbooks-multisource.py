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
SCAN_INTERVAL = 8 * 3600
SCAN_BATCH = 20
BOOK_BATCH = 155
PRIORITY = ("btc", "eth", "sol", "usdt", "usdc", "hype", "usde", "xmr",
            "rlusd", "figr_heloc", "pyusd", "shib", "link", "inj", "ore")
KNOWN = {
    "Binance Spot": {"keys": {"binance"}},
    "Gate Spot": {"keys": {"gate", "gate-io"}},
    "MEXC Spot": {"keys": {"mxc", "mexc"}},
    "Bybit Spot": {"keys": {"bybit_spot"}},
    "OKX Spot": {"keys": {"okex", "okx"}},
    "KuCoin Spot": {"keys": {"kucoin"}},
}
VENUE_ORDER = ("Binance Spot", "Gate Spot", "MEXC Spot", "Bybit Spot", "OKX Spot", "KuCoin Spot", "LBank Spot")


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
        row.get("pair") != symbol + "/USDT"):
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


def exchange_market_valid(venue, payload, symbol):
    if venue == "Binance Spot":
        return isinstance(payload, dict) and any(
            isinstance(row, dict) and
            row.get("symbol") == symbol + "USDT" and
            row.get("baseAsset") == symbol and
            row.get("quoteAsset") == "USDT" and
            row.get("status") == "TRADING" and
            row.get("isSpotTradingAllowed") is not False
            for row in payload.get("symbols", [])
        )
    if venue == "Gate Spot":
        return (isinstance(payload, dict) and
                payload.get("id") == symbol + "_USDT" and
                payload.get("base") == symbol and
                payload.get("quote") == "USDT" and
                payload.get("trade_status") == "tradable")
    if venue == "MEXC Spot":
        if not isinstance(payload, dict):
            return False
        return any(
            isinstance(row, dict) and
            row.get("symbol") == symbol + "USDT" and
            row.get("baseAsset") == symbol and
            row.get("quoteAsset") == "USDT" and
            str(row.get("status", "")).upper() in ("1", "TRADING", "ENABLED") and
            row.get("isSpotTradingAllowed") is not False
            for row in payload.get("symbols", [])
        )
    if venue == "Bybit Spot":
        return (isinstance(payload, dict) and payload.get("retCode") == 0 and
                any(isinstance(m, dict) and
                    m.get("symbol") == symbol + "USDT" and
                    m.get("baseCoin") == symbol and m.get("quoteCoin") == "USDT" and
                    m.get("status") == "Trading"
                    for m in (payload.get("result") or {}).get("list", [])))
    if venue == "OKX Spot":
        return (isinstance(payload, dict) and str(payload.get("code")) == "0" and
                any(isinstance(m, dict) and
                    m.get("instId") == symbol + "-USDT" and
                    m.get("instType") == "SPOT" and
                    m.get("baseCcy") == symbol and m.get("quoteCcy") == "USDT" and
                    m.get("state") == "live"
                    for m in payload.get("data", [])))
    if venue == "KuCoin Spot":
        m = payload.get("data") if isinstance(payload, dict) else None
        return (isinstance(m, dict) and str(payload.get("code")) == "200000" and
                m.get("symbol") == symbol + "-USDT" and
                m.get("baseCurrency") == symbol and
                m.get("quoteCurrency") == "USDT" and
                m.get("enableTrading") is True)
    return False


def exchange_info_url(venue, symbol):
    if venue == "Binance Spot":
        return ("https://data-api.binance.vision/api/v3/exchangeInfo?symbol="
                + symbol + "USDT")
    if venue == "Gate Spot":
        return ("https://api.gateio.ws/api/v4/spot/currency_pairs/"
                + symbol + "_USDT")
    if venue == "MEXC Spot":
        return "https://api.mexc.com/api/v3/exchangeInfo?symbol=" + symbol + "USDT"
    if venue == "Bybit Spot":
        return ("https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=" +
                symbol + "USDT")
    if venue == "OKX Spot":
        return ("https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=" +
                symbol + "-USDT")
    if venue == "KuCoin Spot":
        return ("https://api.kucoin.com/api/v2/symbols/" + symbol + "-USDT")
    raise ValueError("Unsupported venue")


def discover_one(cid, symbol, coin_id, ts):
    if not coin_id or not re.fullmatch(r"[A-Z0-9]{2,20}", symbol):
        return cid, []
    try:
        # One CoinGecko request checks identity across the three exchanges.
        tickers = base.fetch(
            "https://api.coingecko.com/api/v3/coins/" +
            quote(coin_id, safe="") +
            "/tickers?order=trust_score_desc&depth=false&page=1"
        )
        candidates = candidate_tickers(tickers.get("tickers"), symbol)
        # CoinGecko's unfiltered first page can omit Gate/MEXC even for
        # widely traded assets. A small priority subset uses venue-specific
        # ticker evidence; every pair still needs verified exchange metadata.
        if cid in ("btc", "eth", "sol", "hype"):
            for venue, exchange_id in (
                ("Gate Spot", "gate"), ("MEXC Spot", "mxc"),
                ("Bybit Spot", "bybit_spot"), ("OKX Spot", "okex"),
                ("KuCoin Spot", "kucoin")
            ):
                if venue in candidates:
                    continue
                try:
                    venue_tickers = base.fetch(
                        "https://api.coingecko.com/api/v3/coins/" +
                        quote(coin_id, safe="") +
                        "/tickers?exchange_ids=" + exchange_id +
                        "&order=trust_score_desc&depth=false&page=1"
                    )
                    candidates.update(candidate_tickers(
                        venue_tickers.get("tickers"), symbol))
                except (OSError, ValueError, TypeError, KeyError):
                    pass
        sources = []
        for venue in VENUE_ORDER:
            if venue not in candidates:
                continue
            try:
                market = base.fetch(exchange_info_url(venue, symbol))
                if exchange_market_valid(venue, market, symbol):
                    sources.append({
                        "venue": venue, "pair": symbol + "/USDT",
                        "symbol": symbol, "coingeckoId": coin_id,
                        "verifiedAt": ts,
                    })
            except (OSError, ValueError, TypeError, KeyError):
                continue
        return cid, sources
    except (OSError, ValueError, TypeError, KeyError):
        return cid, []


def depth_url(venue, symbol):
    pair = symbol + "USDT"
    if venue == "Binance Spot":
        return "https://data-api.binance.vision/api/v3/depth?symbol=" + pair + "&limit=20"
    if venue == "Gate Spot":
        return ("https://api.gateio.ws/api/v4/spot/order_book?currency_pair=" +
                symbol + "_USDT&limit=20")
    if venue == "MEXC Spot":
        return "https://api.mexc.com/api/v3/depth?symbol=" + pair + "&limit=20"
    if venue == "Bybit Spot":
        return ("https://api.bybit.com/v5/market/orderbook?category=spot&symbol=" +
                pair + "&limit=20")
    if venue == "OKX Spot":
        return "https://www.okx.com/api/v5/market/books?instId=" + symbol + "-USDT&sz=20"
    if venue == "KuCoin Spot":
        return ("https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=" +
                symbol + "-USDT")
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
        raw = base.fetch(depth_url(venue, symbol))
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
    print("PASS: 288 assets, 6 exchange candidates, valid spot identities and native depth formats")


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
    if data.get('multiDiscoveryVersion') != 3:
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
                checked[cid] = ts
                try:
                    _, new_markets = future.result()
                    if new_markets:
                        mapping = {s["venue"]: s for s in sources.get(cid, [])}
                        mapping.update({s["venue"]: s for s in new_markets})
                        sources[cid] = list(mapping.values())
                except (OSError, ValueError, TypeError):
                    continue

    tasks = []
    for cid, venue_sources in sources.items():
        for source in venue_sources:
            if source["venue"] not in KNOWN:
                continue
            old = venue_books.get(cid, {}).get(source["venue"])
            age = ts - stamp(old.get("capturedAt")) if isinstance(old, dict) else 1e12
            tasks.append((age, cid, source, old))
    # Refresh the least-recently-updated first; bounded for GitHub runners.
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

    data["books"] = default_books
    data["available"] = len(default_books)
    data["venueBooks"] = venue_books
    data["marketSources"] = sources
    data["multiDiscoveryVersion"] = 3
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
