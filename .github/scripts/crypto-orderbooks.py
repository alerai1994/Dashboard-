#!/usr/bin/env python3
"""Collect genuine Spot USDT bid/ask levels for all Vertex crypto assets.

Each record names the market venue, trading pair and actual capture timestamp.
No synthetic or merged order book. If an exchange is down, retain previously
verified levels only for a bounded time, preserving their original timestamps.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import math
import sys

OUT_JSON = Path("crypto-orderbooks.json")
OUT_JS = Path("crypto-orderbooks-data.js")
ORE_MINT = "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp"
ALL = {
    "btc":"BTC","eth":"ETH","sol":"SOL","xrp":"XRP","bnb":"BNB",
    "doge":"DOGE","inj":"INJ","ore":"ORE","ada":"ADA","avax":"AVAX",
    "link":"LINK","dot":"DOT","trx":"TRX","ton":"TON","sui":"SUI",
    "ltc":"LTC","bch":"BCH","xlm":"XLM","hbar":"HBAR","near":"NEAR",
    "apt":"APT","atom":"ATOM","uni":"UNI","aave":"AAVE","arb":"ARB",
    "op":"OP","shib":"SHIB","pepe":"PEPE","render":"RENDER","ray":"RAY",
    "lunc":"LUNC","vra":"VRA","wlfi":"WLFI","hot":"HOT","ksm":"KSM",
    "wld":"WLD","fet":"FET","orai":"ORAI","tai":"TAI","virtual":"VIRTUAL",
    "tao":"TAO","luna":"LUNA",
}
assert len(ALL) == 42
MAX_OLD_SECONDS = 3*60*60
HEADERS = {"Accept":"application/json", "User-Agent":"Mozilla/5.0 (compatible; VertexOrderBook/1.0)"}

def now():
    return datetime.now(timezone.utc)

def fetch(url):
    req=Request(url, headers=HEADERS)
    with urlopen(req, timeout=10) as reply:
        return json.load(reply)

def level_rows(rows, reverse):
    if not isinstance(rows,list):
        raise ValueError("No order levels")
    result=[]
    for row in rows:
        if not isinstance(row,(list,tuple)) or len(row)<2:
            continue
        try:
            p,q=float(row[0]),float(row[1])
            if math.isfinite(p) and math.isfinite(q) and p>0 and q>0:
                result.append([p,q])
        except (ValueError,TypeError):
            continue
    result.sort(key=lambda item:item[0],reverse=reverse)
    return result[:20]

def checked(raw, exchange):
    if not isinstance(raw,dict):
        raise ValueError("Invalid exchange response")
    if exchange=="LBank":
        if raw.get("error_code") not in (None,0,"0"):
            raise ValueError("LBank API error")
        if str(raw.get("result","true")).lower() not in ("true","1"):
            raise ValueError("LBank API error")
        data=raw.get("data",raw)
        if not isinstance(data,dict):
            raise ValueError("Missing LBank levels")
        timestamp = data.get("timestamp") or raw.get("ts")
        if timestamp:
            time_value=float(timestamp)
            if time_value<1e11:time_value*=1000
            if abs(now().timestamp()*1000-time_value)>600000:
                raise ValueError("LBank exchange timestamp is stale")
    else:
        data=raw
    bids=level_rows(data.get("bids"),True)
    asks=level_rows(data.get("asks"),False)
    if not bids or not asks or bids[0][0]>=asks[0][0]:
        raise ValueError("Empty or crossed bids/asks")
    return bids,asks

def sources(cid,symbol):
    if cid=="ore":
        for host in ("api.lbank.info","api.lbkex.com"):
            yield "LBank", "ORE/USDT", f"https://{host}/v2/depth.do?symbol=ore_usdt&size=20"
        return
    b=f"{symbol}USDT"
    g=f"{symbol}_USDT"
    items=[
        ("Binance",f"{symbol}/USDT","https://data-api.binance.vision/api/v3/depth?"+urlencode({"symbol":b,"limit":20})),
        ("Gate",f"{symbol}/USDT","https://api.gateio.ws/api/v4/spot/order_book?"+urlencode({"currency_pair":g,"limit":20})),
        ("MEXC",f"{symbol}/USDT","https://api.mexc.com/api/v3/depth?"+urlencode({"symbol":b,"limit":20}))
    ]
    if cid in ("orai","vra","lunc","hot"):
        items=[items[1],items[2],items[0]]
    if cid=="tai":
        items=[items[2],items[1],items[0]]
    for venue,pair,url in items:
        yield venue,pair,url

def recent_trade(exchange,pair):
    """One exchange's latest spot trade/ticker price; never infer it from the book."""
    name=pair.split("/")[0]
    symbol=name+"USDT"
    if exchange=="Binance":
        raw=fetch("https://data-api.binance.vision/api/v3/ticker/price?"+urlencode({"symbol":symbol}))
        value=raw.get("price")
    elif exchange=="MEXC":
        raw=fetch("https://api.mexc.com/api/v3/ticker/price?"+urlencode({"symbol":symbol}))
        value=raw.get("price")
    elif exchange=="Gate":
        raw=fetch("https://api.gateio.ws/api/v4/spot/tickers?"+urlencode({"currency_pair":name+"_USDT"}))
        value=raw[0].get("last") if isinstance(raw,list) and len(raw)==1 else None
    elif exchange=="LBank":
        raw=fetch("https://api.lbank.info/v2/ticker/24hr.do?symbol="+name.lower()+"_usdt")
        rows=raw.get("data",[]) if isinstance(raw,dict) else raw
        value=rows[0].get("ticker",{}).get("latest") if isinstance(rows,list) and rows else None
    else:
        return None
    try:
        result=float(value)
        return result if math.isfinite(result) and result>0 else None
    except (TypeError,ValueError):
        return None

def current_book(cid,symbol,previous):
    errors=[]
    # Binance officially migrated Toncoin's TON/USDT to GRAM/USDT, 1:1.
    traded_symbol="GRAM" if cid=="ton" else symbol
    for exchange,pair,url in sources(cid,traded_symbol):
        try:
            bids,asks=checked(fetch(url),exchange)
            item={"id":cid,"venue":exchange+" Spot","pair":pair,"unit":traded_symbol,
                  "bids":bids,"asks":asks,"capturedAt":now().isoformat()}
            if cid=="ore": item["mint"]=ORE_MINT
            try:
                price=recent_trade(exchange,pair)
                if price is not None:
                    item["lastTrade"]=price
                    item["lastTradeAt"]=now().isoformat()
            except (OSError,HTTPError,URLError,TimeoutError,ValueError,KeyError,TypeError,IndexError):
                # Never discard valid order-book levels when the optional
                # market-trade ticker is temporarily unavailable.
                pass
            # Price movement arrow compares genuine prices from two successive
            # verified snapshots of EXACTLY the same exchange and trading pair.
            # An unavailable comparison remains neutral; never infer direction.
            prior=previous.get(cid) if isinstance(previous,dict) else None
            if (item.get("lastTrade") is not None and isinstance(prior,dict)
                and prior.get("venue")==item["venue"] and prior.get("pair")==pair):
                try:
                    last_previous=float(prior.get("lastTrade"))
                    previous_at=datetime.fromisoformat(str(prior["lastTradeAt"]).replace("Z","+00:00"))
                    if (math.isfinite(last_previous) and last_previous>0
                        and previous_at.tzinfo is not None
                        and 0<(now()-previous_at).total_seconds()<MAX_OLD_SECONDS):
                        item["previousTrade"]=last_previous
                        item["previousTradeAt"]=prior["lastTradeAt"]
                except (TypeError,ValueError,KeyError):
                    pass
            return item,None
        except (OSError,HTTPError,URLError,TimeoutError,ValueError,KeyError,TypeError) as exc:
            errors.append(exchange+":"+type(exc).__name__)
    return None,",".join(errors)

def previous_books():
    if not OUT_JSON.exists():return {}
    try:
        payload=json.loads(OUT_JSON.read_text(encoding="utf-8"))
        return payload.get("books",{}) if isinstance(payload.get("books"),dict) else {}
    except (OSError,ValueError,TypeError):
        return {}

def verified_old(cid,old):
    expected="GRAM" if cid=="ton" else ALL[cid]
    if not isinstance(old,dict) or old.get("id")!=cid or old.get("unit")!=expected:
        return None
    if cid=="ore" and old.get("mint")!=ORE_MINT:
        return None
    if old.get("pair")!=expected+"/USDT":
        return None
    try:
        stamp=datetime.fromisoformat(old["capturedAt"].replace("Z","+00:00"))
        if stamp.tzinfo is None:return None
        if not 0<=(now()-stamp).total_seconds()<MAX_OLD_SECONDS:return None
        bids=level_rows(old["bids"],True);asks=level_rows(old["asks"],False)
        if not bids or not asks or bids[0][0]>=asks[0][0]:return None
        return {**old,"bids":bids,"asks":asks}
    except (KeyError,TypeError,ValueError):
        return None

def main():
    previous=previous_books()
    books={}
    unavailable={}
    with ThreadPoolExecutor(max_workers=8) as pool:
        tasks={pool.submit(current_book,cid,sym,previous):cid for cid,sym in ALL.items()}
        for task in as_completed(tasks):
            cid=tasks[task]
            try:book,error=task.result()
            except Exception as exc:book,error=None,type(exc).__name__
            if book:
                books[cid]=book
            else:
                old=verified_old(cid,previous.get(cid))
                if old: books[cid]=old
                else: unavailable[cid]=error or "Nessun mercato verificato"
    payload={"generatedAt":now().isoformat(),"totalAssets":len(ALL),
             "available":len(books),"books":books,"unavailable":unavailable}
    compact=json.dumps(payload,separators=(",",":"),ensure_ascii=False,allow_nan=False)
    OUT_JSON.write_text(compact+"\n",encoding="utf-8")
    OUT_JS.write_text("window.__VERTEX_CRYPTO_BOOKS__ = "+compact+";\n",encoding="utf-8")
    print("Spot books",len(books),"/",len(ALL), "fresh",sum(1 for v in books.values() if v not in previous.values()))
    if unavailable:print("Unavailable:",unavailable)
    return 0

if __name__=="__main__":
    sys.exit(main())
