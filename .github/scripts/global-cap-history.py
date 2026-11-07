#!/usr/bin/env python3
"""Verified historical global cryptocurrency market capitalisation for Vertex.

TOTAL, TOTAL2 and TOTAL3: Santiment aggregate daily market-cap observations.
TOTALDEFI: CoinPaprika DeFi sector historical market-cap observations.
The distinct CoinGecko DeFi aggregate snapshot history is kept separately.
This feed never invents OHLC candles or extrapolates missing market history.
"""
import json
import math
import runpy
import urllib.request
import re
from html.parser import HTMLParser
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
        sources = old.get("sources", {})
        if not isinstance(rows, dict):
            rows = {}
        if not isinstance(sources, dict):
            sources = {}
        return rows, sources
    except (ValueError, OSError, TypeError, AttributeError):
        return {}, {}


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



class VisibleHTML(HTMLParser):
    """Extract text from a public source without executing third-party scripts."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tokens = []
        self.hidden_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "template", "svg"):
            self.hidden_depth += 1
        if tag in ("tr", "td", "th", "p", "div", "h2", "h3", "h4"):
            self.tokens.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "template", "svg"):
            self.hidden_depth = max(0, self.hidden_depth - 1)
        if tag in ("tr", "td", "th", "p", "div", "h2", "h3", "h4"):
            self.tokens.append(" ")

    def handle_data(self, data):
        if not self.hidden_depth:
            self.tokens.append(data)

    def text(self):
        return re.sub(r"\s+", " ", " ".join(self.tokens))


def coinpaprika_defi_history(now):
    """Observed DeFi sector totals at the end of each closed UTC day.

    CoinPaprika's publicly displayed DeFi sector is *not* the same
    constituent universe as the CoinGecko global DeFi aggregate shown in
    the pill. The two series must never be joined or blended.
    """
    pages = (
        "https://coinpaprika.com/categories/defi",
        "https://coinpaprika.com/it/categories/defi",
    )
    for url in pages:
        try:
            request = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; VertexGlobalMarket/1.0)",
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            })
            with urllib.request.urlopen(request, timeout=13) as response:
                body = response.read(5000000).decode("utf-8", "replace")
            parser = VisibleHTML()
            parser.feed(body)
            visible = parser.text()
            marker = visible.find("Sector totals at each point")
            if marker < 0:
                continue
            ending = visible.find("What's driving the move?", marker)
            if ending < 0:
                ending = visible.find("What’s driving the move?", marker)
            chart = visible[marker:ending] if ending > marker else visible[marker:marker + 5500]
            pattern = (
                r"(?<![\d-])(20\d{2}-\d{2}-\d{2})\s+"
                r"\$([\d,]+(?:\.\d+)?)([KMBT])\s+"
                r"\$[\d,]+(?:\.\d+)?[KMBT]\s+"
                r"\$[\d,]+(?:\.\d+)?[KMBT]"
            )
            multiplier = {"K": 1e3, "M": 1e6, "B": 1e9, "T": 1e12}
            result = []
            for match in re.finditer(pattern, chart, re.IGNORECASE):
                day, amount, unit = match.groups()
                timestamp = int(datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp() * 1000)
                cap = positive(amount.replace(",", ""))
                if not cap:
                    continue
                value = cap * multiplier[unit.upper()]
                if value < 1e8 or value > 1e13:
                    continue
                result.append([timestamp, value])
            result = normalize_points(result)
            if len(result) < 7 or result[-1][0] < int((now - timedelta(days=5)).timestamp() * 1000):
                print("CoinPaprika sector rows insufficient or stale:", len(result))
                continue
            print("CoinPaprika actual DeFi sector daily history:", len(result),
                  datetime.fromtimestamp(result[0][0]/1000, timezone.utc).date(),
                  datetime.fromtimestamp(result[-1][0]/1000, timezone.utc).date())
            return result
        except (ValueError, OSError, TimeoutError, TypeError) as exc:
            print("CoinPaprika DeFi market-cap history unavailable:", str(exc)[:180])
    return []

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
    previous, old_sources = old_history()
    now = datetime.now(timezone.utc)
    all_series = {key: normalize_points(previous.get(key, [])) for key in SANTIMENT_METRICS}
    # Never mix data for different index methodologies.
    # TradingView CRYPTOCAP:TOTALDEFI != CoinPaprika sector != CoinGecko DeFi.
    old_method = str(old_sources.get("TOTALDEFI", ""))
    is_tv = "CRYPTOCAP:TOTALDEFI" in old_method
    is_cp = "CoinPaprika" in old_method
    all_series["TOTALDEFI_CG"] = normalize_points(previous.get("TOTALDEFI_CG", []) +
        (previous.get("TOTALDEFI", []) if not is_tv and not is_cp else []))
    cp_prev = previous.get("TOTALDEFI_CP", [])
    if is_cp:
        cp_prev = cp_prev + previous.get("TOTALDEFI", [])
    all_series["TOTALDEFI_CP"] = normalize_points(cp_prev)
    all_series["TOTALDEFI"] = normalize_points(previous.get("TOTALDEFI", [])) if is_tv else []
    prior_ohlc = {}
    try:
        old_payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
        prior_ohlc = old_payload.get("ohlc", {}) if isinstance(old_payload, dict) else {}
    except (ValueError, OSError):
        pass
    if not isinstance(prior_ohlc, dict):
        prior_ohlc = {}
    if not is_tv:
        prior_ohlc.pop("TOTALDEFI", None)
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
    sector = coinpaprika_defi_history(now)
    if sector:
        all_series["TOTALDEFI_CP"] = normalize_points(all_series["TOTALDEFI_CP"] + sector)
    # Fetch genuine daily index OHLC, not an approximate basket or a DeFi TVL.
    # We only switch to the TradingView series if it covers the requested decade.
    bars = []
    try:
        source_path = ROOT / ".github/scripts/tv-totaldefi-ohlc.py"
        bars = runpy.run_path(str(source_path))["get_totaldefi_ohlc"]()
    except Exception as exc:
        print("TOTALDEFI native index OHLC unavailable:", type(exc).__name__, str(exc)[:200])
    earliest_required = int(datetime(2018, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
    latest_required = int(datetime(2026, 10, 20, tzinfo=timezone.utc).timestamp() * 1000)
    if len(bars) >= 2000 and bars[0][0] < earliest_required and bars[-1][0] > latest_required:
        prior_ohlc["TOTALDEFI"] = bars
        all_series["TOTALDEFI"] = normalize_points([[bar[0], bar[4]] for bar in bars])
        print("Confirmed CRYPTOCAP:TOTALDEFI full index history:", len(bars))
    elif bars:
        print("TradingView supplied only partial index history; not replacing verified data.")
    if not all_series["TOTALDEFI"]:
        # For legacy clients keep the verified CoinPaprika sample but never
        # label or merge it with the TradingView CRYPTOCAP index.
        all_series["TOTALDEFI"] = all_series["TOTALDEFI_CP"][:]
    try:
        new_defi = read_defi_cap()
        all_series["TOTALDEFI_CG"] = normalize_points(all_series["TOTALDEFI_CG"] + [new_defi])
    except (OSError, ValueError, TypeError) as exc:
        print("TOTALDEFI CoinGecko snapshot unavailable:", str(exc)[:190])
    payload = {
        "updatedAt": now.isoformat(),
        "sources": {
            "TOTAL": "Santiment · daily market cap observations",
            "TOTAL2": "Santiment · daily market cap observations",
            "TOTAL3": "Santiment · daily market cap observations",
            "TOTALDEFI": ("TradingView CRYPTOCAP:TOTALDEFI · real daily index OHLC · top 125 DeFi assets"
              if all_series["TOTALDEFI"] and "TOTALDEFI" in prior_ohlc
              else "CoinPaprika · DeFi sector cap (not CRYPTOCAP TOTALDEFI; partial history)"),
            "TOTALDEFI_CP": "CoinPaprika · independently calculated DeFi sector market cap",
            "TOTALDEFI_CG": "CoinGecko · global DeFi market cap observations, recorded from 7 Nov 2026",
        },
        "series": all_series,
        "ohlc": prior_ohlc,
        "interval": "Actual source OHLC when present; no manufactured candles",
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
