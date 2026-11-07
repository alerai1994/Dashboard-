/* Isolated optional charts module; the dashboard loads independently. */
const vertexChartScope=window.__vertexGlobalChartScope;
const {state,nativeCapChart,nativeCapUsd,nativeCapDate,nativeCapPalette,nativeCapWindow,paintGlobalCapChart}=vertexChartScope;
const $=selector=>document.querySelector(selector);
/* Vertex Global: Altcoin Index and BTC/ETH logarithmic Rainbow charts.
   Market data is downloaded from the versioned first-party JSON archive.
   All rainbow bands are descriptive regressions fitted to observed closes:
   they are NOT market prices, valuation guarantees or forecasts. */
const extraGlobalState={
 loading:false,loaded:false,error:'',model:Object.create(null),
 meta:Object.create(null),live:Object.create(null)
};
const extraRainbowIds=Object.freeze({BTC_RAINBOW:'BTC',ETH_RAINBOW:'ETH'});
const extraRainbowColors=['#5154c9','#3c82df','#2baddf','#27bdac','#76c77e','#bcd458','#ead04d','#f19d44','#e15d60'];
const extraRainbowZones=['Sconto profondo','Sottovalutato','Accumulo','Ancora economico','Nella media','Sopra tendenza','Mercato caldo','Euforia','Molto caldo'];
const extraRainbowEdges=[-2.25,-1.75,-1.25,-.75,-.25,.25,.75,1.25,1.75,2.25];
function isRainbowExtraChart(id){return Object.hasOwn(extraRainbowIds,id||'');}
function extraCleanPoints(input,allowZero=false){
 const dedup=new Map();
 for(const row of Array.isArray(input)?input:[]){
  if(!Array.isArray(row)||row.length<2)continue;
  const t=Number(row[0]),v=Number(row[1]);
  if(Number.isFinite(t)&&t>1250000000000&&Number.isFinite(v)&&(allowZero?v>=0:v>0))dedup.set(t,[t,v]);
 }
 return [...dedup.values()].sort((a,b)=>a[0]-b[0]);
}
function extraMoney(n){
 if(!(n>0))return '—';
 return '$'+n.toLocaleString('en-US',{maximumFractionDigits:n<10?3:n<100?2:0});
}
function extraLogFit(points){
 if(points.length<24)return null;
 const first=points[0][0];
 let n=0,xSum=0,ySum=0,xxSum=0,xySum=0;
 for(const [t,value] of points){
  const x=Math.log(Math.max(1,(t-first)/86400000+1)),y=Math.log(value);
  n++;xSum+=x;ySum+=y;xxSum+=x*x;xySum+=x*y;
 }
 const denominator=n*xxSum-xSum*xSum;
 if(Math.abs(denominator)<1e-9)return null;
 const b=(n*xySum-xSum*ySum)/denominator,a=(ySum-b*xSum)/n;
 let sumSquares=0;
 for(const [t,value] of points){
  const x=Math.log(Math.max(1,(t-first)/86400000+1));
  const err=Math.log(value)-(a+b*x);sumSquares+=err*err;
 }
 return {first,a,b,sigma:Math.max(.06,Math.sqrt(sumSquares/n))};
}
function extraRainbowLog(t,fit,k=0){
 return fit.a+fit.b*Math.log(Math.max(1,(t-fit.first)/86400000+1))+k*fit.sigma;
}
function extraRainbowZone(t,price,fit){
 if(!fit||!(price>0))return null;
 const deviation=(Math.log(price)-extraRainbowLog(t,fit))/fit.sigma;
 return Math.max(0,Math.min(8,Math.floor((deviation+2.25)/.5)));
}
function extraRainbowTooltip(candle,id){
 const asset=extraRainbowIds[id],fit=extraGlobalState.model[id];
 const zone=extraRainbowZone(candle.t,candle.c,fit);
 return '<strong>'+nativeCapDate(candle.t)+'</strong>'+
  '<span>Prezzo '+asset+'</span>'+
  '<span class="global-tooltip-value">'+extraMoney(candle.c)+
  (extraIsLive(id)&&extraGlobalState.live[id]?.timestamp===candle.t?' USDT':' USD')+'</span>'+
  (zone===null?'':'<span>Zona: '+extraRainbowZones[zone]+'</span>');
}

function updateExtraGlobalPillData(){
 for(const id of ['ALTCOIN','BTC_RAINBOW','ETH_RAINBOW']){
  const valueNode=document.querySelector('[data-special-cap="'+id+'"]');
  const changeNode=document.querySelector('[data-special-change="'+id+'"]');
  if(!valueNode||!changeNode)continue;
  const rows=nativeCapChart.data[id]||[];
  if(!rows.length){
   if(extraGlobalState.loaded||extraGlobalState.error){
    valueNode.textContent='—';
    changeNode.textContent='Dato non disponibile';
   }
   continue;
  }
  const last=rows.at(-1),prior=rows.at(-2),online=extraIsLive(id);
  const live=extraGlobalState.live[id],button=valueNode.closest('button');
  valueNode.textContent=id==='ALTCOIN'?Math.round(last[1])+'%':extraMoney(last[1]);
  changeNode.classList.remove('is-positive','is-negative');
  let delta=null,description='';
  if(id==='ALTCOIN'){
   delta=prior?Math.round(last[1]-prior[1]):null;
   description=online?'LIVE · '+extraTime(live.timestamp):
    'ARCHIVIO · '+extraTime(last[0]);
  }else{
   delta=online&&Number.isFinite(live.change24h)?live.change24h:
    prior&&prior[1]>0?(last[1]/prior[1]-1)*100:null;
   const percent=delta===null?'n/d':(delta>=0?'+':'')+delta.toFixed(2)+'%';
   description=(online?'LIVE · ':'ARCHIVIO · ')+percent;
  }
  changeNode.textContent=description;
  changeNode.classList.toggle('is-positive',delta!==null&&delta>0);
  changeNode.classList.toggle('is-negative',delta!==null&&delta<0);
  if(button){
   if(!button.dataset.extraBaseTitle)button.dataset.extraBaseTitle=button.title||id;
   const model=extraGlobalState.model[id];
   const zone=isRainbowExtraChart(id)?extraRainbowZone(last[0],last[1],model):null;
   button.title=button.dataset.extraBaseTitle+' · '+(online?'LIVE':'DATO ARCHIVIATO')+
    ' · '+valueNode.textContent+' · '+new Date(last[0]).toLocaleString('it-IT')+
    (zone===null?'':' · fascia Rainbow: '+extraRainbowZones[zone]);
  }
 }
}

async function loadExtraGlobalCharts(){
 if(extraGlobalState.loading||extraGlobalState.loaded)return;
 extraGlobalState.loading=true;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),16000);
 try{
  const url='./global-special-charts.json?v='+Math.floor(Date.now()/300000);
  const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const payload=await response.json();
  // Altcoin Season Index is a bounded 0–100 score, not CRYPTOCAP:OTHERS market cap.
  const alt=payload?.altcoin||{};
  const altPoints=extraCleanPoints(alt.points,true).filter(([t,v])=>v>=0&&v<=100);
  if(altPoints.length){
   nativeCapChart.data.ALTCOIN=altPoints;
   nativeCapChart.ohlc.ALTCOIN=null;
   nativeCapChart.sources.ALTCOIN=alt.source||'CoinMarketCap · Altcoin Season Index';
   extraGlobalState.meta.ALTCOIN={frequency:alt.frequency||'1D',source:alt.source,updatedAt:payload.updatedAt};
  }
  for(const [id,asset] of Object.entries(extraRainbowIds)){
   const quote=payload?.rainbow?.[asset]||{};
   const rows=extraCleanPoints(quote.points);
   if(!rows.length)continue;
   nativeCapChart.data[id]=rows;
   nativeCapChart.sources[id]=quote.source||('Prezzi storici '+asset+'/USD');
   extraGlobalState.meta[id]={frequency:quote.frequency||'1D',source:quote.source};
   extraGlobalState.model[id]=extraLogFit(rows);
  }
  updateExtraGlobalPillData();
  extraGlobalState.error='';
  extraGlobalState.loaded=true;
  refreshExtraLiveQuotes();
  refreshExtraLiveAltcoin();
  refreshExtraLiveSnapshot();
 }catch(error){
  extraGlobalState.error='Dati non disponibili: '+(error?.message||'errore');
 }finally{
  clearTimeout(timeout);extraGlobalState.loading=false;
  updateExtraGlobalPillData();
  if(state.page==='global'&&['ALTCOIN','BTC_RAINBOW','ETH_RAINBOW'].includes(vertexChartScope.currentGlobalCapChart))
   paintGlobalCapChart();
 }
}


/* Live data is separate from archival closes. The provider's original timestamp
   determines freshness; failed requests never receive a synthetic LIVE status. */
const EXTRA_BTC_ETH_MS=15000,EXTRA_ALTCOIN_MS=900000;
const extraLivePending={quotes:false,altcoin:false,snapshot:false};
let extraLiveStarted=false;
function extraTime(timestamp){
 return Number.isFinite(timestamp)?new Date(timestamp).toLocaleTimeString('it-IT',{
  hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'
 }):'n/d';
}
function extraIsLive(id){
 const item=extraGlobalState.live[id];
 if(!item||!(item.timestamp>0))return false;
 const age=Date.now()-item.timestamp,received=Date.now()-item.receivedAt;
 const limit=id==='ALTCOIN'?26*3600000:75000;
 const maxReceive=id==='ALTCOIN'?EXTRA_ALTCOIN_MS+180000:75000;
 return age>=-300000&&age<=limit&&received>=0&&received<maxReceive;
}
async function extraFetchJson(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{
  const response=await fetch(url,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer)}
}
function extraTimestamp(raw){
 if(typeof raw==='number'&&Number.isFinite(raw))
  return raw<1e11?raw*1000:raw;
 if(typeof raw==='string'){
  const parsed=Date.parse(raw);if(Number.isFinite(parsed))return parsed;
  const numeric=Number(raw);if(Number.isFinite(numeric)&&numeric>0)
   return numeric<1e11?numeric*1000:numeric;
 }
 return null;
}
function extraApplyLive(id,value,timestamp,source,change24h=null){
 const n=Number(value),t=extraTimestamp(timestamp);
 if(!Number.isFinite(n)||!Number.isFinite(t)||n<0||(id!=='ALTCOIN'&&n===0))return false;
 if(id==='ALTCOIN'&&!(n>=0&&n<=100))return false;
 if(t>Date.now()+300000||t<Date.now()-(id==='ALTCOIN'?28*3600000:45*60000))return false;
 if(!nativeCapChart.data[id]?.length)return false;
 const existing=extraGlobalState.live[id];
 if(existing&&existing.timestamp>t)return false;
 const utcDay=ms=>Math.floor(ms/86400000);
 const day=utcDay(t),original=nativeCapChart.data[id];
 // Keep previous daily historical candles, replace only the newest UTC day's
 // observation by its verified live quote. No fabricated OHLC values.
 const replacement=original.filter(([pt])=>utcDay(pt)!==day);
 replacement.push([t,n]);replacement.sort((a,b)=>a[0]-b[0]);
 nativeCapChart.data[id]=replacement;
 extraGlobalState.live[id]={
  timestamp:t,receivedAt:Date.now(),source,
  change24h:Number.isFinite(Number(change24h))?Number(change24h):null
 };
 updateExtraGlobalPillData();
 if(state.page==='global'&&vertexChartScope.currentGlobalCapChart===id)
  paintGlobalCapChart();
 return true;
}
async function refreshExtraLiveQuotes(){
 if(extraLivePending.quotes||!extraGlobalState.loaded||document.hidden)return;
 extraLivePending.quotes=true;
 try{
  const entries=await Promise.allSettled(
   Object.entries(extraRainbowIds).map(async([id,asset])=>{
    const raw=await extraFetchJson('https://data-api.binance.vision/api/v3/ticker/24hr?symbol='+asset+'USDT');
    const price=Number(raw?.lastPrice);
    const timestamp=Date.now();
    if(!(price>0))throw Error('Prezzo non valido');
    extraApplyLive(id,price,timestamp,'Binance · '+asset+'/USDT',raw.priceChangePercent);
   })
  );
  for(const result of entries)if(result.status==='rejected')
   console.warn('Rainbow live quote unavailable:',result.reason);
 }finally{extraLivePending.quotes=false;updateExtraGlobalPillData()}
}
async function refreshExtraLiveAltcoin(){
 if(extraLivePending.altcoin||!extraGlobalState.loaded||document.hidden)return;
 extraLivePending.altcoin=true;
 try{
  const raw=await extraFetchJson(
   'https://pro-api.coinmarketcap.com/public-api/v1/altcoin-season-index/latest'
  );
  if(Number(raw?.status?.error_code||0)!==0)throw Error('CoinMarketCap API error');
  const data=raw?.data||{},timestamp=extraTimestamp(data.snapshot_time);
  if(!(Number(data.altcoin_index)>=0&&Number(data.altcoin_index)<=100&&timestamp))
   throw Error('Dati CMC incompleti');
  extraApplyLive('ALTCOIN',data.altcoin_index,timestamp,'CoinMarketCap · Altcoin Season Index');
 }catch(err){console.warn('Altcoin Season direct API unavailable:',err)}
 finally{extraLivePending.altcoin=false;updateExtraGlobalPillData()}
}
async function refreshExtraLiveSnapshot(){
 if(extraLivePending.snapshot||!extraGlobalState.loaded||document.hidden)return;
 extraLivePending.snapshot=true;
 try{
  const raw=await extraFetchJson('./global-special-live.json?v='+Math.floor(Date.now()/60000));
  const fetched=extraTimestamp(raw?.fetchedAt);
  // Snapshot must have been fetched recently, not copied from an older action.
  if(!(fetched&&Date.now()-fetched<35*60000&&fetched<Date.now()+300000))return;
  if(raw.altcoin){
   const item=raw.altcoin;
   extraApplyLive('ALTCOIN',item.value,item.timestamp,item.source);
  }
  for(const [id,asset] of Object.entries(extraRainbowIds)){
   const item=raw?.rainbow?.[asset];
   if(!item)continue;
   extraApplyLive(id,item.value,item.timestamp,item.source,item.change24h);
  }
 }catch(err){console.warn('Timestamped live snapshot unavailable:',err)}
 finally{extraLivePending.snapshot=false;updateExtraGlobalPillData()}
}
function startExtraLivePolling(){
 if(extraLiveStarted)return;extraLiveStarted=true;
 setInterval(refreshExtraLiveQuotes,EXTRA_BTC_ETH_MS);
 setInterval(refreshExtraLiveAltcoin,EXTRA_ALTCOIN_MS);
 setInterval(refreshExtraLiveSnapshot,60000);
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
   refreshExtraLiveQuotes();refreshExtraLiveAltcoin();refreshExtraLiveSnapshot();
  }
 });
}
startExtraLivePolling();


/* Altcoin Season: literal 0–100 axis and real observed historical scores. */
function drawExtraAltcoinIndex(c,w,h,host){
 const points=nativeCapChart.data.ALTCOIN||[];
 const view=nativeCapWindow(),rows=view.rows;
 const empty=$('#globalCapChartEmpty'),stats=$('#globalCapChartStats');
 const source=$('#globalCapHistorySource'),subtitle=$('#globalCapFullRangeStatus');
 const isLoaded=extraGlobalState.loaded;
 const missing=extraGlobalState.loading?'Caricamento Altcoin Season Index…':
  extraGlobalState.error||(!points.length&&isLoaded?'Storico Altcoin Season Index non disponibile.':'');
 if(empty){empty.textContent=missing;empty.hidden=!missing}
 if(subtitle)subtitle.textContent='Altcoin Season Index · '+nativeCapChart.range+' · scala 0–100'+
  (rows.length?' · '+nativeCapDate(rows[0].t)+' – '+nativeCapDate(rows.at(-1).t):' · nessun dato in questo intervallo')+
  (nativeCapChart.range==='1D'?' · dati giornalieri, non intraday':'');
 if(source)source.textContent=(nativeCapChart.sources.ALTCOIN||'CoinMarketCap · Altcoin Season Index')+
  ' · Indice 0–100: sotto 25 stagione Bitcoin, sopra 75 stagione altcoin. '+
  (extraIsLive('ALTCOIN')?'Ultima osservazione ufficiale aggiornata':'Ultimo dato archiviato')+'.';
 if(stats){
  if(rows.length){
   const first=rows[0],last=rows.at(-1);
   const delta=rows.length>1?Math.round(last.c-first.c):null;
   const current=points.length>0&&last.t===points.at(-1)[0]&&extraIsLive('ALTCOIN');
   stats.innerHTML='<div><small>Indice '+(current?'LIVE':'nel periodo')+'</small><strong>'+Math.round(last.c)+'/100</strong></div>'+
    '<div><small>Variazione '+nativeCapChart.range+'</small><strong>'+(delta===null?'n/d':(delta>=0?'+':'')+delta+' punti')+'</strong></div>'+
    '<div><small>Periodo sul grafico</small><strong>'+nativeCapDate(first.t)+' – '+nativeCapDate(last.t)+'</strong></div>';
  }else stats.innerHTML='';
 }
 if(!rows.length)return;
 const L=24,R=65,T=26,B=43,PW=Math.max(70,w-L-R),PH=Math.max(80,h-T-B);
 const X=i=>L+(i+.5)*PW/rows.length,Y=value=>T+(100-value)/100*PH;
 const muted=nativeCapPalette('--muted','#8f9eaa');
 const grid=nativeCapPalette('--line','#35475c');
 const bright=nativeCapPalette('--brand','#4d9dff');
 c.font='11px system-ui,sans-serif';c.textBaseline='middle';
 for(let score=0;score<=100;score+=25){
  const y=Y(score);c.strokeStyle=grid;c.globalAlpha=.55;c.lineWidth=.8;
  c.beginPath();c.moveTo(L,y);c.lineTo(L+PW,y);c.stroke();c.globalAlpha=1;
  c.fillStyle=muted;c.textAlign='left';c.fillText(score+'%',L+PW+9,y);
 }
 for(let k=0;k<=5;k++){
  const i=Math.min(rows.length-1,Math.floor((rows.length-1)*k/5));
  c.fillStyle=muted;c.textAlign='center';
  c.fillText(new Date(rows[i].t).toLocaleDateString('it-IT',
   {month:'short',year:'2-digit',timeZone:'UTC'}),X(i),h-16);
 }
 c.save();c.beginPath();c.rect(L,T,PW,PH);c.clip();
 const gradient=c.createLinearGradient(0,T,0,T+PH);
 gradient.addColorStop(0,'rgba(35,174,144,.22)');
 gradient.addColorStop(1,'rgba(48,144,230,.07)');
 c.beginPath();
 rows.forEach((p,i)=>i?c.lineTo(X(i),Y(p.c)):c.moveTo(X(i),Y(p.c)));
 c.lineTo(X(rows.length-1),Y(0));c.lineTo(X(0),Y(0));c.closePath();c.fillStyle=gradient;c.fill();
 c.beginPath();rows.forEach((p,i)=>i?c.lineTo(X(i),Y(p.c)):c.moveTo(X(i),Y(p.c)));
 c.strokeStyle=bright;c.lineWidth=2.2;c.lineJoin='round';c.stroke();
 const p=rows[nativeCapChart.hover!==null&&nativeCapChart.hover>=0&&nativeCapChart.hover<rows.length?nativeCapChart.hover:rows.length-1];
 const idx=rows.indexOf(p);c.beginPath();c.arc(X(idx),Y(p.c),3.3,0,Math.PI*2);c.fillStyle=bright;c.fill();
 c.restore();
 const selected=nativeCapChart.hover!==null&&nativeCapChart.hover>=0&&nativeCapChart.hover<rows.length?
  nativeCapChart.hover:rows.length-1;
 const selectedPoint=rows[selected];
 if(typeof window.__vertexDrawChartValueFlag==='function')
  window.__vertexDrawChartValueFlag(c,w,L+PW,Y(selectedPoint.c),
   Math.round(selectedPoint.c)+'%',bright);
 host.dataset.plotWidth=String(PW);
 host.dataset.plotLeft=String(L);
 host.dataset.viewCount=String(rows.length);
}
window.__vertexDrawAltcoinIndex=drawExtraAltcoinIndex;

function drawExtraRainbowChart(c,w,h,host){
 const id=vertexChartScope.currentGlobalCapChart,asset=extraRainbowIds[id];
 const points=nativeCapChart.data[id]||[],fit=extraGlobalState.model[id];
 const {rows,all}=nativeCapWindow();
 const empty=$('#globalCapChartEmpty'),stats=$('#globalCapChartStats');
 const subtitle=$('#globalCapFullRangeStatus'),source=$('#globalCapHistorySource');
 if(subtitle)subtitle.textContent=asset+' · Rainbow Chart · '+nativeCapChart.range+
  (rows.length?' · '+nativeCapDate(rows[0].t)+' – '+nativeCapDate(rows.at(-1).t):' · nessun dato nel periodo')+
  ' · scala logaritmica'+(nativeCapChart.range==='1D'?' · rilevazioni giornaliere, non intraday':'');
 const warning=extraGlobalState.loading?'Caricamento dello storico '+asset+'…':
   extraGlobalState.error||(!rows.length?'Nessuno storico verificato '+asset+'/USD ancora disponibile.':'');
 if(empty){empty.textContent=warning;empty.hidden=!warning;}
 if(stats)stats.innerHTML='';
 if(source)source.textContent=(nativeCapChart.sources[id]||asset+'/USD · prezzi storici')+
  ' · '+(extraIsLive(id)?'Ultimo prezzo in '+asset+'/USDT · aggiornamento live':'Prezzi storici archiviati in '+asset+'/USD')+
  ' · Fasce illustrative di regressione logaritmica, ricalcolate sullo storico. Non sono quotazioni, supporti garantiti né previsioni. Frequenza delle osservazioni: '+
  (extraGlobalState.meta[id]?.frequency||'n/d')+'.';
 if(!rows.length||!fit)return;
 const first=rows[0],last=rows.at(-1);
 const zone=extraRainbowZone(last.t,last.c,fit);
 const isCurrent=points.length>0&&last.t===points.at(-1)[0]&&extraIsLive(id);
 const change=rows.length>1&&first.c>0?(last.c/first.c-1)*100:null;
 if(stats)stats.innerHTML='<div><small>'+(isCurrent?'Ultimo prezzo LIVE · USDT':'Prezzo nel periodo · USD')+'</small><strong>'+
  extraMoney(last.c)+'</strong></div>'+
  '<div><small>Variazione '+nativeCapChart.range+'</small><strong>'+
  (change===null?'n/d':(change>=0?'+':'')+change.toFixed(2)+'%')+'</strong></div>'+
  '<div><small>Fascia Rainbow</small><strong>'+extraRainbowZones[zone??4]+'</strong></div>'+
  '<div><small>Periodo sul grafico</small><strong>'+nativeCapDate(first.t)+
  ' – '+nativeCapDate(last.t)+'</strong></div>';
 const left=18,right=92,top=28,bottom=42,plotW=Math.max(80,w-left-right),plotH=Math.max(70,h-top-bottom);
 const x=i=>left+(i+.5)*plotW/rows.length;
 let low=Infinity,high=-Infinity;
 for(const p of rows){
  const log=Math.log(p.c);
  low=Math.min(low,log,extraRainbowLog(p.t,fit,extraRainbowEdges[0]));
  high=Math.max(high,log,extraRainbowLog(p.t,fit,extraRainbowEdges[9]));
 }
 const pad=Math.max(.08,(high-low)*.06);low-=pad;high+=pad;
 const y=val=>top+(high-val)/(high-low)*plotH;
 const muted=nativeCapPalette('--muted','#8f9eaa'),
       text=nativeCapPalette('--text','#edf4ff'),
       line=nativeCapPalette('--line','#3b495a');
 c.font='11px system-ui,sans-serif';c.textBaseline='middle';
 for(let k=0;k<=5;k++){
  const lv=low+(high-low)*k/5,cy=y(lv);
  c.globalAlpha=.47;c.strokeStyle=line;c.lineWidth=.8;c.beginPath();
  c.moveTo(left,cy);c.lineTo(left+plotW,cy);c.stroke();c.globalAlpha=1;
  c.textAlign='left';c.fillStyle=muted;c.fillText(extraMoney(Math.exp(lv)),w-right+8,cy);
 }
 for(let k=0;k<=5;k++){
  const i=Math.min(rows.length-1,Math.floor((rows.length-1)*k/5));
  c.textAlign='center';c.fillStyle=muted;
  c.fillText(new Date(rows[i].t).toLocaleDateString('it-IT',{
   month:'short',year:'2-digit',timeZone:'UTC'
  }),x(i),h-17);
 }
 c.save();c.beginPath();c.rect(left,top,plotW,plotH);c.clip();
 const sample=[],stride=Math.max(1,Math.ceil(rows.length/450));
 for(let i=0;i<rows.length;i+=stride)sample.push(i);
 if(sample.at(-1)!==rows.length-1)sample.push(rows.length-1);
 for(let band=0;band<9;band++){
  c.beginPath();
  for(let i=0;i<sample.length;i++){
   const p=rows[sample[i]],tx=x(sample[i]);
   const ty=y(extraRainbowLog(p.t,fit,extraRainbowEdges[band+1]));
   if(!i)c.moveTo(tx,ty);else c.lineTo(tx,ty);
  }
  for(let i=sample.length-1;i>=0;i--){
   const p=rows[sample[i]];
   c.lineTo(x(sample[i]),y(extraRainbowLog(p.t,fit,extraRainbowEdges[band])));
  }
  c.closePath();c.globalAlpha=.51;c.fillStyle=extraRainbowColors[band];c.fill();
 }
 c.globalAlpha=1;
 c.beginPath();
 rows.forEach((p,i)=>i?c.lineTo(x(i),y(Math.log(p.c))):c.moveTo(x(i),y(Math.log(p.c))));
 c.lineJoin='round';c.lineCap='round';c.strokeStyle=text;c.lineWidth=1.8;
 c.shadowColor='#0006';c.shadowBlur=3;c.stroke();c.shadowBlur=0;
 // Make single-day windows legible even when only one daily close exists.
 const lastIndex=rows.length-1;
 if(lastIndex>=0){
  c.beginPath();c.arc(x(lastIndex),y(Math.log(rows[lastIndex].c)),3.5,0,Math.PI*2);
  c.fillStyle=text;c.fill();
 }
 if(nativeCapChart.hover!==null&&nativeCapChart.hover>=0&&nativeCapChart.hover<rows.length){
  const p=rows[nativeCapChart.hover],px=x(nativeCapChart.hover),py=y(Math.log(p.c));
  c.setLineDash([4,4]);c.strokeStyle=text;c.lineWidth=.8;c.beginPath();
  c.moveTo(px,top);c.lineTo(px,top+plotH);c.stroke();c.setLineDash([]);
  c.beginPath();c.arc(px,py,3,0,Math.PI*2);c.fillStyle=text;c.fill();
 }
 c.restore();
 c.fillStyle=muted;c.textAlign='left';c.font='10px system-ui,sans-serif';
 c.fillText('USD · PREZZO LOGARITMICO · MODELLO RAINBOW',left,14);
 const selected=nativeCapChart.hover!==null&&nativeCapChart.hover>=0&&nativeCapChart.hover<rows.length?
  nativeCapChart.hover:rows.length-1;
 const selectedPoint=rows[selected];
 if(typeof window.__vertexDrawChartValueFlag==='function')
  window.__vertexDrawChartValueFlag(c,w,left+plotW,y(Math.log(selectedPoint.c)),
   extraMoney(selectedPoint.c),nativeCapPalette('--brand','#2387da'));
 host.dataset.plotWidth=String(plotW);
 host.dataset.plotLeft=String(left);
 host.dataset.viewCount=String(rows.length);
}


// Explicit bridge for the main dashboard renderer and hover tooltips.
window.__vertexDrawRainbowChart=drawExtraRainbowChart;
window.__vertexRainbowTooltip=extraRainbowTooltip;

// Render header values as soon as Global opens. Do not wait for a chart click.
// Both scripts are deferred; DOMContentLoaded fires once the host dashboard
// and this module are available. Subsequent navigation is handled in render().
function bootstrapExtraGlobalCaps(){
 if(typeof state==='undefined'||state.page!=='global')return;
 updateExtraGlobalPillData();
 loadExtraGlobalCharts();
}
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',bootstrapExtraGlobalCaps,{once:true});
else bootstrapExtraGlobalCaps();
