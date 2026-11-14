/* Vertex Crypto Heatmap — independent Markets visualisation.
   Prices are observed quotes only. CoinGecko may be rate limited; Vertex's own
   42-crypto feed remains a fully functional fallback. */
(function(){
'use strict';
const API='https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h';
const intervalMs=150000;
const state={coins:[],fetchedAt:0,attemptedAt:0,fetching:false,error:'',query:'',sort:'cap',all:false};
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
 return finite(n)?(n>0?'+':'')+n.toFixed(2)+'%':'—';
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
   marketCap:null,volume:null,rank:null,image:logo(q?.logo),localId:a.id});
 }
 return data;
}
function list(){
 const local=fallback();
 if(!state.coins.length)return local;
 const used=new Set();
 const merged=state.coins.map(coin=>{
  const localMatch=local.find(a=>
   a.id===coin.id||a.symbol===coin.symbol&&!used.has(a.localId));
  if(localMatch)used.add(localMatch.localId);
  return {...coin,localId:localMatch?.localId||null};
 });
 for(const a of local)if(!used.has(a.localId))merged.push(a);
 return merged;
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
function tile(c){
 const valid=finite(c.change);
 const tone=!valid?'neutral':c.change>0?'up':c.change<0?'down':'neutral';
 const image=logo(c.image);
 const icon=image?'<img src="'+esc(image)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">':
  '<span class="vh-fallback-logo">'+esc((c.symbol||'?').slice(0,1).toUpperCase())+'</span>';
 const info=esc(c.name+' ('+c.symbol.toUpperCase()+') · '+priceText(c.price)+' · 24h '+changeText(c.change));
 const content='<span class="vh-coin-logo" aria-hidden="true">'+icon+'</span>'+
  '<span class="vh-symbol">'+esc(c.symbol.toUpperCase())+'</span>'+
  '<span class="vh-change">'+esc(changeText(c.change))+'</span>'+
  '<span class="vh-price">'+esc(priceText(c.price))+'</span>';
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
 const visible=state.all?filtered:filtered.slice(0,220);
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
 return state.fetching?'Caricamento elenco esteso… · intanto vengono mostrati i dati Vertex':
  (state.error?'CoinGecko non raggiungibile · ':'')+'Fonte: feed Vertex · prezzi disponibili, aggiornamento secondo fonte.';
}
function page(){
 const data=gridHtml();
 return '<section class="vh-shell" id="vertexCryptoHeatmap" aria-label="Mappa mercato criptovalute">'+
  '<div class="vh-head"><span class="vh-breadcrumb">VERTEX / MARKETS</span><strong class="vh-heading">CRYPTO MARKET HEATMAP</strong></div>'+
  '<div class="vh-ticker" id="vhStats">'+statistics(data.all)+'</div>'+
  '<div class="vh-controls"><div><h2>Mappa delle criptovalute</h2><p>Prezzo e variazione nelle ultime 24 ore · rosso in calo, verde in rialzo</p></div>'+
  '<div class="vh-controls-right"><label class="vh-search-label"><span>Cerca</span><input id="vhSearch" type="search" placeholder="Nome o simbolo…" value="'+esc(state.query)+'" autocomplete="off"></label>'+
  '<label class="vh-sort-label"><span>Ordina per</span><select id="vhSort" aria-label="Ordina la mappa">'+
  [['cap','Capitalizzazione'],['moves','Movimenti 24h'],['winners','Maggiori rialzi'],['losers','Maggiori ribassi'],['volume','Volume 24h']].map(([value,label])=>
   '<option value="'+value+'"'+(state.sort===value?' selected':'')+'>'+label+'</option>').join('')+
  '</select></label><button class="vh-refresh" type="button" data-vh-refresh title="Aggiorna quotazioni">↻ Aggiorna</button></div></div>'+
  '<div class="vh-grid" id="vhGrid" aria-live="off">'+(data.markup||'<p class="vh-empty">Dati crypto non ancora disponibili.</p>')+'</div>'+
  '<div class="vh-foot"><span id="vhStatus">'+esc(sourceLabel())+'</span>'+
   '<div class="vh-foot-actions"><span id="vhCount">'+data.visible.length+' / '+data.filtered.length+' asset</span>'+
   '<button type="button" data-vh-more id="vhMore"'+(data.filtered.length<=220?' hidden':'')+'>'+(state.all?'Mostra meno':'Mostra tutti')+'</button></div></div>'+
 '</section>';
}
function paint(){
 const grid=document.getElementById('vhGrid');
 if(!grid)return;
 const {all,filtered,visible,markup}=gridHtml();
 grid.innerHTML=markup||'<p class="vh-empty">Nessuna criptovaluta trovata.</p>';
 const stats=document.getElementById('vhStats');
 if(stats)stats.innerHTML=statistics(all);
 const status=document.getElementById('vhStatus');
 if(status)status.textContent=sourceLabel();
 const count=document.getElementById('vhCount');
 if(count)count.textContent=visible.length+' / '+filtered.length+' asset';
 const more=document.getElementById('vhMore');
 if(more){more.hidden=filtered.length<=220;more.textContent=state.all?'Mostra meno':'Mostra tutti';}
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
  state.coins=coins;state.fetchedAt=Date.now();
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
 if(document.getElementById('vhGrid'))refresh();
}
document.addEventListener('input',event=>{
 if(event.target?.id==='vhSearch'){
  state.query=event.target.value;
  paint();
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
setInterval(()=>{if(document.getElementById('vhGrid')&&!document.hidden)refresh();},30000);
window.VertexHeatmap=Object.freeze({page,activate,paint,refresh});
})();