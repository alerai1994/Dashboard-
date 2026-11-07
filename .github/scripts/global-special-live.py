#!/usr/bin/env python3
"""Refresh independent public Altcoin Season and BTC/ETH snapshots.

Data freshness is carried in each observation timestamp. Failed providers
must never be published as a fake current value.
"""
import datetime
import json
import pathlib
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/"global-special-live.json"
HEADERS={"User-Agent":"VertexGlobal/1.0","Accept":"application/json"}

def get(url):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=20) as response:
        return json.load(response)

def timestamp(value):
    if isinstance(value,(int,float)):
        n=int(value)
        return n*1000 if n<100000000000 else n
    if isinstance(value,str):
        try: return int(datetime.datetime.fromisoformat(value.replace("Z","+00:00")).timestamp()*1000)
        except (ValueError,TypeError): return 0
    return 0

now=datetime.datetime.now(datetime.timezone.utc)
out={"fetchedAt":now.isoformat(),"altcoin":None,"rainbow":{}}
try:
    data=get("https://pro-api.coinmarketcap.com/public-api/v1/altcoin-season-index/latest")
    raw=data.get("data") or {}
    error=(data.get("status") or {}).get("error_code",0)
    value=float(raw.get("altcoin_index"))
    stamp=timestamp(raw.get("snapshot_time"))
    if str(error)=="0" and 0<=value<=100 and stamp>0:
        out["altcoin"]={"value":value,"timestamp":stamp,"source":"CoinMarketCap · Altcoin Season Index"}
except (OSError,ValueError,TypeError,KeyError) as err:
    print("Altcoin Season live unavailable:",type(err).__name__,str(err)[:100])

for asset in ("BTC","ETH"):
    try:
        raw=get("https://data-api.binance.vision/api/v3/ticker/24hr?symbol="+asset+"USDT")
        value=float(raw["lastPrice"])
        change=float(raw["priceChangePercent"])
        if value<=0: raise ValueError("Invalid price")
        out["rainbow"][asset]={"value":value,"change24h":change,
            "timestamp":int(now.timestamp()*1000),"pair":asset+"USDT","source":"Binance Spot"}
    except (OSError,ValueError,TypeError,KeyError) as err:
        print(asset,"ticker unavailable:",type(err).__name__,str(err)[:100])

if not out["altcoin"] and not out["rainbow"]:
    raise SystemExit("No upstream live feed available; keep old snapshot and its original timestamp")
OUT.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
print("Updated",OUT.name,"altcoin",bool(out["altcoin"]),"assets",list(out["rainbow"]))
