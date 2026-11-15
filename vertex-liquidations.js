/* Vertex · Coinglass-style liquidation heatmap. This renderer NEVER derives
   liquidation levels from price candles, volumes or arbitrary gradients.
   It only draws genuine CoinGlass data in the documented API structure.
   Access requires separately authorized data; no browser-side API keys.
*/
(function(){
'use strict';
const COINS=[['BTC','Bitcoin'],['ETH','Ethereum'],['SOL','Solana'],['HYPE','Hyperliquid'],['BNB','BNB'],['XRP','XRP'],['DOGE','Dogecoin'],['ADA','Cardano'],['AVAX','Avalanche'],['LINK','Chainlink'],['SUI','Sui'],['TAO','Bittensor'],['INJ','Injective'],['TRX','Tron']];
const RANGES=[['12h','12 ore'],['24h','24 ore'],['3d','3 giorni'],['7d','7 giorni'],['30d','30 giorni'],['90d','3 mesi'],['180d','6 mesi'],['1y','1 anno']];
const allowed=new Set(COINS.map(x=>x[0])),validRanges=new Set(RANGES.map(x=>x[0]));
const storage='vertex-liquidations-selected-coin';
let coin='BTC',range='1y',model='model1';
let dataset=null,sourceLabel='',verifiedIdentity=false,loadSeq=0,threshold=.59;
const cache=new Map();
try{const saved=JSON.parse(localStorage.getItem(storage));if(allowed.has(saved))coin=saved}catch(_e){}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const official='https://www.coinglass.com/pro/futures/LiquidationHeatMap';
const rangeName=()=>RANGES.find(x=>x[0]===range)?.[1]||range;
const nativeTitle=()=> 'Binance '+coin+'/USDT Liquidation Heatmap ('+rangeName()+')';
const filename=()=> 'binance-'+coin.toLowerCase()+'usdt-'+model+'-'+range+'.json';
const archive=()=> './chart-history/liquidations/'+filename();
const num=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const fmt=(n,d=2)=>Number(n).toLocaleString('it-IT',{maximumFractionDigits:d});
const clean=t=>String(t||'').replace(/[^a-z0-9._/-]/gi,'').slice(0,180);
function page(){
 const coinOptions=COINS.map(([symbol,name])=>'<option value="'+symbol+'"'+(coin===symbol?' selected':'')+'>'+esc(name)+' ('+symbol+')</option>').join('');
 const timeOptions=RANGES.map(([value,label])=>'<option value="'+value+'"'+(range===value?' selected':'')+'>'+label+'</option>').join('');
 const models=['model1','model2','model3'].map((name,i)=>'<button type="button" class="vlx-model'+(model===name?' is-active':'')+'" data-vlx-model="'+name+'" aria-pressed="'+(model===name)+'">Model '+(i+1)+'</button>').join('');
 return '<section class="vertex-liquidations vlx" aria-label="Liquidation Heatmap">'+
  '<div class="vlx-native">'+
   '<header class="vlx-head"><h2 id="vlxTitle">'+esc(nativeTitle())+'</h2>'+
    '<div class="vlx-models" role="group" aria-label="Modello di liquidazioni">'+models+'</div>'+
    '<div class="vlx-controls"><label>Asset <select id="vertexLiqCoin" aria-label="Criptovaluta">'+coinOptions+'</select></label>'+
     '<label>Periodo <select id="vlxRange" aria-label="Periodo dello storico">'+timeOptions+'</select></label>'+
     '<button data-vlx-action="reload" title="Ricarica dati disponibili" aria-label="Ricarica dati">↻</button>'+
     '<a href="'+official+'" target="_blank" rel="noopener noreferrer">CoinGlass ↗</a></div>'+
    '<div class="vlx-legend"><span><i class="vlx-purple"></i> Intensità di liquidazione stimata</span>'+
     '<span><i class="vlx-green"></i> Prezzo OHLC</span>'+
     '<label>Soglia di liquidità <output id="vlxThreshold">'+fmt(threshold)+'</output>'+
      ' <input id="vlxThresholdInput" type="range" min="0" max="1" step="0.01" value="'+threshold+'" aria-label="Soglia di visualizzazione"/></label></div>'+
   '</header>'+
   '<div class="vlx-plot" id="vlxPlot">'+
    '<div class="vlx-gradient" aria-label="Scala intensità dal viola al giallo">'+
     '<span id="vlxMaximum">Intensità</span><div class="vlx-scale-bar"></div><span>0</span></div>'+
    '<div class="vlx-canvas-wrap">'+
     '<canvas id="vlxCanvas" height="510" role="img" aria-label="Grafico CoinGlass: heatmap e candele OHLC reali, solo quando sono disponibili dati autorizzati"></canvas>'+
     '<div class="vlx-empty" id="vlxEmpty" role="status">'+
      '<strong>Storico annuale CoinGlass: dati autorizzati richiesti</strong>'+
      '<span>Lo storico Binance '+coin+'/USDT per '+esc(rangeName())+' richiede un abbonamento API CoinGlass Professional o superiore. Puoi importare un archivio JSON CoinGlass autorizzato o consultare il grafico ufficiale. Non vengono simulati livelli di liquidazione.</span>'+
      '<div class="vlx-empty-actions"><label for="vlxFile" class="vlx-upload">Carica dati CoinGlass (.json)</label>'+
       '<a href="'+official+'" target="_blank" rel="noopener noreferrer">Apri la heatmap ufficiale ↗</a></div>'+
      '</div>'+
     '<div id="vlxHover" class="vlx-hover" hidden></div>'+
    '</div></div>'+
   '<input id="vlxFile" type="file" accept=".json,application/json" hidden>'+
   '<div class="vlx-status"><span id="vlxStatus">Ricerca di dati CoinGlass autorizzati…</span>'+
    '<span id="vlxSource">CoinGlass Model 1 · Binance '+coin+'/USDT · '+esc(rangeName())+'</span></div>'+
   '<p class="vlx-notice">La scala rappresenta l’<strong>intensità stimata dal modello</strong>, non USD liquidati. '+
    'Lo storico a 1 anno e i modelli CoinGlass richiedono dati API Professional autorizzati. '+
    'Importare un file non verifica automaticamente che appartenga a Binance '+coin+'/USDT: per identificarlo servono exchange, symbol, range e model nei metadati. '+
    'Il file viene letto solo nel tuo browser e non è caricato su server.</p>'+
   '</div>'+
  '</section>';
}
function normalize(raw){
 const obj=raw&&typeof raw==='object'?raw:null;
 const d=obj?.data?.y_axis?obj.data:obj;
 if(!d||!Array.isArray(d.y_axis)||!Array.isArray(d.price_candlesticks)||
    !Array.isArray(d.liquidation_leverage_data))throw Error('Formato dati CoinGlass non riconosciuto.');
 const levels=d.y_axis.map(Number);
 if(levels.length<2||levels.length>10000||levels.some(y=>!Number.isFinite(y)||y<=0))
  throw Error('Asse dei prezzi non valido.');
 const candles=d.price_candlesticks.map(row=>{
  if(!Array.isArray(row)||row.length<5)return null;
  let t=num(row[0]),o=num(row[1]),h=num(row[2]),l=num(row[3]),c=num(row[4]);
  if(t>1e11)t=Math.floor(t/1000);
  if([t,o,h,l,c].some(n=>n===null)||t<946684800||o<=0||l<=0||h<Math.max(o,c)||l>Math.min(o,c))return null;
  return {t,o,h,l,c};
 });
 if(candles.length<2||candles.length>8000||candles.some(c=>!c))
  throw Error('Candele OHLC non valide.');
 let prior=0;
 for(const c of candles){if(c.t<prior)throw Error('Le candele non sono in ordine temporale.');prior=c.t}
 const points=d.liquidation_leverage_data;
 if(points.length>1500000)throw Error('File troppo grande: massimo 1,5 milioni di celle.');
 const heat=[];
 let max=0;
 for(const p of points){
  if(!Array.isArray(p)||p.length<3)continue;
  const x=Number(p[0]),y=Number(p[1]),v=Number(p[2]);
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=candles.length||
   y<0||y>=levels.length||!Number.isFinite(v)||v<0)continue;
  if(v>0){heat.push([x,y,v]);if(v>max)max=v}
 }
 if(!heat.length||max<=0)throw Error('Nessuna intensità di liquidazione reale nel file.');
 const metadata=obj?.metadata||obj?.meta||obj||{};
 const exchange=String(metadata.exchange||'').toLowerCase();
 const sym=String(metadata.symbol||metadata.pair||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
 const r=String(metadata.range||'').toLowerCase();
 const m=String(metadata.model||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const verified=exchange==='binance'&&sym===coin+'USDT'&&r===range&&m===model;
 const labeled=!!(exchange&&sym&&r&&m);
 if(labeled&&!verified)throw Error('Il file appartiene a un mercato, intervallo o modello differente.');
 return {levels,candles,heat,max,verified,updated:Number(d.update_time)||null};
}
const palette=[[0,[57,0,75]],[.16,[104,0,136]],[.3,[30,69,164]],[.46,[21,169,205]],[.61,[18,191,138]],[.75,[81,209,84]],[.88,[176,223,36]],[1,[255,238,17]]];
function color(t){
 t=Math.max(0,Math.min(1,t));
 for(let i=1;i<palette.length;i++)if(t<=palette[i][0]){
  const [p,a]=palette[i-1],[q,b]=palette[i],u=(t-p)/(q-p);
  return 'rgb('+a.map((v,k)=>Math.round(v+(b[k]-v)*u)).join(',')+')';
 }
 return 'rgb(255,238,17)';
}
function paint(){
 const canvas=document.getElementById('vlxCanvas');
 if(!canvas)return;
 const cssWidth=Math.max(250,canvas.getBoundingClientRect().width||950);
 const cssHeight=510,dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(cssWidth*dpr);
 canvas.height=Math.round(cssHeight*dpr);
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const W=cssWidth,H=cssHeight,left=8,right=67,top=16,bottom=87,plotW=W-left-right,plotH=H-top-bottom;
 ctx.fillStyle='#151921';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#420052';ctx.fillRect(left,top,plotW,plotH);
 const obj=dataset;
 const empty=document.getElementById('vlxEmpty');
 if(empty)empty.hidden=!!obj;
 const scale=document.getElementById('vlxMaximum');
 if(scale)scale.textContent=obj?'Intensità max '+fmt(obj.max,0):'Intensità';
 if(!obj){
  ctx.strokeStyle='rgba(218,218,235,.08)';ctx.lineWidth=1;
  for(let k=0;k<=5;k++){const y=top+k*plotH/5;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+plotW,y);ctx.stroke();}
  return;
 }
 const {levels,candles,heat,max}=obj;
 const minPrice=Math.min(...levels,...candles.map(c=>c.l));
 const maxPrice=Math.max(...levels,...candles.map(c=>c.h));
 const span=Math.max(1,maxPrice-minPrice),X=i=>left+(i+.5)*plotW/candles.length;
 const Y=v=>top+(maxPrice-v)/span*plotH;
 const cellW=Math.max(1,plotW/candles.length+0.55);
 const sorted=[...levels].sort((a,b)=>a-b);
 const resY=(sorted.at(-1)-sorted[0])/Math.max(1,levels.length-1);
 const cellH=Math.max(1,plotH*resY/span+1.3);
 const minCut=threshold*.075;
 const step=Math.max(1,Math.ceil(heat.length/420000));
 for(let k=0;k<heat.length;k+=step){
  const [xi,yi,v]=heat[k];
  const t=Math.log1p(v)/Math.log1p(max);
  if(t<minCut)continue;
  ctx.fillStyle=color(Math.max(0,(t-minCut)/(1-minCut)));
  ctx.fillRect(X(xi)-cellW/2,Y(levels[yi])-cellH/2,cellW,cellH);
 }
 ctx.strokeStyle='rgba(245,251,255,.19)';ctx.lineWidth=1;
 const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:maxPrice>1000?0:2});
 for(let k=0;k<=5;k++){
  const yy=top+plotH*k/5;
  ctx.strokeStyle='rgba(245,251,255,.08)';ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(left+plotW,yy);ctx.stroke();
  ctx.fillStyle='#d9d7ea';ctx.font='11px Inter,sans-serif';ctx.textAlign='left';
  ctx.fillText(nf.format(maxPrice-(k/5)*span),left+plotW+7,yy+4);
 }
 const candleStep=Math.max(1,Math.ceil(candles.length/(plotW*.75)));
 const bodyW=Math.max(1,Math.min(7,plotW/candles.length*.62));
 ctx.lineWidth=1.05;
 for(let i=0;i<candles.length;i+=candleStep){
  const c=candles[i],x=X(i),rise=c.c>=c.o;
  ctx.strokeStyle=rise?'#38ffbe':'#fe588f';
  ctx.fillStyle=ctx.strokeStyle;
  ctx.beginPath();ctx.moveTo(x,Y(c.h));ctx.lineTo(x,Y(c.l));ctx.stroke();
  const a=Y(Math.max(c.o,c.c)),b=Y(Math.min(c.o,c.c));
  ctx.fillRect(x-bodyW/2,a,bodyW,Math.max(1,b-a));
 }
 const dateFmt=new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',timeZone:'UTC'});
 ctx.fillStyle='#d0c9e2';ctx.font='10px Inter,sans-serif';ctx.textAlign='center';
 for(let j=0;j<=7;j++){const ix=Math.min(candles.length-1,Math.floor((candles.length-1)*j/7));ctx.fillText(dateFmt.format(new Date(candles[ix].t*1000)),X(ix),H-bottom+20)}
 const miniTop=H-49,miniH=29;
 ctx.fillStyle='rgba(25,93,160,.18)';ctx.fillRect(left,miniTop,plotW,miniH);
 const closes=candles.map(c=>c.c),lo=Math.min(...closes),hi=Math.max(...closes);
 ctx.strokeStyle='#9db6ee';ctx.lineWidth=1.1;ctx.beginPath();
 closes.forEach((value,i)=>{
  const x=X(i),y=miniTop+miniH-(value-lo)/Math.max(1e-8,hi-lo)*miniH;
  if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 });
 ctx.stroke();ctx.lineTo(X(candles.length-1),miniTop+miniH);ctx.lineTo(X(0),miniTop+miniH);
 ctx.closePath();ctx.fillStyle='rgba(87,122,230,.21)';ctx.fill();
 canvas.dataset.plot=JSON.stringify({left,right,top,bottom,plotW,plotH,minPrice,maxPrice});
}
function status(text,error=false){
 const el=document.getElementById('vlxStatus');
 if(el){el.textContent=text;el.dataset.error=String(error)}
}
function setData(raw,label){
 const parsed=normalize(raw);
 dataset=parsed;sourceLabel=label;verifiedIdentity=parsed.verified;
 const heading=document.getElementById('vlxTitle');
 if(heading)heading.textContent=verifiedIdentity?nativeTitle():
  'Liquidation Heatmap · origine mercato non verificata';
 const date=parsed.updated?new Date(parsed.updated).toLocaleString('it-IT'):'non indicata';
 status((verifiedIdentity?'Dati e identità verificati':'Dati reali importati · identità della coppia non verificata')+
  ' · '+parsed.candles.length+' candele · '+fmt(parsed.heat.length,0)+' celle · aggiornamento '+date);
 const el=document.getElementById('vlxSource');
 if(el)el.textContent=label+(verifiedIdentity?' · Binance '+coin+'/USDT':' · verificare manualmente provenienza');
 paint();
}
function activate(force=false){
 if(!force&&dataset&&sourceLabel.startsWith('File locale ')){
  paint();return;
 }
 dataset=null;paint();status('Controllo disponibilità dei dati '+model+' · '+rangeName()+'…');
 const current=++loadSeq,key=filename(),found=cache.get(key);
 if(found){try{setData(found,'Archivio CoinGlass autorizzato')}catch(e){status(e.message,true)}return}
 fetch(archive(),{cache:'no-store'}).then(r=>{
  if(!r.ok)throw Error('Assenti');
  return r.json();
 }).then(raw=>{
  if(current!==loadSeq)return;
  const parsed=normalize(raw);
  if(!parsed.verified)throw Error('Archivio senza metadati verificabili.');
  cache.set(key,raw);
  setData(raw,'Archivio CoinGlass autorizzato');
 }).catch(()=>{
  if(current!==loadSeq)return;
  dataset=null;status('Dati CoinGlass '+rangeName()+' non collegati: carica un JSON autorizzato o apri la fonte.');
  paint();
 });
}
function updateCoin(next){
 if(!allowed.has(next))return;
 if(next!==coin){coin=next;dataset=null;sourceLabel='';try{localStorage.setItem(storage,JSON.stringify(coin))}catch(_e){}}
 const title=document.getElementById('vlxTitle');if(title)title.textContent=nativeTitle();
 const select=document.getElementById('vertexLiqCoin');if(select&&select.value!==coin)select.value=coin;
 activate();
}
function modelSelect(next){
 if(!['model1','model2','model3'].includes(next))return;
 model=next;dataset=null;sourceLabel='';
 document.querySelectorAll('[data-vlx-model]').forEach(b=>{
  const on=b.dataset.vlxModel===model;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));
 });
 const source=document.getElementById('vlxSource');if(source)source.textContent='CoinGlass '+model.replace('model','Model ')+' · Binance '+coin+'/USDT · '+rangeName();
 activate();
}
document.addEventListener('change',e=>{
 if(e.target?.id==='vertexLiqCoin')updateCoin(e.target.value);
 if(e.target?.id==='vlxRange'&&validRanges.has(e.target.value)){
  range=e.target.value;dataset=null;sourceLabel='';document.getElementById('vlxTitle').textContent=nativeTitle();activate();
 }
 if(e.target?.id==='vlxFile'){
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>30*1024*1024){status('Il file supera il limite di 30 MB.',true);return}
  const current=++loadSeq;
  file.text().then(str=>{
   if(current!==loadSeq)return;
   let raw=JSON.parse(str);
   setData(raw,'File locale '+clean(file.name));
  }).catch(err=>{if(current===loadSeq){status('Importazione non riuscita: '+String(err.message||err),true);dataset=null;paint()}});
  e.target.value='';
 }
});
document.addEventListener('input',e=>{
 if(e.target?.id==='vlxThresholdInput'){
  threshold=Math.min(1,Math.max(0,Number(e.target.value)||0));
  const output=document.getElementById('vlxThreshold');if(output)output.textContent=fmt(threshold);
  paint();
 }
});
document.addEventListener('click',e=>{
 const btn=e.target?.closest?.('[data-vlx-model],[data-vlx-action]');
 if(!btn)return;
 if(btn.dataset.vlxModel){modelSelect(btn.dataset.vlxModel);return}
 if(btn.dataset.vlxAction==='reload'){cache.delete(filename());sourceLabel='';activate(true);return}
});
document.addEventListener('mousemove',e=>{
 const canvas=e.target?.closest?.('#vlxCanvas');
 const tooltip=document.getElementById('vlxHover');
 if(!canvas||!tooltip||!dataset)return;
 const p=canvas.getBoundingClientRect(),info=JSON.parse(canvas.dataset.plot||'null');
 if(!info)return;
 const x=(e.clientX-p.left)/p.width*p.width;
 const index=Math.floor((x-info.left)/info.plotW*dataset.candles.length);
 if(index<0||index>=dataset.candles.length){tooltip.hidden=true;return}
 const b=dataset.candles[index];
 tooltip.textContent=new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short',timeZone:'UTC'}).format(new Date(b.t*1000))+
  ' UTC | O '+fmt(b.o)+' · H '+fmt(b.h)+' · L '+fmt(b.l)+' · C '+fmt(b.c);
 tooltip.hidden=false;
 tooltip.style.left=Math.min(Math.max(8,x),p.width-275)+'px';
 tooltip.style.top='6px';
});
document.addEventListener('mouseout',e=>{
 if(e.target?.id==='vlxCanvas'){const hover=document.getElementById('vlxHover');if(hover)hover.hidden=true}
});
window.addEventListener('resize',()=>{if(dataset)paint()});
window.VertexLiquidations=Object.freeze({page,activate,select:coin=>updateCoin(coin),parse:normalize});
})();
