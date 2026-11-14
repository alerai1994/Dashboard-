#!/usr/bin/env python3
"""Historical *observed prices* for crypto without published OHLC.

DefiLlama's CoinGecko-ID price chart is a price-time series, NOT OHLC.
Do not manufacture opens/highs/lows from observed prices. Only save >=2
real observations for the exact catalog identifier. Keeps past snapshots
when network APIs are unavailable or rate limited.
"""
from __future__ import annotations

import json
import math
import re
import runpy
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "chart-history" / "crypto" / "prices"
CONFIG = runpy.run_path(str(ROOT / ".github/scripts/crypto-all-history.py"))
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "VertexHistoricalPrices/2.0",
}

def targets():
    original = list(CONFIG["CONFIG"]["CRYPTO"])
    seen = set()
    results = []
    for ident, coin in original:
        if ident == "ore":
            continue
        if ident not in seen and re.fullmatch(r"[a-z0-9-]+", coin):
            seen.add(ident)
            results.append((ident, coin))
    for ident, _symbol, _name, coin in CONFIG["screenshot_targets"]():
        if ident not in seen:
            seen.add(ident)
            results.append((ident, coin))
    return results

def valid_ohlc(path):
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        return isinstance(obj, dict) and (
            len(obj.get("candles") or []) >= 2 or
            len(obj.get("recentCandles") or []) >= 2
        )
    except (OSError, ValueError, TypeError):
        return False

def valid_price_archive(path, ident, coin):
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        if obj.get("id") != ident or obj.get("coingeckoId") != coin:
            return False
        pts = obj.get("points")
        if not isinstance(pts, list) or len(pts) < 2:
            return False
        stamp = datetime.fromisoformat(obj["capturedAt"].replace("Z", "+00:00"))
        return datetime.now(timezone.utc) - stamp < timedelta(hours=24)
    except (OSError, ValueError, TypeError, KeyError):
        return False

def normalize_prices(rows):
    parsed = {}
    max_ts = int(datetime.now(timezone.utc).timestamp()) + 86400
    if not isinstance(rows, list):
        return []
    for row in rows:
        if isinstance(row, dict):
            ts = row.get("timestamp")
            price = row.get("price")
        elif isinstance(row, (list, tuple)) and len(row) >= 2:
            ts, price = row[:2]
        else:
            continue
        try:
            ts = int(float(ts))
            price = float(price)
        except (ValueError, TypeError, OverflowError):
            continue
        if not 946684800 <= ts <= max_ts or not math.isfinite(price) or price <= 0:
            continue
        parsed[ts] = [ts, float(f"{price:.12g}")]
    return [parsed[t] for t in sorted(parsed)]

def request_group(batch, start):
    ids = ["coingecko:" + coin for _ident, coin in batch]
    url = ("https://coins.llama.fi/chart/" +
           quote(",".join(ids), safe=":,") + "?" +
           urlencode({"start": start, "span": 365, "period": "1d"}))
    try:
        with urlopen(Request(url, headers=HEADERS), timeout=26) as resp:
            payload = json.load(resp)
        result = payload.get("coins", {}) if isinstance(payload, dict) else {}
        if not isinstance(result, dict):
            return {}
        return {
            ident: normalize_prices((result.get("coingecko:" + coin) or {}).get("prices"))
            for ident, coin in batch
        }
    except HTTPError as exc:
        try:
            detail = exc.read(600).decode("utf-8", "replace")
        except (OSError, UnicodeError):
            detail = ""
        print("DefiLlama price batch HTTP", exc.code, "count", len(batch),
              "detail", detail[:250])
        if len(batch) > 1 and exc.code in (400, 404, 422):
            middle = len(batch) // 2
            first = request_group(batch[:middle], start)
            second = request_group(batch[middle:], start)
            return {**first, **second}
        return {}
    except (URLError, OSError, TypeError, ValueError) as exc:
        print("DefiLlama price batch unavailable:", type(exc).__name__, str(exc)[:120])
        return {}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    all_assets = targets()
    waiting = [
        (ident, coin) for ident, coin in all_assets
        if not valid_ohlc(ROOT / "chart-history" / "crypto" / (ident + ".json"))
        and not valid_price_archive(OUT / (ident + ".json"), ident, coin)
    ]
    print("Price-only historical fallback:", len(waiting), "candidates among", len(all_assets))
    if not waiting:
        return
    start = int((datetime.now(timezone.utc) - timedelta(days=365)).timestamp())
    succeeded = 0
    for n in range(0, len(waiting), 8):
        group = waiting[n:n+8]
        results = request_group(group, start)
        for ident, coin in group:
            points = results.get(ident) or []
            if len(points) < 2:
                continue
            out = {
                "id": ident, "coingeckoId": coin,
                "source": "DefiLlama · prezzi storici osservati in USD",
                "kind": "observed-price-line", "currency": "USD",
                "resolution": "1d", "partial": True,
                "first": points[0][0], "last": points[-1][0],
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "points": points,
            }
            (OUT / (ident + ".json")).write_text(
                json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n",
                encoding="utf-8")
            succeeded += 1
        time.sleep(0.6)
    print("Price-only historical fallback:", succeeded, "new verified series")
    print("No data -> NO invented curves; display unavailability in Vertex.")

if __name__ == "__main__":
    main()
