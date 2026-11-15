/* Price-only fallback for Vertex Liquidation Heatmap.
   No liquidation intensities are estimated from OHLC price action.
   Binance Spot klines provide real candles; first-party archives are a backup.
*/
(function(){
'use strict';
const symbolByCoin=Object.freeze({
 BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',HYPE:'HYPEUSDT',
 BNB:'BNBUSDT',XRP:'XRPUSDT',DOGE:'DOGEUSDT',ADA:'ADAUSDT',
 AVAX:'AVAXUSDT',LINK:'LINKUSDT',SUI:'SUIUSDT',TAO:'TAOUSDT',
 INJ:'INJUSDT',TRX:'TRXUSDT'
});
const frames=Object.freeze({
 '12h':{interval:'5m',limit:148,seconds:43200,label:'5 min'},
 '24h':{interval:'5m',limit:292,seconds:86400,label:'5 min'},
 '3d':{interval:'30m',limit:148,seconds:259200,label:'30 min'},
 '7d':{interval:'1h',limit:172,seconds:604800,label:'1 ora'},
 '30d':{interval:'4h',limit:184,seconds:2592000,label:'4 ore'},
 '90d':{interval:'12h',limit:184,seconds:7776000,label:'12 ore'},
 '180d':{interval:'1d',limit:185,seconds:15552000,label:'1 giorno'},
 '1y':{interval:'1d',limit:370,seconds:31536000,label:'1 giorno'}
});
const valid=(rows,now=Date.now())=>{
 if(!Array.isArray(rows))return [];
 const seen=new Map();
 for(const row of rows){
  if(!Array.isArray(row)||row.length<5)continue;
  let t=Number(row[0]),o=Number(row[1]),h=Number(row[2]),
      l=Number(row[3]),c=Number(row[4]);
  if(t>1e11)t=Math.floor(t/1000);
  if(![t,o,h,l,c].every(Number.isFinite)||t<946684800||
     t*1000>now+3600000||Math.min(o,h,l,c)<=0||
     h<Math.max(o,c)||l>Math.min(o,c))continue;
  seen.set(t,{t,o,h,l,c});
 }
 return [...seen.values()].sort((a,b)=>a.t-b.t);
};
async function fetchJSON(url,timeout=5800){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetch(url,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('Dati non disponibili · HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer)}
}
const select=(candles,range,now=Date.now())=>{
 const config=frames[range];
 if(!config)return [];
 const start=now/1000-config.seconds;
 return valid(candles,now).filter(c=>c.t>=start-86400&&c.t<=now/1000+3600);
};
async function direct(coin,range){
 const frame=frames[range],symbol=symbolByCoin[coin];
 if(!frame||!symbol)return null;
 const path='/api/v3/klines?symbol='+encodeURIComponent(symbol)+
  '&interval='+frame.interval+'&limit='+frame.limit;
 for(const host of ['https://data-api.binance.vision','https://api.binance.com']){
  try{
   const raw=await fetchJSON(host+path,6000);
   const candles=select(raw,range);
   const coverage=candles.at(-1)?.t-candles[0]?.t;
   if(candles.length>=2&&coverage>=frame.seconds*.25){
    return {candles,source:'Binance Spot · '+symbol,
     quote:'USDT',interval:frame.label,kind:'real-ohlc',latest:candles.at(-1).t};
   }
  }catch(_error){}
 }
 return null;
}
async function archive(coin,range){
 if(!frames[range]||!symbolByCoin[coin])return null;
 const short=['12h','24h'].includes(range);
 if(['12h','24h','3d','7d'].includes(range)){
  try{
   const url='./chart-history/crypto/ohlc/'+encodeURIComponent(coin.toLowerCase())+'.json';
   const data=await fetchJSON(url,4700);
   if(data?.id!==coin.toLowerCase()||data.kind!=='verified-ohlc')return null;
   const segment=data.sets?.[short?'short':'week'];
   const candles=select(segment?.candles,range);
   if(candles.length>=2){
    return {candles,source:String(segment.source||'Archivio OHLC verificato'),
     quote:segment.currency||'USDT',interval:segment.interval||'OHLC',
     kind:'real-ohlc',latest:candles.at(-1).t};
   }
  }catch(_error){}
 }
 if(!['90d','180d','1y'].includes(range))return null;
 try{
  const raw=await fetchJSON('./chart-history/crypto/'+encodeURIComponent(coin.toLowerCase())+'.json',4700);
  if(raw?.id!==coin.toLowerCase()||!Array.isArray(raw.candles))return null;
  // Monthly source archives yield fewer candles, but are genuine OHLC, not fabricated.
  const monthly=valid(raw.candles);
  const start=Date.now()/1000-frames[range].seconds;
  const rows=monthly.filter(c=>c.t>=start-32*86400);
  if(rows.length<2)return null;
  return {candles:rows,source:String(raw.source||'Archivio OHLC mensile'),
   quote:raw.quoteCurrency||'USD',interval:raw.timeframe||'1mo',
   kind:'real-ohlc',latest:rows.at(-1).t};
 }catch(_error){return null}
}
async function load(coin,range){
 if(!Object.hasOwn(symbolByCoin,coin)||!Object.hasOwn(frames,range))return null;
 return await direct(coin,range)||await archive(coin,range);
}
window.VertexLiqPriceFallback=Object.freeze({load,parse:valid,ranges:Object.keys(frames)});
})();
