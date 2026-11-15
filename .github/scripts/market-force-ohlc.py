#!/usr/bin/env python3
"""Verified OHLC price candles for Market Force, by exact crypto identity.

Sources: CoinGecko OHLC (exact CoinGecko ID), or a deliberately approved
Binance Spot base/quote market. Never transform sampled prices into OHLC.
"""
from __future__ import annotations

import json
import math
import os
import runpy
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "chart-history" / "crypto" / "ohlc"
BACKFILL = runpy.run_path(str(ROOT / ".github/scripts/crypto-price-backfill.py"))
HEADERS = {"Accept": "application/json", "User-Agent": "VertexCryptoOHLC/1.0"}
PRIORITIES = ["hype", "btc", "eth", "sol", "usdt", "usdc", "bnb", "xrp",
              "ore", "inj", "lunc", "wld", "tao", "doge", "ada", "aave", "link"]
# Manually identified Binance markets: crypto symbols can collide; never infer
# an exchange market from a random catalog ticker alone.
BINANCE_SPOT = {
    "btc": "BTCUSDT", "eth": "ETHUSDT", "sol": "SOLUSDT",
    "bnb": "BNBUSDT", "xrp": "XRPUSDT", "hype": "HYPEUSDT",
    "ada": "ADAUSDT", "doge": "DOGEUSDT", "link": "LINKUSDT",
    "avax": "AVAXUSDT", "dot": "DOTUSDT", "sui": "SUIUSDT",
    "trx": "TRXUSDT", "ltc": "LTCUSDT", "xmr": "XMRUSDT",
    "aave": "AAVEUSDT", "shib": "SHIBUSDT", "pepe": "PEPEUSDT",
    "inj": "INJUSDT", "lunc": "LUNCUSDT", "ton": "TONUSDT",
    "hbar": "HBARUSDT", "xlm": "XLMUSDT", "uni": "UNIUSDT",
    "arb": "ARBUSDT", "apt": "APTUSDT", "near": "NEARUSDT",
    "fil": "FILUSDT", "atom": "ATOMUSDT", "op": "OPUSDT",
    "render": "RENDERUSDT", "fet": "FETUSDT", "wld": "WLDUSDT",
    "tao": "TAOUSDT", "jup": "JUPUSDT", "ray": "RAYUSDT",
    "crv": "CRVUSDT", "ens": "ENSUSDT", "sand": "SANDUSDT",
    "mana": "MANAUSDT", "bonk": "BONKUSDT", "floki": "FLOKIUSDT",
    "bch": "BCHUSDT", "etc": "ETCUSDT", "eos": "EOSUSDT",
    "grt": "GRTUSDT", "stx": "STXUSDT", "cake": "CAKEUSDT",
    "algo": "ALGOUSDT", "icp": "ICPUSDT", "kava": "KAVAUSDT",
    "ena": "ENAUSDT", "ethfi": "ETHFIUSDT", "pyth": "PYTHUSDT",
    "gala": "GALAUSDT", "ftm": "FTMUSDT", "sei": "SEIUSDT"
}
CG_COOLDOWN = 2.4
_last_cg = 0.0
_cg_blocked = False


def normalise(rows, now):
    unique = {}
    for row in rows or []:
        if not isinstance(row, (list, tuple)) or len(row) < 5:
            continue
        try:
            t = int(float(row[0]))
            if t > 100_000_000_000:
                t //= 1000
            o, h, l, c = [float(n) for n in row[1:5]]
        except (TypeError, ValueError, OverflowError):
            continue
        if not (946684800 <= t <= now + 3600) or not all(
                math.isfinite(n) and n > 0 for n in (o, h, l, c)):
            continue
        if h < max(o, c) or l > min(o, c):
            continue
        unique[t] = [t, o, h, l, c]
    return [unique[t] for t in sorted(unique)]


def read_old(path, identity, coin):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if (data.get("id") == identity and data.get("coingeckoId") == coin
                and data.get("kind") == "verified-ohlc"):
            return data
    except (OSError, ValueError, TypeError):
        pass
    return None


def get_json(url, timeout=11):
    request = Request(url, headers=HEADERS)
    with urlopen(request, timeout=timeout) as response:
        return json.load(response)


def binance_candles(symbol, interval, limit, now):
    url = ("https://data-api.binance.vision/api/v3/klines?" +
           urlencode({"symbol": symbol, "interval": interval, "limit": limit}))
    for domain in ("https://data-api.binance.vision", "https://api.binance.com"):
        try:
            body = get_json(url.replace("https://data-api.binance.vision", domain), 9)
            if not isinstance(body, list):
                return []
            rows = normalise(body, now)
            if len(rows) >= 2 and now - rows[-1][0] < 14400:
                return rows
        except (HTTPError, URLError, OSError, TypeError, ValueError) as error:
            print("Binance", symbol, interval, type(error).__name__)
    return []


def cg_candles(coin, days, now):
    global _last_cg, _cg_blocked
    if _cg_blocked:
        return []
    pause = CG_COOLDOWN - (time.monotonic() - _last_cg)
    if pause > 0:
        time.sleep(pause)
    _last_cg = time.monotonic()
    url = ("https://api.coingecko.com/api/v3/coins/" + quote(coin, safe="") +
           "/ohlc?" + urlencode({"vs_currency": "usd", "days": days, "precision": "full"}))
    try:
        body = get_json(url, 13)
        if not isinstance(body, list):
            return []
        rows = normalise(body, now)
        return rows if len(rows) >= 2 else []
    except HTTPError as error:
        if error.code in (401, 403, 429):
            _cg_blocked = True
            print("CoinGecko throttled/restricted", error.code, "; preserving archives")
        else:
            print("CoinGecko", coin, days, "HTTP", error.code)
    except (URLError, OSError, ValueError, TypeError) as error:
        print("CoinGecko", coin, days, type(error).__name__)
    return []


def safe_existing_set(old, key, now):
    if not old:
        return None
    part = old.get("sets", {}).get(key) or {}
    rows = normalise(part.get("candles") or [], now)
    max_age = 14400 if key == "short" else 86400
    if len(rows) >= 2 and now - rows[-1][0] < max_age:
        return {"interval": str(part.get("interval", "")),
                "source": str(part.get("source", old.get("source", ""))),
                "currency": str(part.get("currency", old.get("quoteCurrency", "USD"))),
                "candles": rows}
    return None


def collect(identity, coin, old, now):
    sets = {}
    market = BINANCE_SPOT.get(identity)
    if market:
        for key, interval, limit in (("short", "5m", 300), ("week", "1h", 172)):
            rows = binance_candles(market, interval, limit, now)
            if rows:
                sets[key] = {"interval": interval, "source": "Binance Spot · " + market,
                             "currency": "USDT", "candles": rows}
    for key, days in (("short", 1), ("week", 7)):
        if key in sets:
            continue
        rows = cg_candles(coin, days, now)
        if rows:
            sets[key] = {"interval": "30m" if days == 1 else "4h",
                         "source": "CoinGecko · OHLC " + coin,
                         "currency": "USD", "candles": rows}
        elif (previous := safe_existing_set(old, key, now)):
            sets[key] = previous
    if not sets:
        return None
    return {
        "id": identity, "coingeckoId": coin,
        "kind": "verified-ohlc", "quoteCurrency": sets["short"]["currency"]
        if "short" in sets else sets["week"]["currency"],
        "source": "Binance Spot / CoinGecko · OHLC reale",
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "sets": sets
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    now = int(datetime.now(timezone.utc).timestamp())
    target = BACKFILL["targets"]()
    old = {(identity, coin): read_old(OUT / (identity + ".json"), identity, coin)
           for identity, coin in target}
    # First pass prioritizes the asset in the user screenshot, then the major
    # markets. Later scheduled runs prioritize older/missing snapshots.
    order = {item: index for index, item in enumerate(PRIORITIES)}
    def priority(row):
        identity, coin = row
        previous = old[(identity, coin)]
        if identity in order:
            return (-2, order[identity])
        return (0 if previous is None else 1,
                (previous or {}).get("capturedAt", ""), identity)
    target.sort(key=priority)
    limit = int(os.getenv("VERTEX_OHLC_MAX_ASSETS", "115"))
    updated = 0
    for index, (identity, coin) in enumerate(target[:limit], 1):
        archive = OUT / (identity + ".json")
        result = collect(identity, coin, old[(identity, coin)], now)
        if result:
            archive.write_text(json.dumps(result, separators=(",", ":"),
                                          ensure_ascii=False) + "\n", encoding="utf-8")
            updated += 1
        if index % 20 == 0:
            print("Processed", index, "of", min(len(target), limit), "saved", updated)
    print("Genuine short/week OHLC snapshots:", updated,
          "of", min(len(target), limit), "catalog", len(target))
    print("No fabricated OHLC; unavailable instruments remain unavailable.")


if __name__ == "__main__":
    main()
