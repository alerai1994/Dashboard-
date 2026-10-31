#!/usr/bin/env python3
"""Collect latest published SEC RSS/Atom headlines, retaining prior items as an archive."""
from __future__ import annotations
import datetime as dt
import email.utils
import gzip
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "sec-news.json"
SOURCES = [
    ("press", "https://www.sec.gov/news/pressreleases.rss"),
    ("speeches", "https://www.sec.gov/news/speeches-statements.rss"),
    ("testimony", "https://www.sec.gov/news/testimony.rss"),
    ("litigation", "https://www.sec.gov/enforcement-litigation/litigation-releases/rss"),
    ("administrative", "https://www.sec.gov/enforcement-litigation/administrative-proceedings/rss"),
    ("suspensions", "https://www.sec.gov/enforcement-litigation/trading-suspensions/rss"),
    ("rules", "https://www.sec.gov/rss/rules/proposed.xml"),
    ("investors", "https://www.sec.gov/rss/investor/alertsandbulletins.xml"),
    ("edgar", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&count=100&output=atom"),
]
UA = "VertexGlobalDashboard/1.0 (+https://github.com/alerai1994/Dashboard-)"
NS = "{http://www.w3.org/2005/Atom}"

def fetch(url):
    request = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
        "Accept-Encoding": "gzip", "Connection": "close"
    })
    with urllib.request.urlopen(request, timeout=24) as response:
        data = response.read(2_500_000)
        if response.headers.get("Content-Encoding", "").lower() == "gzip":
            data = gzip.decompress(data)
        return data

def clean(value):
    if not value:
        return ""
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    return " ".join(value.split()).strip()

def iso_date(value):
    if not value:
        return ""
    try:
        date = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            date = email.utils.parsedate_to_datetime(value)
        except (ValueError, TypeError, IndexError):
            return ""
    if date.tzinfo is None:
        date = date.replace(tzinfo=dt.timezone.utc)
    return date.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")

def legit(url):
    try:
        parsed = urllib.parse.urlparse(url.strip())
        return parsed.scheme == "https" and (
            parsed.hostname in {"sec.gov", "www.sec.gov", "investor.gov", "www.investor.gov"}
            or parsed.hostname and (parsed.hostname.endswith(".sec.gov") or parsed.hostname.endswith(".investor.gov"))
        )
    except ValueError:
        return False

def child_text(element, *names):
    for name in names:
        child = element.find(name)
        if child is not None and child.text:
            return child.text.strip()
    return ""

def entries(content, category):
    root = ET.fromstring(content)
    items = root.findall(".//item")
    atom = False
    if not items:
        items = root.findall(".//" + NS + "entry")
        atom = True
    result = []
    for node in items:
        if atom:
            title = child_text(node, NS + "title")
            date = child_text(node, NS + "published", NS + "updated")
            summary = child_text(node, NS + "summary")
            link = ""
            for elem in node.findall(NS + "link"):
                if elem.get("rel", "alternate") == "alternate":
                    link = elem.get("href", "")
                    if link:
                        break
        else:
            title = child_text(node, "title")
            date = child_text(node, "pubDate", "{http://purl.org/dc/elements/1.1/}date")
            summary = child_text(node, "description")
            link = child_text(node, "link")
        date = iso_date(date)
        title = clean(title)[:290]
        summary = clean(summary)[:230]
        link = urllib.parse.urljoin("https://www.sec.gov/", link)
        if title and date and legit(link):
            result.append({"title": title, "date": date, "url": link,
                           "category": category, "summary": summary})
    return result

def main():
    prior = {}
    if DEST.exists():
        try:
            prior = json.loads(DEST.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    all_items = prior.get("items", []) if isinstance(prior.get("items"), list) else []
    successful = []
    for category, url in SOURCES:
        try:
            records = entries(fetch(url), category)
            if records:
                all_items.extend(records)
                successful.append(category)
                print(f"{category}: {len(records)}")
            else:
                print(f"{category}: valid empty feed", file=sys.stderr)
        except Exception as exc:
            print(f"{category}: {type(exc).__name__}: {exc}", file=sys.stderr)
        time.sleep(0.7)
    if not successful:
        print("All SEC feeds unavailable; keeping previous verified data.")
        return
    seen = {}
    for item in all_items:
        if not isinstance(item, dict):
            continue
        link = item.get("url", "")
        if not legit(link):
            continue
        category = item.get("category", "press")
        title = clean(item.get("title", ""))[:290]
        date = iso_date(item.get("date", ""))
        if not title or not date:
            continue
        record = {"category": category, "title": title,
                  "url": link, "date": date, "summary": clean(item.get("summary", ""))[:230]}
        key = (link.split("#")[0], category)
        if key not in seen or date > seen[key]["date"]:
            seen[key] = record
    ordered = sorted(seen.values(), key=lambda item: item["date"], reverse=True)[:800]
    payload = {
        "source": "U.S. Securities and Exchange Commission",
        "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "seed_date": prior.get("seed_date"),
        "feeds_updated": successful,
        "items": ordered
    }
    DEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(ordered)} SEC items from {len(successful)} feeds.")

if __name__ == "__main__":
    main()
