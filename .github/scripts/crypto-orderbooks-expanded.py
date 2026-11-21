#!/usr/bin/env python3
"""Vertex Spot snapshots for all 288 catalog coins when the true pair is verified.

A public orderbook is an exchange-specific instrument, not a cryptocurrency
price. The 42 existing verified instruments retain their exact original feeds.
Additional Binance Spot pairs are discovered incrementally using the coin's
CoinGecko ID and a matching, currently trading Binance exchangeInfo symbol.
No symbol-only matching, invented bids/asks, or cross-exchange merging.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from urllib.parse import quote
import json
import re
import sys

SCRIPT = Path(".github/scripts/crypto-orderbooks.py")
MODULE = spec_from_file_location("vertex_existing_books", SCRIPT)
base = module_from_spec(MODULE)
MODULE.loader.exec_module(base)

CATALOG = Path("crypto-extended.js")
JSON_PATH = Path("crypto-orderbooks.json")
JS_PATH = Path("crypto-orderbooks-data.js")
MAX_SCAN_PER_RUN = 24
SCAN_RETRY_SECONDS = 6 * 60 * 60
REVALIDATE_SECONDS = 48 * 60 * 60
VERIFIED_SOURCE_TTL = 7 * 24 * 60 * 60
SNAPSHOT_RETENTION = 20 * 60
PRIORITY = ("usdc", "hype", "usdt", "figr_heloc", "xmr", "usde", "rlusd", "pyusd")
HEADERS = {"Accept": "application/json"}


def canonical_id(symbol):
    if re.fullmatch(r"[A-Z0-9_-]+", symbol):
        return symbol.lower()
    return "crypto-" + "-".join(format(ord(ch), "x") for ch in symbol)


def catalog():
    source = CATALOG.read_text(encoding="utf-8")
    found = re.search(r"window\.__VERTEX_EXTRA_CRYPTO__\s*=\s*(\[[\s\S]*?\]);", source)
    if not found:
        raise ValueError("Cannot locate catalog")
    extras = json.loads(found.group(1))
    known = set(base.ALL.values())
    all_coins = {cid: (symbol, None, False) for cid, symbol in base.ALL.items()}
    for record in extras:
        if not isinstance(record, list) or len(record) < 3:
            continue
        symbol = str(record[0]).upper().strip()
        coin_id = str(record[2]).strip()
        if symbol in known or len(symbol) > 40:
            continue
        if not re.fullmatch(r"[a-z0-9-]{1,100}", coin_id):
            continue
        cid = canonical_id(symbol)
        if cid in all_coins:
            continue
        all_coins[cid] = (symbol, coin_id, True)
        known.add(symbol)
    if len(all_coins) != 288:
        raise ValueError(f"Catalog has {len(all_coins)} instead of 288 unique coins")
    return all_coins


def read_previous():
    try:
        data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def valid_source(row, symbol, coin_id, timestamp):
    if not isinstance(row, dict):
        return False
    if (row.get("symbol") != symbol or row.get("coingeckoId") != coin_id or
        row.get("venue") != "Binance Spot" or row.get("pair") != symbol + "/USDT"):
        return False
    try:
        age = timestamp - float(row["verifiedAt"])
        return 0 <= age < VERIFIED_SOURCE_TTL
    except (KeyError, ValueError, TypeError):
        return False


def identity_confirmed(tickers, exchange, symbol):
    """Both independently reported mapping and a trading Spot listing agree."""
    if not isinstance(tickers, dict) or not isinstance(exchange, dict):
        return False
    valid_tickers = any(
        isinstance(t, dict) and
        str(t.get("market", {}).get("identifier", "")).lower() == "binance" and
        str(t.get("base", "")).upper() == symbol and
        str(t.get("target", "")).upper() == "USDT" and
        t.get("is_stale") is not True and t.get("is_anomaly") is not True and
        t.get("trust_score") != "red" and float(t.get("last") or 0) > 0
        for t in tickers.get("tickers", []) if isinstance(t, dict)
    )
    valid_exchange = any(
        isinstance(m, dict) and m.get("symbol") == symbol + "USDT" and
        m.get("baseAsset") == symbol and m.get("quoteAsset") == "USDT" and
        m.get("status") == "TRADING" and
        m.get("isSpotTradingAllowed") is not False
        for m in exchange.get("symbols", [])
    )
    return valid_tickers and valid_exchange


def verify_coin(cid, symbol, coin_id, timestamp):
    if not re.fullmatch(r"[A-Z0-9]{2,20}", symbol):
        return cid, None
    try:
        tickers = base.fetch(
            "https://api.coingecko.com/api/v3/coins/" + quote(coin_id, safe="") +
            "/tickers?exchange_ids=binance&order=trust_score_desc&depth=false&page=1"
        )
        if not any(
            isinstance(t, dict) and
            str((t.get("market") or {}).get("identifier", "")).lower() == "binance" and
            str(t.get("base", "")).upper() == symbol and
            str(t.get("target", "")).upper() == "USDT"
            for t in tickers.get("tickers", []) if isinstance(t, dict)
        ):
            return cid, None
        exchange = base.fetch(
            "https://data-api.binance.vision/api/v3/exchangeInfo?symbol=" +
            symbol + "USDT"
        )
        if identity_confirmed(tickers, exchange, symbol):
            return cid, {"venue": "Binance Spot", "pair": symbol + "/USDT",
                         "symbol": symbol, "coingeckoId": coin_id,
                         "verifiedAt": timestamp}
    except (OSError, ValueError, TypeError, KeyError):
        pass
    return cid, None


def old_levels(cid, symbol, row, timestamp):
    """Carry only the last genuine, dated levels through a brief API outage."""
    if not isinstance(row, dict) or row.get("id") != cid or row.get("unit") != symbol:
        return None
    if row.get("pair") != symbol + "/USDT" or row.get("venue") != "Binance Spot":
        return None
    try:
        captured = datetime.fromisoformat(row["capturedAt"].replace("Z", "+00:00"))
        if captured.tzinfo is None or not 0 <= timestamp - captured.timestamp() < SNAPSHOT_RETENTION:
            return None
        bids, asks = base.checked({"bids": row["bids"], "asks": row["asks"]}, "Binance")
        return {**row, "bids": bids, "asks": asks}
    except (KeyError, ValueError, TypeError):
        return None


def live_book(cid, symbol, previous):
    """Read actual Binance Spot level-20 depth, not CoinGecko approximations."""
    pair = symbol + "/USDT"
    try:
        raw = base.fetch(
            "https://data-api.binance.vision/api/v3/depth?symbol=" +
            symbol + "USDT&limit=20"
        )
        bids, asks = base.checked(raw, "Binance")
        captured = base.now().isoformat()
        result = {"id": cid, "venue": "Binance Spot", "pair": pair, "unit": symbol,
                  "bids": bids, "asks": asks, "capturedAt": captured}
        try:
            price = base.recent_trade("Binance", pair)
            if price is not None:
                result["lastTrade"] = price
                result["lastTradeAt"] = base.now().isoformat()
        except (OSError, ValueError, TypeError, KeyError):
            pass
        old = previous.get(cid)
        if (isinstance(old, dict) and old.get("pair") == pair and
            old.get("venue") == "Binance Spot" and
            result.get("lastTrade") is not None and
            old.get("lastTrade") is not None):
            try:
                last_time = datetime.fromisoformat(old["lastTradeAt"].replace("Z", "+00:00"))
                if (0 < base.now().timestamp() - last_time.timestamp() < 3 * 60 * 60
                    and float(old["lastTrade"]) > 0):
                    result["previousTrade"] = float(old["lastTrade"])
                    result["previousTradeAt"] = old["lastTradeAt"]
            except (KeyError, ValueError, TypeError):
                pass
        return cid, result
    except (OSError, ValueError, TypeError, KeyError):
        return cid, None


def run():
    all_coins = catalog()
    if "--selftest" in sys.argv:
        assert len(all_coins) == 288
        assert all_coins["usdc"][1] == "usd-coin"
        assert all_coins["hype"][1] == "hyperliquid"
        assert not identity_confirmed({"tickers": []}, {"symbols": []}, "HYPE")
        print("PASS: 288 catalog coins; matching exchange identity is mandatory")
        return 0

    previous = read_previous()
    # Run the existing trusted 42-coin collector without modifying its venues.
    base.main()
    current = read_previous()
    old_books = previous.get("books", {}) if isinstance(previous.get("books"), dict) else {}
    books = dict(current.get("books", {}))
    verified = previous.get("verifiedMarkets", {})
    checked = previous.get("discoveryCheckedAt", {})
    verified = verified if isinstance(verified, dict) else {}
    checked = checked if isinstance(checked, dict) else {}
    timestamp = base.now().timestamp()
    extended = {cid: value for cid, value in all_coins.items() if value[2]}
    mappings = {cid: row for cid, row in verified.items()
                if cid in extended and
                valid_source(row, extended[cid][0], extended[cid][1], timestamp)}
    def wait_age(cid):
        try:
            return timestamp - float(checked.get(cid, 0))
        except (TypeError, ValueError):
            return 1e12
    # Verify a bounded batch per run. High-priority assets (e.g. USDC/HYPE)
    # are checked first; all others are covered over later 5-minute cycles.
    pending = [cid for cid in extended if wait_age(cid) >=
               (REVALIDATE_SECONDS if cid in mappings else SCAN_RETRY_SECONDS)]
    pending.sort(key=lambda cid: (PRIORITY.index(cid) if cid in PRIORITY else len(PRIORITY),
                                  -wait_age(cid), cid))
    chosen = pending[:MAX_SCAN_PER_RUN]
    if chosen:
        with ThreadPoolExecutor(max_workers=3) as pool:
            jobs = {pool.submit(verify_coin, cid, extended[cid][0],
                                extended[cid][1], timestamp): cid for cid in chosen}
            for task in as_completed(jobs):
                cid = jobs[task]
                checked[cid] = timestamp
                try:
                    _, mapping = task.result()
                    if mapping:
                        mappings[cid] = mapping
                except (OSError, ValueError, TypeError):
                    pass

    with ThreadPoolExecutor(max_workers=10) as pool:
        tasks = {pool.submit(live_book, cid, extended[cid][0], old_books): cid
                 for cid in mappings}
        for task in as_completed(tasks):
            cid = tasks[task]
            try:
                _, book = task.result()
            except (OSError, ValueError, TypeError):
                book = None
            if not book:
                book = old_levels(cid, extended[cid][0],
                                  old_books.get(cid), timestamp)
            if book:
                books[cid] = book

    payload = {
        "generatedAt": base.now().isoformat(),
        "totalAssets": len(all_coins),
        "available": len(books),
        "books": books,
        "verifiedMarkets": mappings,
        "discoveryCheckedAt": {cid: checked[cid] for cid in extended if cid in checked},
        "marketSources": previous.get("marketSources", {}),
        "venueBooks": previous.get("venueBooks", {}),
        "multiDiscoveryCheckedAt": previous.get("multiDiscoveryCheckedAt", {}),
        "unavailable": {cid: "Nessuna coppia Spot verificata o fonte non raggiungibile"
                        for cid in all_coins if cid not in books},
    }
    serialized = json.dumps(payload, separators=(",", ":"), ensure_ascii=False,
                            allow_nan=False)
    JSON_PATH.write_text(serialized + "\n", encoding="utf-8")
    JS_PATH.write_text("window.__VERTEX_CRYPTO_BOOKS__ = " + serialized + ";\n",
                       encoding="utf-8")
    print(f"Vertex book data: {len(books)}/{len(all_coins)} genuine spot snapshots; "
          f"{len(mappings)} verified extra Binance pairs; scanned {len(chosen)} identities")
    return 0


if __name__ == "__main__":
    sys.exit(run())
