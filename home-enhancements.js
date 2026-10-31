/* INJ Mode Home V562: tools and independent local simulations */
(()=>{
'use strict';
if(window.__injHomeV562)return;
window.__injHomeV562=true;
const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('it-IT',{maximumFractionDigits:6}).format(n):'—';
function init(){
 const app=document.querySelector('.app'),bar=app?.querySelector('.topbar');
 if(!app||!bar||$('injHomeHub'))return;
 const root=document.createElement('section');
 root.id='injHomeHub';root.className='inj-home-hub';
 root.setAttribute('aria-label','Strumenti INJ Mode');
 root.innerHTML='<header class="inj-home-heading"><div><small>INJ MODE · HOME</small><h2>Il tuo centro finanziario</h2><p>Strumenti e simulazioni in una Home ordinata, senza duplicare grafici.</p></div><b aria-hidden="true">↗</b></header>'+
 '<div class="inj-home-nav" role="group" aria-label="Sezioni Home">'+
 [['tools','Tools','Strumenti'],['cap','Market Cap Comparison','Capitalizzazione'],['value','Potential Value','Valore potenziale'],['freedom','Financial Freedom','Obiettivi']].map(x=>'<button type="button" data-inj-panel="'+x[0]+'"><strong>'+x[1]+'</strong><small>'+x[2]+'</small></button>').join('')+
 '</div><div class="inj-home-panels">'+
 '<section id="inj-panel-tools" class="inj-home-panel"><h3>Tools</h3><p>Accedi alle sezioni esistenti.</p><div class="inj-home-actions"><button data-inj-go="crypto">Grafici crypto</button><button data-inj-go="global">Global Market</button><button data-inj-go="compare">Crypto A/B</button><button data-inj-go="workspace">Workspace</button></div></section>'+
 '<section id="inj-panel-cap" class="inj-home-panel" hidden><h3>Market Cap Comparison</h3><p>Prezzo teorico = capitalizzazione target / offerta circolante, non una previsione.</p><div class="inj-home-fields"><label>Market cap target (USD)<input id="injCap" type="number" min="0" step="any"></label><label>Offerta circolante<input id="injSupply" type="number" min="0" step="any"></label></div><output id="injCapOut">Inserisci valori positivi.</output></section>'+
 '<section id="inj-panel-value" class="inj-home-panel" hidden><h3>Potential Value</h3><p>Valore ipotetico di una posizione, senza leva né commissioni.</p><div class="inj-home-fields"><label>Numero di token<input id="injTokens" type="number" min="0" step="any"></label><label>Prezzo ipotetico (USD)<input id="injPrice" type="number" min="0" step="any"></label></div><output id="injValueOut">Inserisci valori positivi.</output></section>'+
 '<section id="inj-panel-freedom" class="inj-home-panel" hidden><h3>Financial Freedom</h3><p>Stima basata su un rendimento ipotetico, non garantito.</p><div class="inj-home-fields"><label>Spese mensili (€)<input id="injMonthly" type="number" min="0" step="any"></label><label>Rendimento annuo ipotetico (%)<input id="injYield" type="number" min="0" max="100" step="any"></label></div><output id="injFreedomOut">Inserisci valori positivi.</output></section>'+
 '</div>';
 bar.after(root);
 const brand=$('brandMainTitle');if(brand)brand.textContent='INJ Mode · Mercati e indicatori';
 function open(id){
  root.querySelectorAll('[data-inj-panel]').forEach(b=>{const on=b.dataset.injPanel===id;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',String(on))});
  root.querySelectorAll('.inj-home-panel').forEach(panel=>panel.hidden=panel.id!=='inj-panel-'+id);
 }
 root.querySelectorAll('[data-inj-panel]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.injPanel)));
 root.querySelectorAll('[data-inj-go]').forEach(b=>b.addEventListener('click',()=>{
  const target=b.dataset.injGo;
  if(target==='crypto'){document.querySelector('.market-grid')?.scrollIntoView({block:'start',behavior:'smooth'});return}
  document.querySelector('.v538-dock [data-v538-go="'+target+'"]')?.click();
 }));
 const n=id=>Number($(id)?.value),ok=id=>$(id)?.value.trim()!==''&&Number.isFinite(n(id))&&n(id)>0;
 function update(){
  $('injCapOut').textContent=ok('injCap')&&ok('injSupply')?'Prezzo teorico: $'+fmt(n('injCap')/n('injSupply')):'Inserisci valori positivi.';
  $('injValueOut').textContent=ok('injTokens')&&ok('injPrice')?'Valore teorico: $'+fmt(n('injTokens')*n('injPrice')):'Inserisci valori positivi.';
  $('injFreedomOut').textContent=ok('injMonthly')&&ok('injYield')?'Capitale teorico: €'+fmt(n('injMonthly')*12/(n('injYield')/100)):'Inserisci valori positivi.';
 }
 root.querySelectorAll('input').forEach(i=>i.addEventListener('input',update));
 open('tools');
 function sync(){root.hidden=document.body.classList.contains('v442-market-open')}
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();