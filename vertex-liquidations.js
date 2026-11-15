/* Vertex Liquidation Heatmap: third-party live embed, not fabricated signals.
   Blockmetric: public Hyperliquid positions; 24h free widget.
   Always retain visible attribution and direct source links.
*/
(function(){
 'use strict';
 const COINS=[
  ['BTC','Bitcoin'],['ETH','Ethereum'],['SOL','Solana'],['HYPE','Hyperliquid'],
  ['BNB','BNB'],['XRP','XRP'],['DOGE','Dogecoin'],['ADA','Cardano'],
  ['AVAX','Avalanche'],['LINK','Chainlink'],['SUI','Sui'],['TAO','Bittensor'],
  ['INJ','Injective'],['TRX','Tron']
 ];
 const VALID=new Set(COINS.map(row=>row[0]));
 const KEY='vertex-liquidations-selected-coin';
 const root='https://blockmetric.io';
 let selected='BTC';
 try{
  const saved=JSON.parse(localStorage.getItem(KEY));
  if(typeof saved==='string'&&VALID.has(saved))selected=saved;
 }catch(_error){}
 const esc=s=>String(s).replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[ch]);
 const link=coin=>root+'/coins/'+coin+'/heatmap?utm_source=embed&utm_medium=heatmap';
 const heatmap=coin=>root+'/embed/heatmap?coin='+coin;
 const ladder=coin=>root+'/embed/liq-levels?coin='+coin;
 function page(){
  const opts=COINS.map(([ticker,name])=>
   '<option value="'+ticker+'"'+(ticker===selected?' selected':'')+'>'+
   esc(name)+' ('+ticker+')</option>').join('');
  return '<section class="vertex-liquidations" aria-label="Liquidation Heatmap">'+
   '<div class="vertex-liquidations-toolbar"><div class="vertex-liquidations-intro">'+
   '<h2>Liquidation Heatmap</h2>'+
   '<p>Concentrazioni di liquidazioni stimate dalle posizioni pubbliche osservate su Hyperliquid.</p>'+
   '</div><div class="vertex-liquidations-controls">'+
   '<label for="vertexLiqCoin">Criptovaluta</label>'+
   '<select id="vertexLiqCoin" aria-label="Criptovaluta della heatmap">'+opts+'</select>'+
   '<button type="button" data-vertex-liq-refresh title="Aggiorna la heatmap" aria-label="Aggiorna la heatmap">↻ Aggiorna</button>'+
   '</div></div>'+
   '<div class="vertex-liquidations-meta" aria-label="Informazioni sui dati">'+
   '<span>● 24 ore di storico</span><span>● Posizioni pubbliche Hyperliquid</span>'+
   '<span>● Aggiornamento della fonte ogni 5 minuti</span></div>'+
   '<div class="vertex-liquidations-grid">'+
   '<div class="vertex-liquidations-chart">'+
   '<div class="vertex-liquidations-card-title"><h3 data-vertex-liq-title>'+selected+' · Liquidation Heatmap</h3>'+
   '<span>24H</span></div>'+
   '<iframe id="vertexLiqHeatmap" title="Heatmap delle liquidazioni '+selected+' fornita da Blockmetric" '+
   'src="'+heatmap(selected)+'" width="100%" height="540" loading="lazy" '+
   'referrerpolicy="strict-origin-when-cross-origin" '+
   'style="border:0;border-radius:12px;color-scheme:dark" ></iframe>'+
   '<p class="vertex-liquidations-credit">Heatmap '+selected+' · <a data-vertex-liq-link '+
   'href="'+esc(link(selected))+'" target="_blank" rel="noopener nofollow">Apri la heatmap completa della fonte</a>'+
   ' · Dati di <a href="https://blockmetric.io/?utm_source=embed&amp;utm_medium=heatmap" target="_blank" rel="noopener">Blockmetric</a></p>'+
   '</div>'+
   '<div class="vertex-liquidations-levels">'+
   '<div class="vertex-liquidations-card-title"><h3 data-vertex-liq-levels-title>'+selected+' · Livelli di liquidazione</h3>'+
   '<span>Sopra / sotto prezzo</span></div>'+
   '<iframe id="vertexLiqLevels" title="Livelli delle liquidazioni '+selected+' forniti da Blockmetric" '+
   'src="'+ladder(selected)+'" width="100%" height="540" loading="lazy" '+
   'referrerpolicy="strict-origin-when-cross-origin" '+
   'style="border:0;border-radius:12px;color-scheme:dark"></iframe>'+
   '<p class="vertex-liquidations-credit">Posizioni e livelli · Dati di <a href="https://blockmetric.io/?utm_source=embed&amp;utm_medium=liq-levels" '+
   'target="_blank" rel="noopener">Blockmetric</a></p></div></div>'+
   '<p class="vertex-liquidations-disclaimer"><strong>Come leggere il grafico:</strong> le fasce più intense rappresentano '+
   'concentrazioni di posizioni e dei relativi prezzi di liquidazione presso la fonte. '+
   'Non sono liquidazioni già avvenute su tutti gli exchange, né una previsione certa della direzione del prezzo. '+
   'Il widget gratuito copre le ultime 24 ore, non un anno. '+
   'Se la fonte non è raggiungibile, il grafico potrebbe non caricarsi.</p>'+
   '</section>';
 }
 function update(coin,refresh){
  if(!VALID.has(coin))return;
  if(!refresh&&selected===coin)return;
  selected=coin;
  try{localStorage.setItem(KEY,JSON.stringify(coin))}catch(_error){}
  const heat=document.getElementById('vertexLiqHeatmap');
  const levels=document.getElementById('vertexLiqLevels');
  if(heat){
   heat.src=heatmap(coin)+(refresh?'&v='+Date.now():'');
   heat.title='Heatmap delle liquidazioni '+coin+' fornita da Blockmetric';
  }
  if(levels){
   levels.src=ladder(coin)+(refresh?'&v='+Date.now():'');
   levels.title='Livelli delle liquidazioni '+coin+' forniti da Blockmetric';
  }
  const heading=document.querySelector('[data-vertex-liq-title]');
  if(heading)heading.textContent=coin+' · Liquidation Heatmap';
  const label=document.querySelector('[data-vertex-liq-levels-title]');
  if(label)label.textContent=coin+' · Livelli di liquidazione';
  const source=document.querySelector('[data-vertex-liq-link]');
  if(source)source.href=link(coin);
  const picker=document.getElementById('vertexLiqCoin');
  if(picker&&picker.value!==coin)picker.value=coin;
 }
 document.addEventListener('change',event=>{
  if(event.target?.id==='vertexLiqCoin')update(event.target.value,false);
 });
 document.addEventListener('click',event=>{
  const btn=event.target?.closest?.('[data-vertex-liq-refresh]');
  if(btn)update(selected,true);
 });
 window.VertexLiquidations=Object.freeze({page,select:coin=>update(coin,false)});
})();
