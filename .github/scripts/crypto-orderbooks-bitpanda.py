#!/usr/bin/env python3
"""Optional Bitpanda Fusion aggregated book adapter for Vertex.

Bitpanda Fusion is a broker aggregating multiple venues, NOT a CEX Spot venue.
Credentials stay server-side in the GitHub Actions secret
BITPANDA_FUSION_API_KEY. Do not embed an API key in a public static site.
No invented levels, midpoint quotes, or unverified same-symbol token matches.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from urllib.parse import quote as url_quote
from urllib.request import Request, urlopen
import json
import os
import sys

JSON_FILE = Path("crypto-orderbooks.json")
JS_FILE = Path("crypto-orderbooks-data.js")
BASE_URL = "https://api.fusion.bitpanda.com/v1"
VENUE = "Bitpanda Fusion"
QUOTE_PRIORITY = ("USDT", "USDC", "USD", "EUR", "BTC", "ETH")
MAX_BOOKS = 90
MAX_CAPTURE_AGE = 600

MOD = spec_from_file_location("vertex_multisource", ".github/scripts/crypto-orderbooks-multisource.py")
multi = module_from_spec(MOD)
MOD.loader.exec_module(multi)


def fetch_fusion(path, key):
    """Only HTTPS to the documented Fusion API, with a private read-only key."""
    request = Request(BASE_URL + path, headers={
        "Accept": "application/json", "x-api-key": key,
        "User-Agent": "Vertex-orderbook-read-only/1.0"})
    with urlopen(request, timeout=12) as response:
        raw = response.read(8_000_001)
    if len(raw) > 8_000_000:
        raise ValueError("Fusion response too large")
    return json.loads(raw)


def fusion_identity_candidates(registry):
    """Use canonical built-in assets or explicitly curated CoinGecko identities.

    Asset symbol alone is NEVER sufficient for a Vertex extended token.
    """
    out = {}
    for cid, (symbol, coin_id, extended) in registry.items():
        if not symbol.isalnum() or len(symbol) > 20:
            continue
        if extended:
            curated = multi.CURATED_SPOT.get(cid)
            if not curated or curated[0] != symbol or curated[1] != coin_id:
                continue
        out[cid] = (symbol, coin_id)
    return out


def validated_pair(raw, symbol, quoted):
    pair = symbol + "-" + quoted
    return (isinstance(raw, dict) and raw.get("pair") == pair and
            raw.get("baseAsset") == symbol and
            raw.get("quoteAsset") == quoted and
            raw.get("baseAssetType") == "cryptocoin" and
            quoted in QUOTE_PRIORITY and symbol != quoted)


def pick_pairs(raw, candidates):
    """Official /pairs returns only ACTIVE pairs; choose one per catalog asset."""
    if not isinstance(raw, list):
        raise ValueError("Fusion pairs payload is not a list")
    by_symbol = {}
    for row in raw:
        if not isinstance(row, dict):
            continue
        sym = str(row.get("baseAsset") or "")
        quoted = str(row.get("quoteAsset") or "")
        if validated_pair(row, sym, quoted):
            by_symbol.setdefault(sym, set()).add(quoted)
    return {
        cid: (symbol, next(q for q in QUOTE_PRIORITY if q in by_symbol[symbol]))
        for cid, (symbol, _) in candidates.items()
        if symbol in by_symbol and any(q in by_symbol[symbol] for q in QUOTE_PRIORITY)
    }


def normalize_book(raw, symbol, quoted, now):
    pair = symbol + "-" + quoted
    if not isinstance(raw, dict) or raw.get("pair") != pair:
        raise ValueError("Fusion response pair does not match requested market")
    instant = datetime.fromisoformat(str(raw["timestamp"]).replace("Z", "+00:00"))
    if instant.tzinfo is None or not -60 <= now - instant.timestamp() <= MAX_CAPTURE_AGE:
        raise ValueError("Fusion orderbook timestamp stale or invalid")
    def side(name):
        rows = raw.get(name)
        if not isinstance(rows, list):
            raise ValueError("Fusion orderbook side missing")
        return [
            [entry["price"], entry["quantity"]]
            for entry in rows if isinstance(entry, dict)
            and "price" in entry and "quantity" in entry
        ]
    bids, asks = multi.base.checked({"bids": side("bids"), "asks": side("asks")}, "Binance")
    return bids, asks, instant.isoformat()


def fetch_one(cid, symbol, quoted, key, now):
    pair = symbol + "-" + quoted
    raw = fetch_fusion("/orderbook/" + url_quote(pair, safe="-") + "?depth=50", key)
    bids, asks, captured = normalize_book(raw, symbol, quoted, now)
    return cid, {
        "id": cid, "venue": VENUE, "venueType": "aggregated-broker",
        "pair": symbol + "/" + quoted, "unit": symbol,
        "bids": bids, "asks": asks, "capturedAt": captured,
    }


def publish(data):
    compact = json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    JSON_FILE.write_text(compact + "\n", encoding="utf-8")
    JS_FILE.write_text("window.__VERTEX_CRYPTO_BOOKS__ = " + compact + ";\n", encoding="utf-8")


def check_fixture():
    fake = {"btc": ("BTC", None, False),
            "vra": ("VRA", "verasity", True),
            "impostor": ("BTC", "an-unverified-bitcoin-clone", True)}
    ids = fusion_identity_candidates(fake)
    assert set(ids) == {"btc", "vra"}
    pairs = [
        {"pair": "BTC-EUR", "baseAsset": "BTC", "quoteAsset": "EUR",
         "baseAssetType": "cryptocoin"},
        {"pair": "VRA-USDT", "baseAsset": "VRA", "quoteAsset": "USDT",
         "baseAssetType": "cryptocoin"},
        {"pair": "VRA-USD", "baseAsset": "VRA", "quoteAsset": "USD",
         "baseAssetType": "perpetual"},
    ]
    assert pick_pairs(pairs, ids) == {"btc": ("BTC", "EUR"), "vra": ("VRA", "USDT")}
    now = datetime.now(timezone.utc)
    sample = {"pair": "BTC-EUR", "timestamp": now.isoformat(),
              "bids": [{"price": "100", "quantity": "2"}],
              "asks": [{"price": "101", "quantity": "3"}]}
    assert normalize_book(sample, "BTC", "EUR", now.timestamp())[0]
    for invalid in [
        {**sample, "pair": "ETH-EUR"},
        {**sample, "timestamp": "2020-01-01T00:00:00Z"},
        {**sample, "asks": [{"price": "99", "quantity": "3"}]},
    ]:
        try:
            normalize_book(invalid, "BTC", "EUR", now.timestamp())
        except (ValueError, KeyError, TypeError):
            pass
        else:
            raise AssertionError("Invalid Bitpanda depth was accepted")
    print("Fusion adapter selftest: identity, active pairs, timestamps and levels OK")


def main():
    if "--selftest" in sys.argv:
        check_fixture()
        return
    data = json.loads(JSON_FILE.read_text(encoding="utf-8"))
    key = os.environ.get("BITPANDA_FUSION_API_KEY", "").strip()
    now = datetime.now(timezone.utc)
    status = {"type": "aggregated-broker", "configured": bool(key),
              "status": "needs-readonly-api-key" if not key else "checking",
              "checkedAt": now.isoformat()}
    data["bitpandaFusion"] = status
    if not key:
        publish(data)
        print("Bitpanda Fusion: private API key not configured; no synthetic books added")
        return
    candidates = fusion_identity_candidates(multi.catalog_with_ids())
    try:
        matched = pick_pairs(fetch_fusion("/pairs", key), candidates)
    except (OSError, ValueError, TypeError, KeyError) as error:
        status["status"] = "api-unavailable"
        publish(data)
        print("Bitpanda Fusion unavailable:", type(error).__name__)
        return

    # Rotate to eventually inspect all supported, canonical identities.
    missing = [cid for cid in matched if cid not in data.get("books", {})]
    existing = [cid for cid in matched if cid in data.get("books", {})]
    ordered = sorted(missing) + sorted(existing)
    start = int(data.get("bitpandaFusionCursor") or 0) % max(1, len(ordered))
    window = (ordered[start:] + ordered[:start])[:MAX_BOOKS]
    data["bitpandaFusionCursor"] = (start + len(window)) % max(1, len(ordered))
    validated = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {
            pool.submit(fetch_one, cid, *matched[cid], key, now.timestamp()): cid
            for cid in window
        }
        for task in as_completed(jobs):
            try:
                validated.append(task.result())
            except (OSError, ValueError, TypeError, KeyError):
                continue

    venue_books = data.setdefault("venueBooks", {})
    sources = data.setdefault("marketSources", {})
    books = data.setdefault("books", {})
    verified_at = now.timestamp()
    for cid, book in validated:
        symbol, coin_id = candidates[cid]
        # The UI keeps Fusion depth isolated from CEX depth.
        venue_books.setdefault(cid, {})[VENUE] = book
        proof = {
            "venue": VENUE, "pair": book["pair"], "symbol": symbol,
            "coingeckoId": coin_id, "verifiedAt": verified_at,
            "identityMethod": "canonical-catalog-and-live-fusion-pair",
            "venueType": "aggregated-broker",
        }
        sources[cid] = [row for row in sources.get(cid, [])
                        if isinstance(row, dict) and row.get("venue") != VENUE] + [proof]
        if cid not in books:
            books[cid] = book
    data["available"] = len(books)
    coverage = data.setdefault("coverage", {})
    coverage["verifiedBooks"] = len(books)
    coverage["verifiedVenueSnapshots"] = sum(len(row) for row in venue_books.values())
    coverage["assetsWithMultipleVenues"] = sum(len(row) >= 2 for row in venue_books.values())
    for cid, _ in validated:
        data.setdefault("unavailable", {}).pop(cid, None)
    status["status"] = "verified-snapshots" if validated else "no-fresh-depth"
    status["matchedActivePairs"] = len(matched)
    status["verifiedSnapshots"] = len(validated)
    publish(data)
    print("Bitpanda Fusion: verified", len(validated), "of", len(matched),
          "matched active aggregated pairs (separate from CEX books)")


if __name__ == "__main__":
    main()
