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
import re
import time
from urllib.error import HTTPError, URLError
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
                return rows, "Yahoo Finance · " + symbol + " · OHLC storico (frequenza del feed)"
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



def screenshot_targets():
    """Use exact CoinGecko IDs declared in the same catalog used by Vertex.

    A ticker alone is not a token identity: tokenized shares, stablecoins, and
    short tickers can share symbols with entirely different assets.
    """
    catalog = ROOT / "crypto-extended.js"
    try:
        text = catalog.read_text(encoding="utf-8")
        match = re.search(r"window\.__VERTEX_EXTRA_CRYPTO__\s*=\s*(\[[\s\S]*?\]);", text)
        entries = json.loads(match.group(1)) if match else []
    except (OSError, TypeError, ValueError):
        entries = []
    original = {asset_id for asset_id, _ in CONFIG["CRYPTO"]}
    targets, seen = [], set()
    for entry in entries:
        if not isinstance(entry, list) or len(entry) < 3:
            continue
        ticker, label, cg_id = map(str, entry[:3])
        ticker, cg_id = ticker.strip().upper(), cg_id.strip()
        if not ticker or not re.fullmatch(r"[a-z0-9-]{1,100}", cg_id):
            continue
        identity = (ticker.lower() if re.fullmatch(r"[A-Z0-9_-]+", ticker)
                    else "crypto-" + "-".join(format(ord(c), "x") for c in ticker))
        if identity in original or identity in seen or identity == "ore":
            continue
        seen.add(identity)
        targets.append((identity, ticker, label, cg_id))
    return targets


# Anonymous API calls need pacing. A rate limit never warrants fabricating
# history; earlier verified files remain untouched.
CG_GAP_SECONDS = 2.1
_cg_last_request = 0.0
_cg_blocked = False


def coingecko_ohlc(coin_id, days):
    global _cg_last_request, _cg_blocked
    if _cg_blocked:
        return []
    now = time.monotonic()
    if now - _cg_last_request < CG_GAP_SECONDS:
        time.sleep(CG_GAP_SECONDS - (now - _cg_last_request))
    _cg_last_request = time.monotonic()
    url = ("https://api.coingecko.com/api/v3/coins/" + quote(coin_id, safe="")
           + "/ohlc?" + urlencode({"vs_currency": "usd", "days": days, "precision": "full"}))
    try:
        with urlopen(Request(url, headers=HEADERS), timeout=13) as response:
            payload = json.load(response)
        if not isinstance(payload, list):
            return []
        # CoinGecko timestamps are milliseconds, unlike Yahoo/Binance archives.
        return normalise([
            [int(float(candle[0])) // 1000, *candle[1:5]]
            for candle in payload if isinstance(candle, list) and len(candle) >= 5
        ])
    except HTTPError as error:
        if error.code == 429:
            _cg_blocked = True
            print("CoinGecko rate limit (429). Keeping existing archives; retry in next run.")
        elif error.code in (401, 403):
            _cg_blocked = True
            print("CoinGecko access denied. Keeping existing archives.")
        else:
            print("CoinGecko history unavailable:", coin_id, days, "HTTP", error.code)
    except (URLError, OSError, ValueError, TypeError, OverflowError) as error:
        print("CoinGecko OHLC unavailable:", coin_id, days, type(error).__name__)
    return []


def existing_history(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (OSError, ValueError, TypeError):
        return None


def recently_captured(stamp, hours=36):
    try:
        date = datetime.fromisoformat(str(stamp).replace("Z", "+00:00"))
        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - date).total_seconds()
        return 0 <= elapsed < hours * 3600
    except (ValueError, TypeError, OverflowError):
        return False



def verified_coin_names():
    path = ROOT / "market-quotes.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}
    return {str(row["id"]): row for row in payload.get("crypto", [])
            if isinstance(row, dict) and isinstance(row.get("id"), str)}


def clean_project_name(value):
    value = re.sub(r"\s*\([^)]*\)\s*$", "", str(value or ""))
    value = re.sub(r"\s+(?:USD|USDT)\s*$", "", value, flags=re.I)
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def yahoo_extended_candidate(target, market):
    """Accept Yahoo candles only if its instrument name matches CoinGecko.

    Tickers are not unique project identities. A latest-price sanity check
    also rejects clearly unrelated symbols.
    """
    identity, ticker, label, cg_id = target
    if not re.fullmatch(r"[A-Z][A-Z0-9]{1,14}", ticker):
        return None
    if market.get("coingeckoId") != cg_id:
        return None
    expected = clean_project_name(market.get("name") or label)
    if len(expected) < 4 or expected == ticker.casefold():
        return None
    symbol = ticker + "-USD"
    for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
        url = ("https://" + host + "/v8/finance/chart/" + quote(symbol, safe="")
               + "?" + urlencode({"range": "max", "interval": "1mo"}))
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=9) as response:
                raw = json.load(response)
            result = (raw.get("chart", {}).get("result") or [None])[0]
            if not isinstance(result, dict):
                continue
            meta = result.get("meta") or {}
            actual = clean_project_name(meta.get("longName") or meta.get("shortName"))
            if actual != expected:
                continue
            candles = normalise(zip_rows(result.get("timestamp") or [],
                                         (result.get("indicators", {}).get("quote") or [{}])[0]))
            if len(candles) < 2:
                continue
            spot = positive(market.get("value"))
            if spot and candles[-1][0] >= int(datetime.now(timezone.utc).timestamp()) - 7 * 86400:
                if not 0.28 <= candles[-1][4] / spot <= 3.5:
                    continue
            return identity, {
                "id": identity, "symbol": symbol, "coingeckoId": cg_id,
                "quoteCurrency": "USD", "timeframe": "1mo",
                "source": "Yahoo Finance · " + symbol + " · OHLC mensile verificato per nome",
                "first": candles[0][0], "last": candles[-1][0],
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "candles": candles, "partial": False,
            }
        except (HTTPError, URLError, OSError, ValueError, TypeError,
                IndexError, KeyError, OverflowError):
            continue
    return None



def cryptocompare_catalog():
    """One symbol/name map; a ticker match alone is never accepted."""
    url = "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
    try:
        with urlopen(Request(url, headers=HEADERS), timeout=24) as response:
            data = json.load(response)
        listing = data.get("Data") if isinstance(data, dict) else None
        return listing if isinstance(listing, dict) else {}
    except (HTTPError, URLError, OSError, ValueError, TypeError):
        return {}


def cryptocompare_verified_candidate(target, market, listing):
    """Exact CoinGecko/CC project-name agreement + spot-price plausibility."""
    identity, ticker, label, cg_id = target
    if not re.fullmatch(r"[A-Z][A-Z0-9]{2,14}", ticker):
        return None
    if market.get("coingeckoId") != cg_id:
        return None
    item = listing.get(ticker)
    if not isinstance(item, dict):
        return None
    expected = clean_project_name(market.get("name") or label)
    actual = clean_project_name(item.get("CoinName") or item.get("FullName"))
    if len(expected) < 5 or actual != expected:
        return None
    url = "https://min-api.cryptocompare.com/data/v2/histoday?" + urlencode({
        "fsym": ticker, "tsym": "USD", "limit": 2000, "aggregate": 1,
        "extraParams": "VertexGlobalCryptoHistory",
    })
    try:
        with urlopen(Request(url, headers=HEADERS), timeout=15) as response:
            payload = json.load(response)
        if not isinstance(payload, dict) or payload.get("Response") != "Success":
            return None
        envelope = payload.get("Data") or {}
        rows = envelope.get("Data") if isinstance(envelope, dict) else []
        if not isinstance(rows, list):
            return None
        candles = normalise([
            [row.get("time"), row.get("open"), row.get("high"),
             row.get("low"), row.get("close")]
            for row in rows if isinstance(row, dict)
        ])
        if len(candles) < 2:
            return None
        # A real recent daily close should be reasonably consistent with the
        # *same* coin's verified CoinGecko quote, excluding wrong ticker reuse.
        spot = positive(market.get("value"))
        recent = candles[-1][0] >= int(datetime.now(timezone.utc).timestamp()) - 3 * 86400
        if spot and recent and not 0.2 <= candles[-1][4] / spot <= 5:
            return None
        return identity, {
            "id": identity, "symbol": ticker + "/USD", "coingeckoId": cg_id,
            "quoteCurrency": "USD", "timeframe": "1d",
            "source": "CryptoCompare · USD · OHLC giornaliero aggregato verificato per nome",
            "partial": True, "historyDays": 2000,
            "first": candles[0][0], "last": candles[-1][0],
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "candles": candles,
        }
    except (HTTPError, URLError, OSError, ValueError, TypeError, OverflowError):
        return None


def collect_screenshot_histories():
    """Preserve 365-day and 30-day *real* OHLC separately.

    Free CoinGecko: 365 days => approximately 4-day candles, 30 days =>
    approximately 4-hour candles. Neither is falsely called all-time or 1m.
    """
    targets = screenshot_targets()
    kept = {}
    for identity, ticker, label, coin_id in targets:
        path = OUT / (identity + ".json")
        prior = existing_history(path)
        if prior and prior.get("id") == identity and prior.get("coingeckoId") == coin_id:
            kept[identity] = prior
    changes, covered = 0, 0
    names = verified_coin_names()
    eligible = [target for target in targets if target[0] not in kept or
                (kept[target[0]].get("timeframe") != "1mo" or
                 not recently_captured(kept[target[0]].get("capturedAt")))]
    matched = 0
    with ThreadPoolExecutor(max_workers=9) as executor:
        jobs = [executor.submit(yahoo_extended_candidate, target,
                                names.get(target[0], {})) for target in eligible]
        for job in as_completed(jobs):
            result = job.result()
            if not result:
                continue
            identity, source_data = result
            previous = kept.get(identity)
            if previous and len(previous.get("candles") or []) >= 2 and (
                previous["candles"][0][0] < source_data["candles"][0][0]
            ):
                continue
            kept[identity] = source_data
            (OUT / (identity + ".json")).write_text(
                json.dumps(source_data, ensure_ascii=False, separators=(",", ":")) + "\n",
                encoding="utf-8")
            changes += 1
            matched += 1
    print("Yahoo token identities verified:", matched, "/", len(eligible))
    cc_catalog = cryptocompare_catalog()
    cc_targets = [target for target in targets if (
        target[0] not in kept or kept[target[0]].get("timeframe") not in ("1mo", "1d")
    )]
    cc_matches = 0
    if cc_catalog:
        with ThreadPoolExecutor(max_workers=8) as executor:
            jobs = [executor.submit(cryptocompare_verified_candidate, target,
                                    names.get(target[0], {}), cc_catalog)
                    for target in cc_targets]
            for job in as_completed(jobs):
                result = job.result()
                if not result:
                    continue
                identity, source_data = result
                previous = kept.get(identity)
                if previous and len(previous.get("candles") or []) >= 2 and (
                    previous["candles"][0][0] < source_data["candles"][0][0]
                ):
                    continue
                kept[identity] = source_data
                (OUT / (identity + ".json")).write_text(
                    json.dumps(source_data, ensure_ascii=False, separators=(",", ":")) + "\n",
                    encoding="utf-8")
                cc_matches += 1
                changes += 1
    print("CryptoCompare validated historical assets:", cc_matches, "/", len(cc_targets))

    # Fetch the largest available window for *every* requested crypto first.
    # If the provider stops responding, no subset is permanently privileged.
    for days in (365, 30):
        for identity, ticker, label, coin_id in targets:
            if _cg_blocked:
                break
            prior = kept.get(identity)
            key = "candles" if days == 365 else "recentCandles"
            stamp = "capturedAt" if days == 365 else "recentCapturedAt"
            if prior and prior.get("timeframe") in ("1mo", "1d") and len(prior.get("candles") or []) >= 2:
                continue
            if prior and len(prior.get(key) or []) >= 2 and recently_captured(prior.get(stamp)):
                continue
            candles = coingecko_ohlc(coin_id, days)
            if len(candles) < 2:
                continue
            if not prior:
                prior = {
                    "id": identity, "symbol": ticker,
                    "coingeckoId": coin_id, "quoteCurrency": "USD",
                    "source": "CoinGecko · OHLC verificato in USD",
                    "partial": True, "historyDays": 365,
                    "timeframe": "4d",
                    "candles": [], "recentCandles": [],
                }
            if days == 365:
                prior.update({
                    "candles": candles, "first": candles[0][0], "last": candles[-1][0],
                    "capturedAt": datetime.now(timezone.utc).isoformat(),
                })
            else:
                prior.update({
                    "recentCandles": candles, "recentTimeframe": "4h",
                    "recentCapturedAt": datetime.now(timezone.utc).isoformat(),
                })
            kept[identity] = prior
            (OUT / (identity + ".json")).write_text(
                json.dumps(prior, ensure_ascii=False, separators=(",", ":")) + "\n",
                encoding="utf-8")
            changes += 1
        if _cg_blocked:
            break

    for identity, _, _, _ in targets:
        existing = kept.get(identity)
        if existing and (len(existing.get("candles") or []) >= 2 or
                         len(existing.get("recentCandles") or []) >= 2):
            covered += 1
    print("Screenshot crypto OHLC:", covered, "/", len(targets),
          "with verified history;", changes, "updated datasets.")
    return covered, len(targets)

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
    extra_covered, extra_total = collect_screenshot_histories()
    print("Crypto ALL history:", changes, "core updates,",
          len(unavailable), "core assets unavailable out of", len(CRYPTO),
          "; screenshot history", extra_covered, "/", extra_total)
    for error in unavailable:
        print("Not available:", error)


if __name__ == "__main__":
    main()
