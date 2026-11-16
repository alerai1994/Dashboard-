#!/usr/bin/env python3
"""Identity-verified quotes and logo URLs for the complete Vertex crypto heatmap.

Never match on ticker alone. Missing API data remain unavailable; previously
verified rows keep their original observation time and are not called LIVE.
"""
from __future__ import annotations

import json
import math
import re
import runpy
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/"crypto-heatmap-data.json"
BASE=runpy.run_path(str(ROOT/".github/scripts/market-data.py"))["CRYPTO"]
HEADERS={"Accept":"application/json","User-Agent":"VertexCryptoCatalogQuotes/1.0"}
HOSTS=("https://api.coingecko.com/api/v3","https://api.coingecko.com/api/v3")

def catalog():
    text=(ROOT/"crypto-extended.js").read_text(encoding="utf-8")
    match=re.search(r"window\.__VERTEX_EXTRA_CRYPTO__\s*=\s*(\[[\s\S]*?\]);",text)
    extra=json.loads(match.group(1)) if match else []
    coins={ident:cg for ident,cg in BASE}
    for row in extra:
        if not isinstance(row,list) or len(row)<3: continue
        symbol,cg=str(row[0]).strip(),str(row[2]).strip()
        if not re.fullmatch(r"[a-z0-9-]{1,100}",cg): continue
        ident=(symbol.lower() if re.fullmatch(r"[A-Z0-9_-]+",symbol) else
               "crypto-"+"-".join(format(ord(ch),"x") for ch in symbol))
        coins.setdefault(ident,cg)
    return coins

def positive(value):
    try:
        num=float(value)
        return num if math.isfinite(num) and num>0 else None
    except (TypeError,ValueError,OverflowError):
        return None

def previous():
    try:
        data=json.loads(OUTPUT.read_text(encoding="utf-8"))
        return {c["localId"]:c for c in data.get("coins",[]) if isinstance(c,dict) and
                isinstance(c.get("localId"),str)}
    except (OSError,TypeError,ValueError,KeyError):
        return {}

def verified_image(url):
    if not isinstance(url,str) or not url.startswith("https://"):return ""
    if not (url.startswith("https://coin-images.coingecko.com/") or
            url.startswith("https://assets.coingecko.com/")):return ""
    return url

def fetch_group(ids):
    query=urlencode({"vs_currency":"usd","ids":",".join(ids),
                     "order":"market_cap_desc","per_page":"250","page":"1",
                     "sparkline":"false","price_change_percentage":"24h"})
    req=Request(HOSTS[0]+"/coins/markets?"+query,headers=HEADERS)
    try:
        with urlopen(req,timeout=25) as response:
            data=json.load(response)
        return {x["id"]:x for x in data if isinstance(x,dict) and
                isinstance(x.get("id"),str)} if isinstance(data,list) else {}
    except HTTPError as error:
        print("CoinGecko batch HTTP",error.code,len(ids))
    except (URLError,OSError,ValueError,TypeError) as error:
        print("CoinGecko batch unavailable",type(error).__name__,len(ids))
    return {}

def fetch_missing_24h_changes(ids):
    """Query CoinGecko's independent 24h-change field for missing market rows.

    This is a provider-reported 24h percentage, not a calculation inferred
    from the market price or a 24h high/low. Failure remains None/neutral.
    """
    changes={}
    for offset in range(0,len(ids),50):
        subset=ids[offset:offset+50]
        query=urlencode({"ids":",".join(subset),"vs_currencies":"usd",
                         "include_24hr_change":"true"})
        req=Request(HOSTS[0]+"/simple/price?"+query,headers=HEADERS)
        try:
            with urlopen(req,timeout=22) as response:
                payload=json.load(response)
            if not isinstance(payload,dict):continue
            for ident in subset:
                row=payload.get(ident)
                raw=row.get("usd_24h_change") if isinstance(row,dict) else None
                try:
                    n=float(raw) if raw is not None else None
                    if n is not None and math.isfinite(n):changes[ident]=n
                except (ValueError,TypeError,OverflowError):pass
        except (HTTPError,URLError,OSError,ValueError,TypeError) as error:
            print("CoinGecko 24h change fallback unavailable:",type(error).__name__)
        if offset+50<len(ids):time.sleep(4.0)
    return changes


def observed_24h_change(coin_id, now_ts):
    """Compute an evidence-based change from time-stamped DefiLlama prices.

    Use an actual observation from approximately 24h ago and a recent last
    observation. No old cached percentage, fabricated price or daily high/low.
    """
    from urllib.parse import quote
    url=("https://coins.llama.fi/chart/"+quote("coingecko:"+coin_id,safe=":")
         +"?"+urlencode({"start":now_ts-28*3600,"span":32,"period":"1h"}))
    try:
        with urlopen(Request(url,headers=HEADERS),timeout=18) as response:
            payload=json.load(response)
        rows=((payload.get("coins") or {}).get("coingecko:"+coin_id) or {}).get("prices") or []
        samples={}
        for row in rows:
            try:
                stamp=int(float(row.get("timestamp")))
                value=positive(row.get("price"))
                if value is not None and now_ts-30*3600<=stamp<=now_ts+300:
                    samples[stamp]=value
            except (TypeError,ValueError,OverflowError,AttributeError):continue
        if len(samples)<2:return None
        last=max(samples)
        if now_ts-last>2*3600:return None
        target=last-24*3600
        earlier=min((t for t in samples if t<last),key=lambda t:abs(t-target),default=None)
        if earlier is None or abs(earlier-target)>2*3600:return None
        return (samples[last]/samples[earlier]-1.0)*100.0
    except (HTTPError,URLError,OSError,ValueError,TypeError) as error:
        print("DefiLlama 24h observed comparison unavailable:",coin_id,type(error).__name__)
        return None


def normalized(ident,cg,raw,now):
    price=positive(raw.get("current_price"))
    image=verified_image(raw.get("image"))
    if price is None and not image:return None
    movement=raw.get("price_change_percentage_24h")
    try:
        movement=float(movement) if movement is not None else None
        if movement is not None and not math.isfinite(movement):movement=None
    except (ValueError,TypeError,OverflowError):movement=None
    market_cap=positive(raw.get("market_cap"))
    volume=positive(raw.get("total_volume"))
    rank=raw.get("market_cap_rank")
    return {"localId":ident,"id":cg,"symbol":str(raw.get("symbol") or "").lower(),
            "name":str(raw.get("name") or "")[:120],
            "price":price,"change":movement,"marketCap":market_cap,"volume":volume,
            "rank":rank if isinstance(rank,int) and rank>0 else None,
            "image":image,"observedAt":now if price is not None else None,
            "source":"CoinGecko · coins/markets"}

def main():
    coins=catalog()
    assert len(coins)==288, f"Expected exactly 288 unique assets, found {len(coins)}"
    old=previous()
    now=datetime.now(timezone.utc).isoformat()
    result=dict(old)
    # Prioritize unresolved IDs first on each scheduled run. Public CoinGecko
    # requests can be throttled mid-catalog; repeating the first 150 IDs would
    # permanently starve the newest 100+ entries.
    unresolved={cg for ident,cg in coins.items() if ident not in old or
                old[ident].get("id")!=cg or not positive(old[ident].get("price")) or
                not verified_image(old[ident].get("image"))}
    cg_ids=sorted(set(coins.values()),key=lambda cg:(cg not in unresolved,cg))
    fetched=0
    for start in range(0,len(cg_ids),35):
        group=cg_ids[start:start+35]
        quotes=fetch_group(group)
        for ident,cg in coins.items():
            if cg not in quotes or cg not in group:continue
            item=normalized(ident,cg,quotes[cg],now)
            if item:
                previous_item=result.get(ident)
                if item["price"] is None and previous_item:
                    for key in ("price","change","observedAt","marketCap","volume","rank"):
                        item[key]=previous_item.get(key)
                if not item["image"] and previous_item:
                    item["image"]=verified_image(previous_item.get("image"))
                result[ident]=item
                fetched+=1
        if start+35<len(cg_ids):time.sleep(5.0)
    # Only fill missing percentages with a second official CoinGecko endpoint.
    # An actual 0% remains neutral; a missing value is never fabricated as 0%.
    unknown=[item["id"] for ident,item in result.items()
             if ident in coins and coins[ident]==item.get("id") and
             item.get("change") is None and positive(item.get("price"))]
    if unknown:
        changes=fetch_missing_24h_changes(sorted(set(unknown)))
        for ident,cg in coins.items():
            item=result.get(ident)
            if item and item.get("change") is None and cg in changes:
                item["change"]=changes[cg]
                item["changeSource"]="CoinGecko · simple/price · usd_24h_change"
    # Third independent source only for still missing changes: timestamps must
    # truly bracket 24 hours. Market direction is never inferred from a daily
    # high, a 0% placeholder or another token's similarly named ticker.
    remaining=[(ident,cg) for ident,cg in coins.items()
               if result.get(ident,{}).get("id")==cg and
               result[ident].get("change") is None and positive(result[ident].get("price"))]
    now_ts=int(datetime.now(timezone.utc).timestamp())
    for i,(ident,cg) in enumerate(remaining):
        movement=observed_24h_change(cg,now_ts)
        if movement is not None and math.isfinite(movement):
            result[ident]["change"]=float(f"{movement:.9g}")
            result[ident]["changeSource"]="DefiLlama · due prezzi realmente osservati a 24h"
        if i<len(remaining)-1:time.sleep(1.2)
    # Reject any old entry no longer in the explicit catalog or with changed identity.
    rows=[result[ident] for ident,cg in coins.items()
          if ident in result and result[ident].get("id")==cg]
    payload={"generatedAt":now,"catalogSize":len(coins),
             "source":"CoinGecko · exact coin ID · delayed snapshots",
             "fetchedCount":fetched,"coins":rows}
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n",
                      encoding="utf-8")
    print("Verified crypto heatmap quotes:",fetched,"/ catalog",len(coins),
          "saved entries",len(rows),"(stale observations retain original dates)")

if __name__=="__main__":
    main()
