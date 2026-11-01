#!/usr/bin/env python3
"""Fetch actual ORE/USDT spot depth; never synthesize order-book levels."""
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OUTPUT = Path("ore-orderbook.json")
MINT = "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp"
URLS = (
    "https://api.lbank.info/v2/depth.do?symbol=ore_usdt&size=20",
    "https://api.lbkex.com/v2/depth.do?symbol=ore_usdt&size=20",
    "https://api.lbank.com/v2/depth.do?symbol=ore_usdt&size=20",
)

def read_depth(url):
    request = Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; VertexGlobalOrderBook/1.0)",
    })
    with urlopen(request, timeout=14) as response:
        payload = json.load(response)
    if not isinstance(payload, dict):
        raise ValueError("Payload not an object")
    if payload.get("error_code") not in (None, 0, "0"):
        raise ValueError("LBank returned an error")
    if str(payload.get("result", "true")).lower() not in ("true", "1"):
        raise ValueError("LBank returned unsuccessful result")
    depth = payload.get("data", payload)
    if not isinstance(depth, dict):
        raise ValueError("Depth not an object")
    def levels(key, reverse):
        rows = depth.get(key)
        if not isinstance(rows, list):
            raise ValueError("Missing " + key)
        result = []
        for row in rows:
            if not isinstance(row, (list, tuple)) or len(row) < 2:
                continue
            try:
                price, qty = float(row[0]), float(row[1])
            except (TypeError, ValueError):
                continue
            if math.isfinite(price) and math.isfinite(qty) and price > 0 and qty > 0:
                result.append([price, qty])
        result.sort(key=lambda row: row[0], reverse=reverse)
        return result[:20]
    bids, asks = levels("bids", True), levels("asks", False)
    if not bids or not asks or bids[0][0] >= asks[0][0]:
        raise ValueError("Missing or crossed order book")
    stamp = depth.get("timestamp") or payload.get("ts")
    if stamp is not None:
        try:
            millis = float(stamp)
            if millis < 1e11:
                millis *= 1000
            age = abs(datetime.now(timezone.utc).timestamp() * 1000 - millis)
            if age > 600000:
                raise ValueError("Old source timestamp")
        except (TypeError, ValueError) as err:
            raise ValueError("Invalid source timestamp") from err
    return {"mint": MINT, "venue": "LBank Spot", "pair": "ORE/USDT",
            "unit": "ORE", "bids": bids, "asks": asks,
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "source": url.split("/v2/")[0]}

def main():
    errors = []
    for url in URLS:
        try:
            data = read_depth(url)
            OUTPUT.write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
            print("Verified live ORE book:", len(data["bids"]), "bids", len(data["asks"]), "asks", data["source"])
            return 0
        except (HTTPError, URLError, OSError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            errors.append(url.split("/v2/")[0] + ": " + str(exc))
    print("No verified LBank order book; previous snapshot left unchanged. " + "; ".join(errors), file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
