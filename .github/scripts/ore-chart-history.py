#!/usr/bin/env python3
"""Preserve genuine ORE/USDT LBank spot OHLC candles for Vertex charts.

Static same-origin JSON lets the browser display ORE when direct exchange
requests are blocked by CORS. Never manufacture candles or forward stale bars
as if they were live; each interval carries its own actual last trade time.
"""
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OUTPUT = Path("ore-chart-history.json")
PAIR = "ore_usdt"
MINT = "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp"
DOMAINS = ("https://api.lbank.info", "https://api.lbkex.com",
           "https://api.lbank.com")
RESOLUTIONS = {
    "minute1": 60, "minute5": 300, "minute15": 900,
    "hour1": 3600, "hour4": 14400, "hour8": 28800,
    "day1": 86400,  # true daily OHLC for maximum available ORE history
}
SIZE = 800


def parse_rows(payload, name, now):
    if isinstance(payload, dict):
        if str(payload.get("error_code", 0)) not in ("0", "None"):
            raise ValueError("LBank exchange API error")
        if str(payload.get("result", "true")).lower() not in ("true", "1"):
            raise ValueError("Unsuccessful exchange response")
        rows = payload.get("data")
    else:
        rows = payload
    if not isinstance(rows, list):
        raise ValueError("Missing genuine candle data")
    cleaned = {}
    for row in rows:
        if not isinstance(row, (list, tuple)) or len(row) < 5:
            continue
        try:
            t = int(float(row[0]))
            if t >= 10**12:
                t //= 1000
            o, h, l, c = [float(v) for v in row[1:5]]
        except (TypeError, ValueError, OverflowError):
            continue
        if not all(math.isfinite(v) for v in (o, h, l, c)):
            continue
        if not (o > 0 and l > 0 and h >= max(o, c) and l <= min(o, c)):
            continue
        if not (946684800 <= t <= now + RESOLUTIONS[name]):
            continue
        cleaned[t] = [t, o, h, l, c]
    values = [cleaned[t] for t in sorted(cleaned)]
    if len(values) < 2:
        raise ValueError("Too few verified candles")
    return values[-SIZE:]


def fetch(name, seconds, now):
    params = urlencode({
        "symbol": PAIR,
        "type": name,
        "size": SIZE,
        "time": max(946684800, now - seconds * (SIZE + 2)),
    })
    errors = []
    for domain in DOMAINS:
        url = domain + "/v2/kline.do?" + params
        try:
            req = Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; VertexORECharts/1.0)",
            })
            with urlopen(req, timeout=11) as response:
                payload = json.load(response)
            return {
                "candles": parse_rows(payload, name, now),
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "venue": "LBank Spot",
                "source": domain,
            }
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as error:
            errors.append(domain + ": " + str(error))
    raise RuntimeError("; ".join(errors))


def previous():
    try:
        saved = json.loads(OUTPUT.read_text(encoding="utf-8"))
        if saved.get("mint") == MINT and saved.get("pair") == "ORE/USDT":
            return saved.get("sets", {})
    except (OSError, ValueError, AttributeError, TypeError):
        pass
    return {}


def main():
    old = previous()
    sets = {}
    failures = []
    now = int(time.time())
    for name, seconds in RESOLUTIONS.items():
        try:
            sets[name] = fetch(name, seconds, now)
            print(name, "verified:", len(sets[name]["candles"]),
                  "bars, last:", sets[name]["candles"][-1][0])
        except (OSError, RuntimeError, ValueError) as error:
            failures.append(name + ": " + str(error))
            entry = old.get(name)
            if isinstance(entry, dict) and isinstance(entry.get("candles"), list) and len(entry["candles"]) >= 2:
                sets[name] = entry
    if not sets:
        print("ORE OHLC unavailable. Previous file unchanged. " + "; ".join(failures), file=sys.stderr)
        return 1
    doc = {
        "mint": MINT,
        "pair": "ORE/USDT",
        "venue": "LBank Spot",
        "sets": sets,
    }
    text = json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"
    if OUTPUT.exists() and OUTPUT.read_text(encoding="utf-8") == text:
        print("ORE snapshot unchanged.")
        return 0
    OUTPUT.write_text(text, encoding="utf-8")
    print("ORE chart snapshot saved, verified sets:", len(sets),
          "fallback sets:", len(failures))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
