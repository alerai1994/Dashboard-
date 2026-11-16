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
    cg_ids=list(dict.fromkeys(coins.values()))
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
