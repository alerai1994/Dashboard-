#!/usr/bin/env python3
"""Patch the existing Top 200 market runtime without replacing dashboard code."""
from pathlib import Path

path = Path("script.js")
src = path.read_text(encoding="utf-8")
begin_marker = "/* ===== JS originale 107/107: v451-top-200-market-runtime ===== */"
end_marker = "/* V461: rileva ogni cambio Light/Night"
begin, end = src.find(begin_marker), src.find(end_marker)
if begin < 0 or end <= begin:
    raise SystemExit("Unexpected dashboard runtime layout; not modifying files.")
body = src[begin:end]
if "const BACKGROUND_REFRESH=75*1000;" in body:
    print("Background sync already present.")
    raise SystemExit(0)

def replace_once(old, new, label):
    global body
    if body.count(old) != 1:
        raise RuntimeError(f"Expected one occurrence for {label}, found {body.count(old)}.")
    body = body.replace(old, new, 1)

replace_once(
    "  const CACHE_AGE=60*1000, AUTO_REFRESH=60*1000;",
    """  const CACHE_AGE=60*1000, AUTO_REFRESH=60*1000;
  // Aggiorna dati in memoria anche mentre la dashboard principale è visibile.
  const BACKGROUND_REFRESH=75*1000;
  let backgroundTimer=null, backgroundWarmup=null;
  function marketVisible(){return !!(marketPanel && !marketPanel.hidden && document.body.classList.contains('v442-market-open'));}""",
    "background configuration"
)
replace_once(
    "  function applyStream(data){\n    if(!Array.isArray(data)||!coins.length)return;",
    "  function applyStream(data){\n    if(!Array.isArray(data)||!coins.length||document.hidden)return;",
    "skip hidden tab"
)
replace_once(
    "    streamedCount=touched;lastStreamAt=now;\n    // V519:",
    """    streamedCount=touched;lastStreamAt=now;
    if(!document.body.classList.contains('v442-market-open')){
      pendingLiveRows.clear();
      return; // Dati aggiornati in memoria senza ricostruire il Market nascosto.
    }
    // V519:""",
    "background DOM guard"
)
replace_once(
    "    if(marketSocket||!document.body.classList.contains('v442-market-open')||!coins.length||typeof WebSocket==='undefined')return;",
    "    if(marketSocket||document.hidden||navigator.onLine===false||!coins.length||typeof WebSocket==='undefined')return;",
    "always-on stream"
)
replace_once(
    "        if(document.body.classList.contains('v442-market-open')){\n          clearTimeout(marketSocketRetry);",
    "        if(!document.hidden && navigator.onLine!==false){\n          clearTimeout(marketSocketRetry);",
    "reconnect on disconnect"
)
replace_once(
    "    if(!coins.length)setStatus('Caricamento Market Top 200…');",
    "    if(!coins.length && marketVisible())setStatus('Connessione alle quotazioni · aggiornamento automatico.');",
    "no repeated loading label"
)
replace_once(
    "    stopTimer();disconnectMarketStream();",
    "    stopTimer(); // Mantieni i dati live anche a Market chiuso.",
    "do not stop live prices on drawer close"
)
replace_once(
    "  window.addEventListener('online',()=>{if(document.body.classList.contains('v442-market-open')){failedSymbols.clear();historyFailures=0;fetchMarket(true);connectMarketStream();}},{passive:true});",
    """  window.addEventListener('online',()=>{
    failedSymbols.clear();historyFailures=0;
    if(!loading && Date.now()-lastAttempt>=CACHE_AGE)fetchMarket();
    connectMarketStream();
  },{passive:true});
  window.addEventListener('offline',disconnectMarketStream,{passive:true});""",
    "network reconnect"
)
replace_once(
    "  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.classList.contains('v442-market-open')){if(Date.now()-fetchedAt>=CACHE_AGE)fetchMarket();connectMarketStream();}});",
    """  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){disconnectMarketStream();return;}
    if(!loading&&Date.now()-fetchedAt>=CACHE_AGE&&Date.now()-lastAttempt>=CACHE_AGE)fetchMarket();
    connectMarketStream();
  });""",
    "visibility recovery"
)
replace_once(
    """    indicator.className=isStreamed?'v480-market-source v480-live':'v480-market-source v480-api';
    indicator.textContent=isStreamed?'● LIVE':'● API AUTO';
    indicator.title=isStreamed?'Ultima quotazione ricevuta da Binance via WebSocket (USDT ≈ USD)':'Quotazione sincronizzata con API periodica; streaming non disponibile per questa moneta';""",
    """    const freshApi=Number(fetchedAt)>0 && Date.now()-fetchedAt<=125000;
    indicator.className=isStreamed?'v480-market-source v480-live':freshApi?'v480-market-source v480-api':'v480-market-source v542-stale';
    indicator.textContent=isStreamed?'● LIVE':freshApi?'● API':'● NON AGGIORNATO';
    indicator.title=isStreamed?'Ultimo tick Binance WebSocket (USDT ≈ USD)':freshApi?'Ultimo dato API recente':'Ultimo dato conservato: feed non aggiornato';""",
    "stale feed badges"
)
closure = body.rfind("\n})();")
if closure < 0:
    raise RuntimeError("Could not find the Market runtime closure.")
warmup = """
  // La classifica Top 200 si aggiorna in background senza schermate di caricamento.
  function backgroundUpdate(){
    if(document.hidden||navigator.onLine===false)return;
    if(coins.length)connectMarketStream();
    if(!loading && Date.now()-lastAttempt>=BACKGROUND_REFRESH &&
       (!fetchedAt||Date.now()-fetchedAt>=BACKGROUND_REFRESH))fetchMarket();
  }
  backgroundWarmup=setTimeout(()=>{
    backgroundWarmup=null;
    if(!coins.length)cacheRead();
    if(coins.length)connectMarketStream();
    backgroundUpdate();
    if(!backgroundTimer)backgroundTimer=setInterval(backgroundUpdate,BACKGROUND_REFRESH);
  },1800);
  window.addEventListener('pageshow',()=>{
    if(document.hidden)return;
    backgroundUpdate();
    if(!backgroundTimer)backgroundTimer=setInterval(backgroundUpdate,BACKGROUND_REFRESH);
  },{passive:true});
  window.addEventListener('pagehide',()=>{
    clearTimeout(backgroundWarmup);
    clearInterval(backgroundTimer);backgroundTimer=null;
    disconnectMarketStream();
  },{passive:true});
"""
body = body[:closure] + warmup + body[closure:]
updated = src[:begin] + body + src[end:]
if len(updated) - len(src) > 7000:
    raise RuntimeError("Patch unexpectedly large.")
path.write_text(updated, encoding="utf-8")
print(f"Patched Top 200 streaming and refresh: +{len(updated)-len(src)} characters.")
