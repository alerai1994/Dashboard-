#!/usr/bin/env python3
"""Verified historical global cryptocurrency market capitalisation for Vertex.

TOTAL, TOTAL2 and TOTAL3: Santiment aggregate daily market-cap observations.
TOTALDEFI: daily CoinGecko DeFi market-cap snapshots recorded from now onward.
This feed never invents OHLC candles or extrapolates missing market history.
"""
import json
import math
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "global-cap-history.json"
SANTIMENT_METRICS = {
    "TOTAL": "total_market_marketcap_usd",
    "TOTAL2": "total_market_2_marketcap_usd",
    "TOTAL3": "total_market_3_marketcap_usd",
}
MINIMUM = datetime(2013, 1, 1, tzinfo=timezone.utc)
HEADERS = {"User-Agent": "VertexGlobal/1.0 (GitHub Pages)", "Accept": "application/json"}


def positive(value):
    try:
        value = float(value)
        return value if math.isfinite(value) and value > 0 else None
    except (ValueError, TypeError, OverflowError):
        return None


def old_history():
    try:
        old = json.loads(OUTPUT.read_text(encoding="utf-8"))
        rows = old.get("series", {})
        return {key: rows.get(key, []) for key in (*SANTIMENT_METRICS, "TOTALDEFI")}
    except (ValueError, OSError, TypeError, AttributeError):
        return {key: [] for key in (*SANTIMENT_METRICS, "TOTALDEFI")}


def normalize_points(rows):
    cleaned = {}
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, (list, tuple)) or len(row) != 2:
            continue
        try:
            stamp = int(row[0])
        except (TypeError, ValueError):
            continue
        value = positive(row[1])
        if stamp < 1356998400000 or value is None:
            continue
        cleaned[stamp] = [stamp, round(value, 2)]
    return [cleaned[key] for key in sorted(cleaned)]


def santiment_history(metric, start, end):
    # Raw GraphQL format is officially documented at academy.santiment.net.
    query = (
        '{ getMetric(metric: "' + metric + '") { '
        'timeseriesDataJson(slug: "total_market", '
        'from: "' + start.isoformat().replace("+00:00", "Z") + '", '
        'to: "' + end.isoformat().replace("+00:00", "Z") + '", '
        'interval: "1d") } }'
    )
    request = urllib.request.Request(
        "https://api.santiment.net/graphql",
        data=query.encode("utf-8"),
        headers={**HEADERS, "Content-Type": "application/graphql"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=24) as response:
        body = json.load(response)
    if body.get("errors"):
        raise ValueError("; ".join(str(e.get("message", ""))[:160] for e in body["errors"][:2]))
    rows = (body.get("data", {}).get("getMetric") or {}).get("timeseriesDataJson")
    if isinstance(rows, str):
        rows = json.loads(rows)
    if not isinstance(rows, list):
        return []
    points = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        value = positive(item.get("value"))
        when = item.get("datetime")
        if value is None or not isinstance(when, str):
            continue
        try:
            date = datetime.fromisoformat(when.replace("Z", "+00:00"))
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            stamp = int(date.timestamp() * 1000)
        except (TypeError, OverflowError, ValueError):
            continue
        points.append([stamp, value])
    return normalize_points(points)


def read_defi_cap():
    request = urllib.request.Request(
        "https://api.coingecko.com/api/v3/global/decentralized_finance_defi",
        headers=HEADERS,
    )
    with urllib.request.urlopen(request, timeout=14) as response:
        body = json.load(response)
    value = positive((body.get("data") or {}).get("defi_market_cap"))
    if value is None:
        raise ValueError("No verified CoinGecko DeFi market capitalisation")
    # Observation recorded at the actual ingestion time; not a backfilled date.
    stamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    return [stamp, value]


def main():
    previous = old_history()
    all_series = {key: normalize_points(previous.get(key, [])) for key in (*SANTIMENT_METRICS, "TOTALDEFI")}
    now = datetime.now(timezone.utc)
    # Subscription-dependent historical depth: never claim data earlier than returned.
    for name, metric in SANTIMENT_METRICS.items():
        old = all_series[name]
        start = MINIMUM if not old else max(MINIMUM, datetime.fromtimestamp(old[-1][0] / 1000, timezone.utc) - timedelta(days=4))
        refreshed = []
        for attempt_start in [start, now - timedelta(days=365), now - timedelta(days=90), now - timedelta(days=30)]:
            if attempt_start > now - timedelta(days=2):
                continue
            try:
                refreshed = santiment_history(metric, attempt_start, now)
                if refreshed:
                    break
            except (OSError, ValueError, TypeError) as exc:
                print(name, "Santiment unavailable:", str(exc)[:190])
        if refreshed:
            all_series[name] = normalize_points(old + refreshed)
        print(name, len(all_series[name]), "observations")
    try:
        new_defi = read_defi_cap()
        all_series["TOTALDEFI"] = normalize_points(all_series["TOTALDEFI"] + [new_defi])
    except (OSError, ValueError, TypeError) as exc:
        print("TOTALDEFI snapshot unavailable:", str(exc)[:190])
    payload = {
        "updatedAt": now.isoformat(),
        "sources": {
            "TOTAL": "Santiment · daily market cap observations",
            "TOTAL2": "Santiment · daily market cap observations",
            "TOTAL3": "Santiment · daily market cap observations",
            "TOTALDEFI": "CoinGecko · observed DeFi market cap snapshots (no earlier backfill)",
        },
        "series": all_series,
        "interval": "Observed values only, no manufactured OHLC or historical highs/lows",
    }
    old_valid = any(len(v) > 0 for v in all_series.values())
    if not old_valid:
        print("No verified history returned; preserving existing file.")
        return
    current = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    OUTPUT.write_text(current, encoding="utf-8")
    print("Saved genuine history", {k: len(v) for k, v in all_series.items()})


if __name__ == "__main__":
    main()
