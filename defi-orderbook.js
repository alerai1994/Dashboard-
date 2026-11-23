/* Vertex DeFi companion: read-only verified AMM pools, never BID/ASK order levels.
   Runs beside Order Book without modifying the core venue-specific Spot engine. */
(function(){
'use strict';
const SOURCE='https://raw.githubusercontent.com/alerai1994/Dashboard-/main/crypto-defi-pools.json';
const CDN='https://cdn.jsdelivr.net/gh/alerai1994/Dashboard-@main/crypto-defi-pools.json';
const GROUPS=[
 ['all','Tutti i DEX'],['pancake_v1','Pancake V1'],
 ['pancake_v2','Pancake V2'],['pancake_v3','Pancake V3'],
 ['pancake_v4','Pancake V4'],['meteora','Meteora'],
 ['raydium','Raydium'],['pancake_other','Pancake · altro']
];
let activeFilter='all',lastFetch=0,busy=false,selectedId='';
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,
 c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dataset=()=>{
 const p=window.__VERTEX_DEFI_POOLS__;
 return p&&p.totalAssets===288&&p.pools&&p.contracts?p:null;
};
function selected(){
 try{
  const current=JSON.parse(localStorage.getItem('vertex-global-v2-orderBookCoin')||'null');
  if(typeof current==='string'&&current)return current;
 }catch(_error){}
 const active=document.querySelector('#orderBookAssetList .ob-coin.is-selected');
 return active?.dataset.orderBookAsset||selectedId||'btc';
}
function rowsFor(id){
 const snap=dataset(),rows=snap?.pools?.[id],contracts=snap?.contracts?.[id]||{};
 if(!Array.isArray(rows))return [];
 return rows.filter(p=>{
  if(!p||p.source!=='DEX Screener'||!GROUPS.some(g=>g[0]===p.group)||
   !['bsc','solana','ethereum','base'].includes(p.chain))return false;
  const actual=p.tokenAddress,known=contracts[p.chain];
  if(typeof actual!=='string'||typeof known!=='string'||
     (p.chain==='solana'?actual!==known:actual.toLowerCase()!==known.toLowerCase()))return false;
  const age=Date.now()-Date.parse(p.capturedAt||'');
  return Number.isFinite(age)&&age>=-60000&&age<3*3600*1000&&
   Number(p.liquidityUsd)>0&&
   typeof p.address==='string'&&
   (p.chain==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.address):
     /^0x[a-f0-9]{40,64}$/i.test(p.address));
 }).sort((a,b)=>Number(b.liquidityUsd)-Number(a.liquidityUsd));
}
function money(v,price=false){
 if(v==null)return '—';
 const n=Number(v);
 if(!Number.isFinite(n)||n<0)return '—';
 return '$'+n.toLocaleString('it-IT',{maximumFractionDigits:price?(n<.001?10:n<1?7:4):2});
}
function label(group){return GROUPS.find(x=>x[0]===group)?.[1]||'DeFi'}
function renderPanel(node,id){
 const snapshot=dataset(),all=rowsFor(id);
 const visible=activeFilter==='all'?all:all.filter(p=>p.group===activeFilter);
 const age=Date.now()-Date.parse(snapshot?.generatedAt||'');
 const dataAge=Number.isFinite(age)&&age>=0?Math.floor(age/60000)+' min fa':'—';
 const filters=GROUPS.map(([group,name])=>{
  const n=all.filter(p=>p.group===group).length;
  return '<button type="button" class="ob-defi-filter'+(activeFilter===group?' is-active':'')+
   '" data-defi-filter="'+group+'" aria-pressed="'+(group===activeFilter)+'">'+
   esc(name)+(group==='all'?'':' · '+n)+'</button>';
 }).join('');
 const cards=visible.map(p=>{
  const chain=p.chain==='bsc'?'BNB Chain':p.chain==='solana'?'Solana':
   p.chain==='base'?'Base':'Ethereum';
  const url='https://dexscreener.com/'+p.chain+'/'+p.address;
  const value=p.priceUsd!=null&&Number(p.priceUsd)>0?
   '<span>Prezzo indicativo <strong>'+money(p.priceUsd,true)+'</strong></span>':'';
  const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(p.capturedAt))/60000));
  return '<article class="ob-defi-card">'+
   '<div class="ob-defi-card-top"><strong>'+esc(label(p.group))+'</strong>'+
   '<small>'+esc(chain)+' · '+esc(p.base)+'/'+esc(p.quote)+'</small></div>'+
   '<div class="ob-defi-card-numbers"><span>Liquidità pool <strong>'+money(p.liquidityUsd)+'</strong></span>'+
   '<span>Volume 24 ore <strong>'+money(p.volume24hUsd)+'</strong></span>'+value+'</div>'+
   '<div class="ob-defi-card-bottom"><small>DEX Screener · '+minutes+' min fa</small>'+
   '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Apri pool ↗</a></div>'+
   '</article>';
 }).join('');
 const hint=snapshot?
  'Nessun pool attivo con contratto e protocollo verificati per questa selezione.':
  'Dati dei pool non ancora disponibili: raccolta e verifica in corso.';
 node.innerHTML='<div class="ob-defi-heading"><h3>Pool DeFi · Liquidità reale</h3>'+
  '<small>'+(snapshot?all.length+' pool verificati · aggiornati '+dataAge:'Verifica pool in corso')+
  '</small></div>'+
  '<p class="ob-defi-explain">PancakeSwap V1, V2, V3, V4, Meteora e Raydium. '+
  'I pool AMM non sono order book: liquidità e volume non sono ordini BID/ASK e il prezzo non è una quotazione garantita.</p>'+
  '<div class="ob-defi-filters" role="group" aria-label="Filtra i protocolli DEX">'+filters+'</div>'+
  '<div class="ob-defi-grid">'+(cards||'<p class="ob-defi-empty">'+hint+'</p>')+'</div>';
 node.dataset.asset=id;
 node.dataset.loaded=String(snapshot?.generatedAt||'');
 node.dataset.filter=activeFilter;
}
function ensure(){
 const content=document.getElementById('orderBookContent');
 if(!content)return;
 const id=selected();
 let node=document.getElementById('orderBookDefiPanel');
 if(!node){
  node=document.createElement('section');
  node.id='orderBookDefiPanel';node.className='ob-defi-panel';
  node.setAttribute('aria-label','Pool di liquidità DeFi');
  const target=content.nextElementSibling;
  content.parentNode.insertBefore(node,target||null);
  node.addEventListener('click',event=>{
   const btn=event.target.closest('button[data-defi-filter]');
   if(!btn)return;
   event.preventDefault();event.stopPropagation();
   if(!GROUPS.some(g=>g[0]===btn.dataset.defiFilter))return;
   activeFilter=btn.dataset.defiFilter;
   renderPanel(node,selected());
  });
 }
 if(node.dataset.asset!==id||node.dataset.loaded!==String(dataset()?.generatedAt||'')||
    node.dataset.filter!==activeFilter){
  renderPanel(node,id);
 }
}
async function refresh(force=false){
 if(busy||document.hidden||!document.getElementById('orderBookContent'))return;
 if(!force&&Date.now()-lastFetch<100000)return;
 busy=true;lastFetch=Date.now();
 const urls=location.protocol==='file:'?[SOURCE,CDN]:['crypto-defi-pools.json',SOURCE,CDN];
 try{
  for(const u of urls){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
   try{
    const response=await fetch(u+(u.includes('?')?'&':'?')+'t='+Date.now(),
      {cache:'no-store',signal:controller.signal});
    if(!response.ok)continue;
    const next=await response.json();
    if(next?.totalAssets!==288||!next.pools||!next.contracts)continue;
    if((Date.parse(next.generatedAt)||0)>=(Date.parse(dataset()?.generatedAt)||0)){
     window.__VERTEX_DEFI_POOLS__=next;
     ensure();
    }
    break;
   }catch(_e){/* Preserve verified cached snapshot on CORS/offline/timeout. */}
   finally{clearTimeout(timeout);}
  }
 }finally{busy=false;}
}
function initialize(){
 const parent=document.getElementById('pageContainer');
 if(!parent)return;
 new MutationObserver(()=>{
  if(document.getElementById('orderBookContent'))ensure();
 }).observe(parent,{childList:true,subtree:true});
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-order-book-refresh]'))refresh(true).catch(()=>{});
 },true);
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){ensure();refresh().catch(()=>{});}
 });
 window.addEventListener('online',()=>refresh(true).catch(()=>{}));
 setInterval(()=>{
  if(!document.hidden&&document.getElementById('orderBookContent')){
   ensure();refresh().catch(()=>{});
  }
 },120000);
 ensure();
 refresh().catch(()=>{});
}
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
})();
