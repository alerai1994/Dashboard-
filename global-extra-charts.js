/* Vertex Global: Altcoin Index and BTC/ETH logarithmic Rainbow charts.
   Market data is downloaded from the versioned first-party JSON archive.
   All rainbow bands are descriptive regressions fitted to observed closes:
   they are NOT market prices, valuation guarantees or forecasts. */
const extraGlobalState={
 loading:false,loaded:false,error:'',model:Object.create(null),
 meta:Object.create(null)
};
const extraRainbowIds=Object.freeze({BTC_RAINBOW:'BTC',ETH_RAINBOW:'ETH'});
const extraRainbowColors=['#5154c9','#3c82df','#2baddf','#27bdac','#76c77e','#bcd458','#ead04d','#f19d44','#e15d60'];
const extraRainbowZones=['Sconto profondo','Sottovalutato','Accumulo','Ancora economico','Nella media','Sopra tendenza','Mercato caldo','Euforia','Molto caldo'];
const extraRainbowEdges=[-2.25,-1.75,-1.25,-.75,-.25,.25,.75,1.25,1.75,2.25];
function isRainbowExtraChart(id){return Object.hasOwn(extraRainbowIds,id||'');}
function extraCleanPoints(input){
 const dedup=new Map();
 for(const row of Array.isArray(input)?input:[]){
  if(!Array.isArray(row)||row.length<2)continue;
  const t=Number(row[0]),v=Number(row[1]);
  if(Number.isFinite(t)&&t>1250000000000&&Number.isFinite(v)&&v>0)dedup.set(t,[t,v]);
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
  '<span>'+asset+'/USD '+extraMoney(candle.c)+'</span>'+
  (zone===null?'':'<span>Zona: '+extraRainbowZones[zone]+'</span>');
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
  const alt=payload?.alt_market||{};
  if(alt.symbol==='CRYPTOCAP:OTHERS'){
   const points=extraCleanPoints(alt.points);
   nativeCapChart.data.ALTCOIN=points;
   nativeCapChart.sources.ALTCOIN=alt.source||'CRYPTOCAP:OTHERS';
   extraGlobalState.meta.ALTCOIN={frequency:alt.frequency||'1D',source:alt.source};
   const known=new Map(points),candles=new Map();
   for(const row of Array.isArray(alt.bars)?alt.bars:[]){
    if(!Array.isArray(row)||row.length<5)continue;
    const [t,o,h,l,c]=row.slice(0,5).map(Number);
    if(!known.has(t)||![o,h,l,c].every(v=>Number.isFinite(v)&&v>0))continue;
    if(l>Math.min(o,c)||Math.max(o,c)>h||Math.abs(c-known.get(t))>c*.00001)continue;
    candles.set(t,[o,h,l,c]);
   }
   if(candles.size>800)nativeCapChart.ohlc.ALTCOIN=candles;
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
  for(const id of ['ALTCOIN','BTC_RAINBOW','ETH_RAINBOW']){
   const pill=document.querySelector('[data-special-cap="'+id+'"]');
   const rows=nativeCapChart.data[id];
   if(!pill||!rows?.length)continue;
   const value=rows[rows.length-1][1];
   pill.textContent=id==='ALTCOIN'?nativeCapUsd(value):extraMoney(value);
  }
  extraGlobalState.error='';
  extraGlobalState.loaded=true;
 }catch(error){
  extraGlobalState.error='Dati non disponibili: '+(error?.message||'errore');
 }finally{
  clearTimeout(timeout);extraGlobalState.loading=false;
  if(state.page==='global'&&['ALTCOIN','BTC_RAINBOW','ETH_RAINBOW'].includes(currentGlobalCapChart))
   paintGlobalCapChart();
 }
}
function drawExtraRainbowChart(c,w,h,host){
 const id=currentGlobalCapChart,asset=extraRainbowIds[id];
 const points=nativeCapChart.data[id]||[],fit=extraGlobalState.model[id];
 const {rows,all}=nativeCapWindow();
 const empty=$('#globalCapChartEmpty'),stats=$('#globalCapChartStats');
 const subtitle=$('#globalCapFullRangeStatus'),source=$('#globalCapHistorySource');
 if(subtitle)subtitle.textContent=asset+' · Rainbow Chart · '+nativeCapChart.timeframe+
  ' · prezzi su scala logaritmica';
 const warning=extraGlobalState.loading?'Caricamento dello storico '+asset+'…':
   extraGlobalState.error||(!rows.length?'Nessuno storico verificato '+asset+'/USD ancora disponibile.':'');
 if(empty){empty.textContent=warning;empty.hidden=!warning;}
 if(stats)stats.innerHTML='';
 if(source)source.textContent=(nativeCapChart.sources[id]||asset+'/USD · prezzi storici')+
  ' · Fasce illustrative di regressione logaritmica, ricalcolate sullo storico. Non sono quotazioni, supporti garantiti né previsioni. Frequenza delle osservazioni: '+
  (extraGlobalState.meta[id]?.frequency||'n/d')+'.';
 if(!rows.length||!fit)return;
 const first=points[0],last=points[points.length-1];
 const zone=extraRainbowZone(last[0],last[1],fit);
 if(stats)stats.innerHTML='<div><small>Ultimo prezzo archiviato</small><strong>'+
  extraMoney(last[1])+'</strong></div>'+
  '<div><small>Fascia Rainbow</small><strong>'+extraRainbowZones[zone??4]+'</strong></div>'+
  '<div><small>Periodo disponibile</small><strong>'+nativeCapDate(first[0])+
  ' – '+nativeCapDate(last[0])+'</strong></div>';
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
 if(nativeCapChart.hover!==null&&nativeCapChart.hover>=0&&nativeCapChart.hover<rows.length){
  const p=rows[nativeCapChart.hover],px=x(nativeCapChart.hover),py=y(Math.log(p.c));
  c.setLineDash([4,4]);c.strokeStyle=text;c.lineWidth=.8;c.beginPath();
  c.moveTo(px,top);c.lineTo(px,top+plotH);c.stroke();c.setLineDash([]);
  c.beginPath();c.arc(px,py,3,0,Math.PI*2);c.fillStyle=text;c.fill();
 }
 c.restore();
 c.fillStyle=muted;c.textAlign='left';c.font='10px system-ui,sans-serif';
 c.fillText('USD · PREZZO LOGARITMICO · MODELLO RAINBOW',left,14);
 host.dataset.plotWidth=String(plotW);
 host.dataset.plotLeft=String(left);
 host.dataset.viewCount=String(rows.length);
}
