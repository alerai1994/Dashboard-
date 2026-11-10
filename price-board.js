/* Vertex Price Board — standalone module backed by the dashboard's own market feed. */
(function(){
'use strict';
const groups=[['markets','Indici ed ETF'],['bigtech','Azioni'],['commodities','Materie prime'],['forex','Forex'],['crypto','Criptovalute']];
const store='vertex-global-v2-priceBoardAsset';
const api=()=>window.__vertexPriceBoardBackend;
const assets=()=>api()?.assets||[];
const byId=id=>assets().find(a=>a.id===id);
const escapeHtml=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let id='btc';
try{const saved=JSON.parse(localStorage.getItem(store));if(typeof saved==='string')id=saved;}catch(_e){}
function active(){return byId(id)||byId('btc')||assets()[0];}
function options(){
 const selected=active();
 let html='';
 for(const [key,label] of groups){
  const group=assets().filter(a=>a.group===key);
  if(group.length)html+='<optgroup label="'+label+'">'+group.map(a=>
   '<option value="'+escapeHtml(a.id)+'"'+(a.id===selected?.id?' selected':'')+'>'+escapeHtml(a.name+' · '+a.symbol)+'</option>').join('')+'</optgroup>';
 }
 return html;
}
function page(){
 if(!active())return '<section class="panel" style="padding:20px">Catalogo mercati non disponibile.</section>';
 return '<div class="price-board-page">'+
 '<section class="price-board-stage" id="priceBoardStage" aria-label="Prezzo ingrandito del mercato selezionato">'+
 '<div class="price-board-stage-top"><div class="price-board-field">'+
 '<label for="priceBoardAsset">Seleziona il mercato</label><select id="priceBoardAsset" aria-label="Mercato">'+options()+'</select></div>'+
 '<div class="price-board-buttons" role="group" aria-label="Controlli">'+
 '<button type="button" data-price-board-step="-1" aria-label="Mercato precedente">←</button>'+
 '<button type="button" data-price-board-step="1" aria-label="Mercato successivo">→</button>'+
 '<button type="button" class="price-board-fs" id="priceBoardFullscreen" data-price-board-fullscreen>⛶ Schermo intero</button>'+
 '</div></div>'+
 '<div class="price-board-hero"><h2 class="price-board-market" id="priceBoardName"></h2>'+
 '<div class="price-board-symbol" id="priceBoardSymbol"></div>'+
 '<strong class="price-board-value" id="priceBoardPrice" aria-label="Prezzo del mercato">—</strong>'+
 '<div class="price-board-change" id="priceBoardChange" data-trend="unknown">—</div></div>'+
 '<div class="price-board-meta"><span id="priceBoardStatus">Caricamento quotazioni…</span>'+
 '<span class="price-board-source" id="priceBoardSource"></span></div></section>'+
 '<p class="price-board-note">Prezzo LIVE solo con streaming effettivamente attivo. Per gli altri mercati è mostrata l’ultima quotazione pubblicata, che può essere ritardata.</p></div>';
}
function fullscreenActive(){
 return document.fullscreenElement===document.getElementById('priceBoardStage')||document.body.classList.contains('price-board-fallback');
}
function syncFullscreen(){
 const button=document.getElementById('priceBoardFullscreen');if(!button)return;
 const expanded=fullscreenActive();
 button.textContent=expanded?'✕ Esci dallo schermo intero':'⛶ Schermo intero';
 button.setAttribute('aria-pressed',String(expanded));
}
function paint(){
 const stage=document.getElementById('priceBoardStage'),a=active(),backend=api();
 if(!stage||!a||!backend)return;
 const q=backend.getQuote(a.id);
 const price=q&&Number.isFinite(q.value)&&q.value>0?backend.formatValue(q.value,a):'—';
 const change=q&&Number.isFinite(q.change)?backend.pct(q.change):'Variazione non disponibile';
 const value=document.getElementById('priceBoardPrice');
 if(value&&value.textContent!==price){
  value.textContent=price;
  value.dataset.length=price.length>=18?'extra':price.length>=12?'long':'normal';
 }
 document.getElementById('priceBoardName').textContent=a.name;
 document.getElementById('priceBoardSymbol').textContent=a.symbol+' · '+(groups.find(g=>g[0]===a.group)?.[1]||a.group);
 const changeElement=document.getElementById('priceBoardChange');
 if(changeElement){
  changeElement.textContent=change;
  changeElement.dataset.trend=!q||!Number.isFinite(q.change)?'unknown':q.change>0?'up':q.change<0?'down':'flat';
 }
 document.getElementById('priceBoardStatus').textContent=backend.getStatus(a.id);
 document.getElementById('priceBoardSource').textContent=q?.source?'Fonte: '+q.source:'Dati verificati non ancora disponibili';
 syncFullscreen();
}
function choose(next){
 if(!byId(next))return;
 id=next;
 try{localStorage.setItem(store,JSON.stringify(id));}catch(_e){}
 const select=document.getElementById('priceBoardAsset');if(select)select.innerHTML=options();
 paint();
}
function step(delta){
 const list=assets(),index=list.findIndex(a=>a.id===active()?.id);
 if(list.length)choose(list[(index+delta+list.length)%list.length].id);
}
function closeFullscreen(){
 const stage=document.getElementById('priceBoardStage');
 document.body.classList.remove('price-board-fallback');
 if(stage&&document.fullscreenElement===stage&&document.exitFullscreen){
  try{const p=document.exitFullscreen();if(p&&p.catch)p.catch(()=>{});}catch(_e){}
 }
 syncFullscreen();
}
function toggleFullscreen(){
 const stage=document.getElementById('priceBoardStage');if(!stage)return;
 if(fullscreenActive()){closeFullscreen();return;}
 const fallback=()=>{document.body.classList.add('price-board-fallback');syncFullscreen();};
 if(typeof stage.requestFullscreen!=='function'){fallback();return;}
 try{
  const result=stage.requestFullscreen({navigationUI:'hide'});
  if(result&&typeof result.then==='function')result.then(syncFullscreen,fallback);
  else syncFullscreen();
 }catch(_e){fallback();}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button)return;
 if(button.matches('[data-price-board-fullscreen]')){toggleFullscreen();return;}
 if(button.matches('[data-price-board-step]')){step(Number(button.dataset.priceBoardStep));return;}
 if(button.matches('.side-link[data-page]')&&button.dataset.page!=='priceboard')closeFullscreen();
});
document.addEventListener('change',event=>{
 if(event.target.id==='priceBoardAsset')choose(event.target.value);
});
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&document.body.classList.contains('price-board-fallback'))closeFullscreen();
});
window.addEventListener('hashchange',()=>{
 if(location.hash!=='#priceboard')closeFullscreen();
});
window.VertexPriceBoard=Object.freeze({page,paint,closeFullscreen,choose});
})();