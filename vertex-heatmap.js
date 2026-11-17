/* Vertex Crypto Heatmap — independent Markets visualisation.
   Prices are observed quotes only. CoinGecko may be rate limited; Vertex's own
   42-crypto feed remains a fully functional fallback. */
(function(){
'use strict';
const API='https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h';
const intervalMs=150000;
const state={coins:[],fetchedAt:0,attemptedAt:0,fetching:false,error:'',query:'',sort:'cap',all:false,
 logoAt:0,logoLoading:false,logoCache:new Map(),snapshotAt:0,snapshotStatus:'',snapshotCheckedAt:0};
const LOGO_STORE='vertex-heatmap-coingecko-logos-v1';
try{
 const cached=JSON.parse(localStorage.getItem(LOGO_STORE)||'{}');
 if(cached&&typeof cached==='object'){
  for(const [id,url] of Object.entries(cached)){
   if(/^[a-z0-9-]{1,100}$/.test(id)&&typeof url==='string')
    state.logoCache.set(id,url);
  }
 }
}catch(_error){}
function rememberLogos(){
 try{localStorage.setItem(LOGO_STORE,JSON.stringify(Object.fromEntries(state.logoCache)))}catch(_error){}
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const backend=()=>window.__vertexPriceBoardBackend;
const coinAssets=()=>backend()?.assets?.filter(a=>a.group==='crypto')||[];
const assetSymbol=a=>String(a.symbol||a.short||a.id||'').replace(/-(?:USD|USDT)$/i,'').toLowerCase();
function logo(url){
 if(typeof url!=='string')return '';
 try{
  const parsed=new URL(url);
  if(parsed.protocol==='https:'&&['coin-images.coingecko.com','assets.coingecko.com'].includes(parsed.hostname))return parsed.href;
 }catch(_error){}
 return '';
}
function priceText(n){
 if(!finite(n)||n<=0)return '—';
 if(n<.000001)return '$'+n.toExponential(2);
 return '$'+new Intl.NumberFormat('en-US',{maximumSignificantDigits:4}).format(n);
}
function smallAmount(n){
 if(!finite(n)||n<=0)return '—';
 if(n>=1e12)return '$'+(n/1e12).toFixed(2)+'T';
 if(n>=1e9)return '$'+(n/1e9).toFixed(2)+'B';
 if(n>=1e6)return '$'+(n/1e6).toFixed(1)+'M';
 return '$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n);
}
function changeText(n){
 if(!finite(n))return '—';
 if(n!==0&&Math.abs(n)<.005)return (n>0?'+':'−')+'<0.01%';
 return (n>0?'+':'')+n.toFixed(2)+'%';
}
function fallback(){
 const data=[];
 for(const a of coinAssets()){
  const q=backend()?.getQuote?.(a.id);
  const price=Number(q?.value);
  const change=Number(q?.change);
  // Keep even an asset without a spot quote: its verified historical
  // archive can still be opened from the crypto map.
  const lastPrice=Number.isFinite(price)&&price>0?price:null;
  data.push({id:a.coingeckoId||a.id,name:a.name,symbol:assetSymbol(a),price:lastPrice,
   change:q?.change==null?null:Number.isFinite(change)?change:null,
   marketCap:null,volume:null,rank:null,image:logo(q?.logo)||logo(state.logoCache.get(a.coingeckoId)),localId:a.id});
 }
 return data;
}
function list(){
 // CoinGecko ID and Vertex local ID must both match the catalog identity.
 // Last-known stale data must not masquerade as a green or red fresh quote.
 const byId=new Map(state.coins.map(c=>[c.id,c]));
 const byLocal=new Map(state.coins.filter(c=>c.localId).map(c=>[c.localId,c]));
 return fallback().map(local=>{
  const record=byLocal.get(local.localId)||byId.get(local.id);
  if(!record)return local;
  const timestamp=Date.parse(record.observedAt||'');
  const fresh=Number.isFinite(timestamp)&&Date.now()-timestamp>=0&&
   Date.now()-timestamp<2*3600000;
  const validFromSource=fresh&&finite(record.price)&&record.price>0;
  const verifiedLocal=finite(local.price)&&local.price>0;
  return {...local,...record,localId:local.localId,
   id:local.id,name:local.name,symbol:local.symbol,
   price:validFromSource?record.price:verifiedLocal?local.price:null,
   change:validFromSource?record.change:verifiedLocal?local.change:null,
   image:logo(record.image)||logo(local.image)||logo(state.logoCache.get(local.id)),
   stale:!fresh&&!verifiedLocal};
 });
}
async function loadCatalogSnapshot(){
 state.snapshotCheckedAt=Date.now();
 try{
  const response=await fetch('./crypto-heatmap-data.json?v='+Math.floor(Date.now()/120000),
   {cache:'no-store'});
  if(!response.ok)throw Error('Snapshot HTTP '+response.status);
  const data=await response.json();
  if(data?.catalogSize!==288||!Array.isArray(data.coins))throw Error('Invalid catalog');
  const catalog=new Map(coinAssets().map(asset=>[asset.id,asset.coingeckoId||asset.id]));
  const verified=[];
  for(const raw of data.coins){
   if(!raw||catalog.get(raw.localId)!==raw.id)continue;
   const image=logo(raw.image);
   const price=Number(raw.price);
   const change=raw.change===null?null:Number(raw.change);
   const date=Date.parse(raw.observedAt||'');
   const fresh=Number.isFinite(date)&&date<=Date.now()+300000&&
    Date.now()-date<2*3600000;
   if(image)state.logoCache.set(raw.id,image);
   verified.push({id:raw.id,localId:raw.localId,
    price:fresh&&finite(price)&&price>0?price:null,
    change:fresh&&finite(change)?change:null,
    marketCap:raw.marketCap??null,volume:raw.volume??null,rank:raw.rank??null,
    image,observedAt:raw.observedAt,source:'CoinGecko · snapshot verificato'});
  }
  // Reconcile every verified asset, not only previously unseen ones. The old
  // code ignored refreshed snapshot percentages once a coin was in the map.
  const known=new Map(state.coins.map(c=>[c.id,c]));
  for(const item of verified){
   const prior=known.get(item.id);
   if(!prior){known.set(item.id,item);continue}
   const currentTime=Date.parse(prior.observedAt||'');
   const incomingTime=Date.parse(item.observedAt||'');
   const newer=!Number.isFinite(currentTime)||
    Number.isFinite(incomingTime)&&incomingTime>=currentTime;
   const incomingChange=finite(item.change);
   const previousChange=finite(prior.change);
   known.set(item.id,{
    ...prior,
    ...(newer?item:{
     // A new verified percentage may fill a missing one, but not replace
     // a more recent verified move with an older move.
     ...(incomingChange&&!previousChange?{change:item.change}:{}),
     ...(logo(item.image)&&!logo(prior.image)?{image:item.image}:{})
    }),
    image:logo(item.image)||logo(prior.image),
    // Do not discard a real 24h move when another provider omits this field.
    change:newer&&incomingChange?item.change:
     previousChange?prior.change:incomingChange?item.change:null
   });
  }
  state.coins=[...known.values()];
  state.snapshotAt=Date.parse(data.generatedAt)||0;
  state.snapshotStatus=verified.length+' / '+data.catalogSize;
  rememberLogos();
  paint();
 }catch(_error){state.snapshotStatus='non raggiungibile'}
}
// Asynchronous logo hydration: independent of the price API and resilient to
// CoinGecko throttling. Token identity is the exact CoinGecko ID, not ticker.
let logoRetryAt=0,logoRetryDelay=45000,logoTimer=null;
function scheduleLogoRetry(ms){
 if(logoTimer!==null)clearTimeout(logoTimer);
 logoTimer=setTimeout(()=>{
  logoTimer=null;
  if(document.getElementById('vhGrid')&&!document.hidden)loadCatalogLogos();
 },ms);
}
async function loadCatalogLogos(){
 if(state.logoLoading||document.hidden)return;
 const ids=[...new Set(coinAssets().map(a=>a.coingeckoId).filter(id=>
  typeof id==='string'&&/^[a-z0-9-]{1,100}$/.test(id)))];
 const missing=ids.filter(id=>!logo(state.logoCache.get(id))&&!state.coins.some(c=>c.id===id&&logo(c.image)));
 if(!missing.length){logoRetryDelay=45000;return}
 if(Date.now()<logoRetryAt){scheduleLogoRetry(logoRetryAt-Date.now()+200);return}
 state.logoLoading=true;
 let failed=false,updated=0;
 try{
  // Smaller batches avoid oversized URL / gateway requests. Don't abandon the
  // entire catalog after one failed segment; retry unresolved IDs later.
  for(let i=0;i<missing.length;i+=30){
   if(document.hidden)break;
   const group=missing.slice(i,i+30);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
   try{
    const params=new URLSearchParams({vs_currency:'usd',ids:group.join(','),
     order:'market_cap_desc',per_page:'100',page:'1',sparkline:'false'});
    const response=await fetch('https://api.coingecko.com/api/v3/coins/markets?'+params,
     {cache:'no-store',signal:controller.signal});
    if(response.status===429||response.status===403||response.status===401){
     failed=true;break;
    }
    if(!response.ok){failed=true;continue}
    const body=await response.json();
    if(!Array.isArray(body)){failed=true;continue}
    const allowed=new Set(group);
    for(const c of body){
     const verified=logo(c?.image);
     if(allowed.has(c?.id)&&verified){state.logoCache.set(c.id,verified);updated++}
    }
    if(updated){rememberLogos();if(document.getElementById('vhGrid'))paint()}
   }catch(_error){failed=true}
   finally{clearTimeout(timer)}
   if(i+30<missing.length)await new Promise(resolve=>setTimeout(resolve,1900));
  }
 }finally{
  state.logoLoading=false;state.logoAt=Date.now();
  const remaining=ids.some(id=>!logo(state.logoCache.get(id))&&!state.coins.some(c=>c.id===id&&logo(c.image)));
  if(remaining){
   logoRetryDelay=failed?Math.min(10*60000,logoRetryDelay*2):Math.max(60000,logoRetryDelay);
   logoRetryAt=Date.now()+logoRetryDelay;
   scheduleLogoRetry(logoRetryDelay);
  }else{logoRetryDelay=45000;logoRetryAt=0}
 }
}
function sortCoins(coins){
 const q=state.query.trim().toLocaleLowerCase('it-IT');
 const entries=q?coins.filter(c=>(c.name+' '+c.symbol).toLocaleLowerCase('it-IT').includes(q)):coins;
 const items=entries.slice();
 if(state.sort==='winners')items.sort((a,b)=>(finite(b.change)?b.change:-Infinity)-(finite(a.change)?a.change:-Infinity));
 else if(state.sort==='losers')items.sort((a,b)=>(finite(a.change)?a.change:Infinity)-(finite(b.change)?b.change:Infinity));
 else if(state.sort==='moves')items.sort((a,b)=>(finite(b.change)?Math.abs(b.change):-Infinity)-(finite(a.change)?Math.abs(a.change):-Infinity));
 else if(state.sort==='volume')items.sort((a,b)=>(b.volume||0)-(a.volume||0));
 else items.sort((a,b)=>(a.rank||1e9)-(b.rank||1e9) || (b.marketCap||0)-(a.marketCap||0));
 return items;
}
function alertBoundary(id){
 const direction=backend()?.getAlertBoundary?.(id);
 return direction==='above'||direction==='below'?direction:null;
}
function paintAlertSignals(affected){
 const grid=document.getElementById('vhGrid');
 if(!grid)return;
 // During live ticks, repaint only the symbols whose UPPER/LOW state changed.
 // After a grid re-render, omitted IDs repaint the visible active signals.
 const ids=affected instanceof Set?affected:null;
 const tiles=ids?[...ids].flatMap(id=>{
  const safe=typeof CSS!=='undefined'&&CSS.escape?CSS.escape(id):id.replace(/[^a-z0-9_-]/gi,'');
  return safe?[...grid.querySelectorAll('.vh-tile[data-asset="'+safe+'"]')]:[];
 }):grid.querySelectorAll('.vh-tile[data-asset]');
 for(const tile of tiles){
  const direction=alertBoundary(tile.dataset.asset),price=tile.querySelector('.vh-price');
  if(price){
   price.classList.toggle('crypto-price-upper',direction==='above');
   price.classList.toggle('crypto-price-lower',direction==='below');
  }
 }
}
function tile(c){
 const valid=finite(c.change)&&finite(c.price)&&c.price>0;
 const tone=!valid?'neutral':c.change>0?'up':c.change<0?'down':'neutral';
 const image=logo(c.image)||logo(state.logoCache.get(c.id));
 const icon=image?'<img src="'+esc(image)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">':
  '<span class="vh-fallback-logo">'+esc((c.symbol||'?').slice(0,1).toUpperCase())+'</span>';
 const info=esc(c.name+' ('+c.symbol.toUpperCase()+') · '+priceText(c.price)+' · 24h '+changeText(c.change)+
  (c.localId?' · Tocca per aprire lo storico OHLC e gli indicatori':' · Vedi su CoinGecko'));
 const content='<span class="vh-coin-logo" aria-hidden="true">'+icon+'</span>'+
  '<span class="vh-symbol">'+esc(c.symbol.toUpperCase())+'</span>'+
  '<span class="vh-change">'+esc(changeText(c.change))+'</span>'+
  '<span class="vh-price'+(alertBoundary(c.localId)==='above'?' crypto-price-upper':alertBoundary(c.localId)==='below'?' crypto-price-lower':'')+'">'+esc(priceText(c.price))+'</span>';
 const attrs='class="vh-tile vh-'+tone+'" title="'+info+'" aria-label="'+info+'"';
 if(c.localId)return '<button type="button" '+attrs+' data-asset="'+esc(c.localId)+'">'+content+'</button>';
 const id=encodeURIComponent(c.id);
 return '<a '+attrs+' href="https://www.coingecko.com/en/coins/'+id+'" target="_blank" rel="noopener noreferrer">'+content+'</a>';
}
function statistics(coins){
 const dated=coins.filter(c=>finite(c.change));
 const gain=dated.filter(c=>c.change>0).length;
 const loss=dated.filter(c=>c.change<0).length;
 const knownCap=coins.filter(c=>finite(c.marketCap)&&c.marketCap>0);
 const capSum=knownCap.reduce((sum,c)=>sum+c.marketCap,0);
 const volumeSum=coins.reduce((sum,c)=>sum+(finite(c.volume)?c.volume:0),0);
 const hasCoinGecko=state.coins.length>0;
 const btc=coins.find(c=>c.symbol==='btc');
 const eth=coins.find(c=>c.symbol==='eth');
 const cells=[
  ['ASSET',String(coins.length)],
  ['IN RIALZO',String(gain)],
  ['IN RIBASSO',String(loss)],
  ['BTC 24H',changeText(btc?.change)],
  ['ETH 24H',changeText(eth?.change)],
  ['CAP COPERTA',hasCoinGecko?smallAmount(capSum):'—'],
  ['VOLUME 24H',hasCoinGecko?smallAmount(volumeSum):'—']
 ];
 return cells.map(([label,value])=>'<span class="vh-stat"><small>'+label+'</small><strong>'+esc(value)+'</strong></span>').join('');
}
function gridHtml(){
 const all=list();
 const filtered=sortCoins(all);
 const visible=state.all?filtered:filtered.slice(0,288);
 const markup=visible.map(tile).join('');
 return {all,filtered,visible,markup};
}
function sourceLabel(){
 if(state.coins.length){
  const stamp=new Date(state.fetchedAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  const stale=Date.now()-state.fetchedAt>10*60*1000?' · aggiornamento ritardato':'';
  return 'Fonte: CoinGecko · rilevazione '+stamp+stale+
   (state.error?' · ultimo dato valido':'')+'. Le quotazioni possono essere differite.';
 }
 if(state.snapshotAt)return 'Fonte: CoinGecko · snapshot per catalogo '+state.snapshotStatus+
  ' · dati differiti; le celle senza quotazione verificata restano grigie.';
 return state.fetching?'Caricamento elenco esteso… · intanto vengono mostrati i dati Vertex':
  (state.error?'CoinGecko non raggiungibile · ':'')+'Fonte: feed Vertex · prezzi disponibili, aggiornamento secondo fonte.';
}
function page(){
 const data=gridHtml();
 return '<section class="vh-shell" id="vertexCryptoHeatmap" aria-label="Mappa mercato criptovalute">'+
  '<div class="vh-head"><span class="vh-breadcrumb">VERTEX / MARKETS</span><strong class="vh-heading">CRYPTO MARKET HEATMAP</strong></div>'+
  '<div class="vh-ticker" id="vhStats">'+statistics(data.all)+'</div>'+
  '<div class="vh-controls"><div><h2>Mappa delle criptovalute</h2><p>Prezzo e variazione nelle ultime 24 ore · rosso in calo, verde in rialzo · Tocca una crypto per aprire lo storico</p></div>'+
  '<div class="vh-controls-right"><label class="vh-search-label"><span>Cerca</span><input id="vhSearch" type="search" placeholder="Nome o simbolo…" value="'+esc(state.query)+'" autocomplete="off"></label>'+
  '<label class="vh-sort-label"><span>Ordina per</span><select id="vhSort" aria-label="Ordina la mappa">'+
  [['cap','Capitalizzazione'],['moves','Movimenti 24h'],['winners','Maggiori rialzi'],['losers','Maggiori ribassi'],['volume','Volume 24h']].map(([value,label])=>
   '<option value="'+value+'"'+(state.sort===value?' selected':'')+'>'+label+'</option>').join('')+
  '</select></label><button class="vh-refresh" type="button" data-vh-refresh title="Aggiorna quotazioni">↻ Aggiorna</button></div></div>'+
  '<div class="vh-grid" id="vhGrid" aria-live="off">'+(data.markup||'<p class="vh-empty">Dati crypto non ancora disponibili.</p>')+'</div>'+
  '<div class="vh-foot"><span id="vhStatus">'+esc(sourceLabel())+'</span>'+
   '<div class="vh-foot-actions"><span id="vhCount">'+data.visible.length+' / '+data.filtered.length+' asset</span>'+
   '<button type="button" data-vh-more id="vhMore"'+(data.filtered.length<=288?' hidden':'')+'>'+(state.all?'Mostra meno':'Mostra tutti')+'</button></div></div>'+
 '</section>';
}
function paint(){
 const grid=document.getElementById('vhGrid');
 if(!grid)return;
 const {all,filtered,visible,markup}=gridHtml();
 grid.innerHTML=markup||'<p class="vh-empty">Nessuna criptovaluta trovata.</p>';
 paintAlertSignals();
 const stats=document.getElementById('vhStats');
 if(stats)stats.innerHTML=statistics(all);
 const status=document.getElementById('vhStatus');
 if(status)status.textContent=sourceLabel();
 const count=document.getElementById('vhCount');
 if(count)count.textContent=visible.length+' / '+filtered.length+' asset';
 const more=document.getElementById('vhMore');
 if(more){more.hidden=filtered.length<=288;more.textContent=state.all?'Mostra meno':'Mostra tutti';}
}
async function refresh(force=false){
 if(state.fetching||document.hidden)return;
 if(!force&&Date.now()-state.attemptedAt<intervalMs)return;
 state.attemptedAt=Date.now();state.fetching=true;state.error='';
 paint();
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(API,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json)||json.length<20)throw new Error('Elenco non disponibile');
  const coins=json.filter(c=>c&&typeof c.id==='string'&&/^[a-z0-9-]{1,100}$/.test(c.id)&&
    typeof c.symbol==='string'&&typeof c.name==='string'&&
    Number.isFinite(Number(c.current_price))&&Number(c.current_price)>0).slice(0,250).map(c=>({
    id:c.id,name:c.name.slice(0,120),symbol:c.symbol.slice(0,20).toLowerCase(),
    price:Number(c.current_price),
    change:typeof c.price_change_percentage_24h==='number'&&Number.isFinite(c.price_change_percentage_24h)?c.price_change_percentage_24h:null,
    marketCap:typeof c.market_cap==='number'&&Number.isFinite(c.market_cap)?c.market_cap:null,
    volume:typeof c.total_volume==='number'&&Number.isFinite(c.total_volume)?c.total_volume:null,
    rank:Number.isInteger(c.market_cap_rank)?c.market_cap_rank:null,
    image:logo(c.image)
   }));
  if(coins.length<20)throw new Error('Nessun dato validato');
  const merged=new Map(state.coins.map(c=>[c.id,c]));
  const observedAt=new Date().toISOString();
  for(const c of coins){
   const prior=merged.get(c.id);
   merged.set(c.id,{...prior,...c,observedAt,
    // CoinGecko can return the price while omitting the 24h change. In that
    // case preserve the identity-matched, still recent verified percentage.
    change:finite(c.change)?c.change:
     prior&&finite(prior.change)&&Date.now()-Date.parse(prior.observedAt||'')<2*3600000?
      prior.change:null,
    image:logo(c.image)||logo(prior?.image)});
  }
  state.coins=[...merged.values()];state.fetchedAt=Date.now();
  for(const c of coins)if(logo(c.image))state.logoCache.set(c.id,logo(c.image));
  rememberLogos();
 }catch(error){
  state.error=String(error?.message||'Connessione non disponibile');
 }finally{
  clearTimeout(timeout);state.fetching=false;paint();
 }
}
function activate(){
 // The same Markets section is reused on desktop and mobile and after every
 // navigation, so the module never binds to an element that gets replaced.
 paint();
 if(document.getElementById('vhGrid')){
  // Begin image hydration immediately, even if the price API is slow.
  // All 288 assets are eligible, including tiles with no current quotation.
  resumeHeatmapFeeds();
  if(Date.now()-state.logoAt>60000)loadCatalogLogos();
 }
}
let searchPaintFrame=null;
document.addEventListener('input',event=>{
 if(event.target?.id==='vhSearch'){
  state.query=event.target.value;
  // Input is frequent on mobile keyboards: collapse paints into one frame.
  if(searchPaintFrame!==null)cancelAnimationFrame(searchPaintFrame);
  searchPaintFrame=requestAnimationFrame(()=>{searchPaintFrame=null;paint()});
 }
});
document.addEventListener('change',event=>{
 if(event.target?.id==='vhSort'){
  state.sort=event.target.value;
  state.all=false;paint();
 }
});
document.addEventListener('click',event=>{
 const control=event.target instanceof Element?event.target.closest('[data-vh-refresh],[data-vh-more]'):null;
 if(!control)return;
 if(control.hasAttribute('data-vh-refresh')){state.attemptedAt=0;refresh(true);}
 if(control.hasAttribute('data-vh-more')){state.all=!state.all;paint();}
});
document.addEventListener('error',event=>{
 const img=event.target;
 if(!(img instanceof HTMLImageElement)||!img.closest('.vh-coin-logo'))return;
 const tile=img.closest('.vh-tile'),symbol=tile?.querySelector('.vh-symbol')?.textContent||'?';
 const fallback=document.createElement('span');
 fallback.className='vh-fallback-logo';
 fallback.textContent=symbol.slice(0,1);
 img.replaceWith(fallback);
},true);
// Shared browser/PWA lifecycle: desktop, Android Chrome, iOS/iPadOS Safari.
// Suspend network work in background and catch up after an app switch or reconnect.
function resumeHeatmapFeeds(){
 if(document.hidden||!document.getElementById('vhGrid')||!navigator.onLine)return;
 const now=Date.now();
 if(!state.snapshotCheckedAt||now-state.snapshotCheckedAt>5*60000)
  loadCatalogSnapshot().finally(()=>{if(now-state.logoAt>5*60000)loadCatalogLogos()});
 if(!state.attemptedAt||now-state.attemptedAt>intervalMs)refresh();
}
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)resumeHeatmapFeeds();
});
window.addEventListener('pageshow',resumeHeatmapFeeds);
window.addEventListener('online',resumeHeatmapFeeds);
setInterval(resumeHeatmapFeeds,30000);
window.VertexHeatmap=Object.freeze({page,activate,paint,refresh,paintAlertSignals});
})();