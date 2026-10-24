/* V531 — Workspace: book BID/ASK integrato in ogni card crypto, fonti spot multiple. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const panel=$('v525WorkspacePanel'),canvas=$('v525WorkspaceCanvas'),add=$('v525WorkspaceAdd'),
   picker=$('v525WorkspaceSettings'),choose=$('v525CardType'),confirm=$('v525ConfirmAdd'),
   dismiss=$('v525WorkspaceSettingsClose'),empty=$('v525WorkspaceEmpty'),msg=$('v525WorkspaceStatus');
 if(!panel||!canvas||!add||!picker||!choose||!confirm)return;
 const STORAGE='dashboard-v525-workspace-layout-v1'; // Keep all previously saved V525 layouts.
 const SNAP_STORAGE='dashboard-v525-workspace-snap-v1';
 const assets={
  btc:['Bitcoin','BTC','bitcoin','BTCUSDT'],eth:['Ethereum','ETH','ethereum','ETHUSDT'],
  bnb:['BNB','BNB','binancecoin','BNBUSDT'],sol:['Solana','SOL','solana','SOLUSDT'],
  ray:['Raydium','RAY','raydium','RAYUSDT'],inj:['Injective','INJ','injective-protocol','INJUSDT'],
  ore:['ORE Protocol','ORE','ore',''],tai:['TARS AI','TAI','tars-protocol',''],
  virtual:['Virtuals Protocol','VIRTUAL','virtual-protocol','VIRTUALUSDT'],
  wld:['Worldcoin','WLD','worldcoin-wld','WLDUSDT'],
  orai:['Oraichain','ORAI','oraichain-token',''],
  tao:['Bittensor','TAO','bittensor','TAOUSDT'],
  lunc:['Terra Luna Classic','LUNC','terra-luna-classic','LUNCUSDT'],
  luna:['Terra','LUNA','terra-luna-2','LUNAUSDT']
 };
 const kinds={asset:'Riepilogo crypto',chart:'Grafico a candele',orderbook:'Order Book',indicators:'Indicatori tecnici',stats:'Dati di mercato',ab:'Crypto A / B',notes:'Note personali',clock:'Orologio live'};
 const intervals=['1m','5m','15m','1h','4h','1d','1w'];
 const isAsset=x=>Object.hasOwn(assets,x);
 const cardKind=c=>isAsset(c.type)?'asset':c.type;
 const cardAsset=c=>isAsset(c.type)?c.type:(isAsset(c.asset)?c.asset:'btc');
 const num=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const fmt=(v,d=4)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v).toLocaleString('en-US',{maximumFractionDigits:d}):'—';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const hasStorage=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'null');}catch(_){return null;}};
 const chartData=new Map(),marketMeta=new Map(),chartSignatures=new Map();
 const quoteMap=new Map(),abRequests=new Map(),abRecords=new Map(),abRetryAt=new Map();
 let quoteSocket=null,quoteRetry=null,quoteTimer=null,lastQuotePoll=0;
 const QUOTE_POLL_MS=60000;
 // Verified Solana mint addresses: never locate similarly-named tokens by ticker.
 const DEX_MINTS={
   ore:'oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp',
   tai:'Hax9LTgsQkze1YFychnBLtFH8gYbQKtKfWKKg2SP6gdD'
 };
 const HISTORY_STORAGE='dashboard-v529-workspace-real-history-v1';
 const historyPending=new Set(),historyRetryAt=new Map(),historyQueue=[];
 let historyWorkers=0,historyBatchPending=false;
 const HISTORY_TTL=6*60*60*1000;
 const cleanSeries=list=>(Array.isArray(list)?list:[]).map(Number).filter(v=>Number.isFinite(v)&&v>0).slice(-500);
 function restoreHistoryCache(){
   try{
     const parsed=JSON.parse(localStorage.getItem(HISTORY_STORAGE)||'{}');
     for(const [key,data] of Object.entries(parsed)){
       if(!isAsset(key)||!data||Date.now()-Number(data.at)>24*60*60*1000)continue;
       const values=cleanSeries(data.values);
       if(values.length>=2)chartData.set(key,{values,origin:String(data.origin||'Cache storico'),at:Number(data.at)});
     }
   }catch(_){}
 }
 function saveHistoryCache(){
   try{
     const obj={};for(const [k,v] of chartData)if(v.values?.length>=2)obj[k]={values:v.values.slice(-200),origin:v.origin,at:v.at||Date.now()};
     localStorage.setItem(HISTORY_STORAGE,JSON.stringify(obj));
   }catch(_){}
 }
 function updateChartsForAsset(key){
   for(const c of cards){if(cardAsset(c)!==key)continue;
     const el=findElement(c.id);if(!el)continue;
     if(cardKind(c)==='asset')updateSmallChart(c,el);
     if(cardKind(c)==='chart')chartDisplay(c,el);
   }
 }
 function acceptHistory(key,series,origin,at=Date.now()){
   const values=cleanSeries(series);
   if(!isAsset(key)||values.length<2)return false;
   const old=chartData.get(key);
   // Do not replace a reasonably fresh 7d series with just a few observations.
   if(old?.values?.length>=values.length && Date.now()-(old.at||0)<HISTORY_TTL)return true;
   chartData.set(key,{values,origin,at});
   saveHistoryCache();updateChartsForAsset(key);
   return true;
 }
 restoreHistoryCache();

 const candleCache=new Map(),bookCache=new Map(),inflight=new Map();
 let cards=[],counter=0,active=null,networkAt=0,lastCacheAt=0,snapEnabled=true;
 const GUTTER=13, MIN_W=180, MIN_H=145;
 const PRESETS={compact:[210,174],medium:[285,222],large:[440,345]};
 try{snapEnabled=localStorage.getItem(SNAP_STORAGE)!=='false';}catch(_){}
 const snap=v=>snapEnabled?Math.round(v/11)*11:v;
 function save(){
   try{localStorage.setItem(STORAGE,JSON.stringify(cards.map(({id,type,asset,interval,depth,chartStyle,x,y,w,h,note,abA,abB,abLabelA,abLabelB})=>({id,type,asset,interval,depth,chartStyle,x,y,w,h,note,abA,abB,abLabelA,abLabelB}))));}catch(_){}
 }
 const findElement=id=>Array.from(canvas.querySelectorAll('.v525-widget')).find(el=>el.dataset.cardId===id);
 const visible=()=>!panel.hidden&&document.body.classList.contains('v442-market-open')&&!document.hidden;
 function geometry(c){
   const view=canvas.clientWidth||innerWidth||800,available=Math.max(MIN_W,view-12);
   const w=clamp(num(c.w,268),MIN_W,Math.min(720,available));
   return {w,h:clamp(num(c.h,208),MIN_H,650),x:clamp(num(c.x,12),0,Math.max(0,view-w)),y:Math.max(0,num(c.y,12))};
 }
 function applyGeometry(c,el){
   const {w,h,x,y}=geometry(c);
   el.style.width=w+'px';el.style.height=h+'px';el.style.transform=`translate3d(${x}px,${y}px,0)`;
 }

 // V527: non lasciare MAI che due card occupino lo stesso rettangolo.
 // La card manipolata mantiene la sua posizione. Le altre cercano il posto
 // libero più vicino, sulla stessa riga se possibile, altrimenti sotto.
 // Durante il drag il calcolo usa le posizioni all'inizio del gesto:
 // restringendo la card, le altre possono tornare al loro posto.
 function intersects(a,b){
   return a.x < b.x+b.w+GUTTER && a.x+a.w+GUTTER > b.x &&
          a.y < b.y+b.h+GUTTER && a.y+a.h+GUTTER > b.y;
 }
 function freePosition(rect,occupied,width){
   const maxX=Math.max(0,width-rect.w);
   const start={...rect,x:clamp(rect.x,0,maxX),y:Math.max(0,rect.y)};
   if(occupied.every(p=>!intersects(start,p)))return start;
   const xs=new Set([0,Math.floor(maxX),start.x]);
   const ys=new Set([0,start.y]);
   for(const box of occupied){
     xs.add(clamp(Math.round(box.x+box.w+GUTTER),0,maxX));
     xs.add(clamp(Math.round(box.x-rect.w-GUTTER),0,maxX));
     xs.add(clamp(Math.round(box.x),0,maxX));
     ys.add(Math.round(box.y+box.h+GUTTER));
     ys.add(Math.max(0,Math.round(box.y-rect.h-GUTTER)));
   }
   let best=null,score=Infinity;
   for(const x of xs)for(const y of ys){
     const pos={...start,x,y};
     const distance=Math.abs(x-start.x)+1.06*Math.abs(y-start.y);
     if(distance>score)continue;
     if(occupied.some(p=>intersects(pos,p)))continue;
     if(distance<score || (distance===score && (!best || y<best.y))){best=pos;score=distance;}
   }
   if(best)return best;
   // Fallback deterministico: la prima riga libera dopo l'ultima card.
   const lowest=occupied.reduce((m,p)=>Math.max(m,p.y+p.h+GUTTER),0);
   return {...start,x:clamp(start.x,0,maxX),y:Math.max(start.y,lowest)};
 }
 function arrangeCards(preferredId=null,positions=null){
   if(!cards.length)return;
   const width=Math.max(MIN_W,canvas.clientWidth||innerWidth||800);
   const ordered=cards.slice();
   if(preferredId)ordered.sort((a,b)=>a.id===preferredId?-1:b.id===preferredId?1:0);
   const occupied=[];
   for(const c of ordered){
     const saved=positions?.get(c.id);
     const desired=geometry(saved&&c.id!==preferredId?{...c,...saved}:c);
     const placed=freePosition(desired,occupied,width);
     c.x=placed.x;c.y=placed.y;c.w=placed.w;c.h=placed.h;
     occupied.push(placed);
     const el=findElement(c.id);if(el)applyGeometry(c,el);
   }
 }
 function setPreset(c,el,name){
   const [w,h]=PRESETS[name]||PRESETS.medium;
   c.w=Math.min(w,Math.max(MIN_W,canvas.clientWidth-12));c.h=h;
   const button=el.querySelector('.v527-card-resize');if(button)button.dataset.resizeStep=name;
   arrangeCards(c.id);save();renderDetail(c,el);
   status('Card ridimensionata. Le altre card sono state riposizionate senza sovrapposizioni.');
 }
 function status(text){if(msg)msg.textContent=text;}
 function togglePicker(open){
   picker.hidden=!open;add.setAttribute('aria-expanded',String(open));
   if(open)choose.focus({preventScroll:true});
 }
 add.addEventListener('click',()=>togglePicker(picker.hidden));
 dismiss?.addEventListener('click',()=>togglePicker(false));
 document.addEventListener('keydown',ev=>{
   if(ev.key!=='Escape')return;
   if(connectedCard && mainSettings && !mainSettings.hidden){
     if($('languageOptions') && !$('languageOptions').hidden)return;
     ev.preventDefault();ev.stopImmediatePropagation();restoreMainSettings(true);return;
   }
   const current=canvas.querySelector('.v526-card-settings:not([hidden])');
   if(current){ev.preventDefault();ev.stopImmediatePropagation();current.hidden=true;const btn=current.closest('.v525-widget')?.querySelector('.v526-card-gear');btn?.setAttribute('aria-expanded','false');btn?.focus({preventScroll:true});}
   else if(!picker.hidden){ev.preventDefault();ev.stopImmediatePropagation();togglePicker(false);add.focus({preventScroll:true});}
 },true);
 function closeAllSettings(except){
   canvas.querySelectorAll('.v526-card-settings').forEach(el=>{
     if(el===except)return;
     el.hidden=true;el.closest('.v525-widget')?.querySelector('.v526-card-gear')?.setAttribute('aria-expanded','false');
   });
 }

 // V528: Use the EXACT dashboard settings DOM, with original listeners and storage.
 const mainSettings=$('settingsMenu'),mainSettingsToggle=$('settingsToggle'),
       stage=$('v516MenuStage');
 const homeParent=mainSettings?.parentNode,homeSibling=mainSettings?.nextSibling;
 let connectedCard=null,restoring=false;
 function restoreMainSettings(focus=false){
   if(!connectedCard||restoring)return;
   restoring=true;
   const old=connectedCard;connectedCard=null;
   if(mainSettings){mainSettings.hidden=true;mainSettings.classList.remove('v528-card-global-settings');mainSettings.removeAttribute('aria-label');}
   if(mainSettingsToggle){mainSettingsToggle.classList.remove('active');mainSettingsToggle.setAttribute('aria-expanded','false');}
   old.settings.hidden=true;old.anchor.replaceWith(old.settings);
   old.gear.setAttribute('aria-expanded','false');
   if(mainSettings&&homeParent){
     if(homeSibling?.parentNode===homeParent)homeParent.insertBefore(mainSettings,homeSibling);
     else homeParent.appendChild(mainSettings);
   }
   restoring=false;
   if(focus && old.gear.isConnected)old.gear.focus({preventScroll:true});
 }
 function openCardSettings(c,settings,gear){
   if(!mainSettings||!mainSettingsToggle||!stage){
     const opening=settings.hidden;closeAllSettings(settings);settings.hidden=!opening;
     gear.setAttribute('aria-expanded',String(opening));return;
   }
   if(connectedCard?.gear===gear && !mainSettings.hidden){restoreMainSettings(true);return;}
   restoreMainSettings();closeAllSettings(settings);
   const anchor=document.createComment('v528-settings-home');settings.before(anchor);
   connectedCard={cardId:c.id,settings,anchor,gear};
   settings.hidden=false;mainSettings.append(settings);stage.append(mainSettings);
   mainSettings.classList.add('v528-card-global-settings');
   mainSettings.setAttribute('aria-label','Impostazioni dashboard e card '+cardTitle(c));
   gear.setAttribute('aria-expanded','true');
   if(mainSettings.hidden)mainSettingsToggle.click();
   mainSettings.scrollTop=0;
 }
 if(mainSettings){new MutationObserver(()=>{
   if(!restoring && connectedCard && mainSettings.hidden)restoreMainSettings();
 }).observe(mainSettings,{attributes:true,attributeFilter:['hidden']});}
 function options(items,selected){return items.map(([value,label])=>`<option value="${esc(value)}"${selected===value?' selected':''}>${esc(label)}</option>`).join('');}
 function createSettings(c){
   const kind=cardKind(c),asset=cardAsset(c);
   return `<div class="v526-card-settings" hidden role="group" aria-label="Impostazioni card ${esc(cardTitle(c))}">
     <strong class="v526-card-settings-title">⚙ Personalizza card</strong>
     <label>Contenuto
       <select class="v526-set-kind" aria-label="Contenuto card">${options(Object.entries(kinds),kind)}</select>
     </label>
     <label class="v526-asset-field" ${['clock','notes','ab'].includes(kind)?'hidden':''}>Criptovaluta
       <select class="v526-set-asset" aria-label="Criptovaluta della card">${options(Object.entries(assets).map(([id,data])=>[id,data[0]+' · '+data[1]]),asset)}</select>
     </label>
     <label class="v526-interval-field" ${!['chart','indicators'].includes(kind)?'hidden':''}>Intervallo grafico
       <select class="v526-set-interval" aria-label="Intervallo grafico">${options(intervals.map(i=>[i,i]),c.interval)}</select>
     </label>
     <label class="v526-chart-style-field" ${kind!=='chart'?'hidden':''}>Visualizzazione
       <select class="v526-set-chart-style" aria-label="Stile del grafico">${options([['candles','Candele OHLC']], 'candles')}</select>
     </label>
     <label class="v526-depth-field" ${kind!=='orderbook'?'hidden':''}>Livelli book per lato
       <select class="v526-set-depth" aria-label="Livelli order book">${options([[5,'5 livelli'],[10,'10 livelli'],[20,'20 livelli']].map(([v,l])=>[String(v),l]),String(c.depth))}</select>
     </label>
     <div class="v526-size-row"><button type="button" data-size="compact">Compatta</button><button type="button" data-size="medium">Media</button><button type="button" data-size="large">Grande</button></div>
     <small>Puoi anche trascinare l'angolo in basso a destra. Tutte le modifiche si salvano automaticamente.</small>
   </div>`;
 }
 function cardTitle(c){const kind=cardKind(c);if(kind==='asset')return assets[cardAsset(c)][0];return kinds[kind]||'Card';}
 function addCard(type,initial={}){
   if(!isAsset(type)&&!Object.hasOwn(kinds,type))return;
   const idx=cards.length,vw=canvas.clientWidth||innerWidth||800;
   const bw=Math.min(268,Math.max(MIN_W,vw-25)),cols=Math.max(1,Math.floor((vw-14)/(bw+GUTTER)));
   const bh=['chart','ab'].includes(type)?280:208;
   const base={id:'w'+Date.now().toString(36)+'-'+(++counter),type,asset:isAsset(type)?type:'btc',interval:'1h',depth:10,chartStyle:'candles',
     x:12+(idx%cols)*(bw+GUTTER),y:12+Math.floor(idx/cols)*(bh+GUTTER),w:bw,h:bh,note:'',abA:'bitcoin',abB:'ethereum',abLabelA:'Bitcoin (BTC)',abLabelB:'Ethereum (ETH)'};
   const c={...base,...initial,type};
   if(!c.id||cards.some(old=>old.id===c.id))c.id=base.id;
   if(!isAsset(c.asset))c.asset=isAsset(type)?type:'btc';
   if(!intervals.includes(c.interval))c.interval='1h';
   if(![5,10,20].includes(Number(c.depth)))c.depth=10;
   c.chartStyle='candles';
   cards.push(c);mount(c);arrangeCards(c.id);if(empty)empty.hidden=true;save();refreshValues();
   if(visible()){refreshDetailCards();syncCandleStream();}
   return c;
 }
 function removeCard(id){
   if(connectedCard?.cardId===id)restoreMainSettings();
   cards=cards.filter(c=>c.id!==id);findElement(id)?.remove();chartSignatures.delete(id);
   if(empty)empty.hidden=cards.length>0;arrangeCards();save();syncCandleStream();status('Card rimossa. Layout salvato.');
 }
 function iconFromDashboard(type,body){
   const img=document.querySelector('#'+type+'-tab .asset-tab-logo img')||document.querySelector('#'+type+'-market .asset-logo img');
   const src=img?.currentSrc||img?.getAttribute('src');
   if(src){const clone=document.createElement('img');clone.alt='';clone.width=30;clone.height=30;clone.decoding='async';clone.style.cssText='border-radius:50%;object-fit:contain;flex:0 0 30px';clone.src=src;body.appendChild(clone);return;}
   const fallback=document.createElement('b');fallback.textContent=assets[type][1].slice(0,2);fallback.style.cssText='color:#7ebaff';body.appendChild(fallback);
 }
 function mount(c){
   const el=document.createElement('article');el.className='v525-widget';el.dataset.cardId=c.id;
   el.setAttribute('aria-label','Card '+cardTitle(c)+' spostabile e ridimensionabile');
   const title=cardTitle(c);
   el.innerHTML=`<div class="v525-card-head" tabindex="0" role="button" aria-label="Trascina ${esc(title)}. Frecce per spostare la card.">
      <span class="v525-drag-dots" aria-hidden="true">⠿</span><span class="v525-card-title">${esc(title)}</span>
      <button class="v526-card-gear" type="button" aria-label="Impostazioni della card ${esc(title)}" aria-expanded="false" title="Personalizza questa card">⚙</button>
      <button class="v527-card-resize" type="button" aria-label="Ridimensiona card ${esc(title)}: clic per cambiare dimensione, trascina per regolare liberamente" title="Ridimensiona: clic per compatta / media / grande oppure trascina">⤢</button>
      <button class="v525-card-close" type="button" aria-label="Rimuovi card ${esc(title)}" title="Rimuovi card">✕</button>
     </div><div class="v525-card-body"></div>${createSettings(c)}<span class="v525-resize-handle" role="slider" tabindex="0" aria-label="Ridimensiona card con le frecce" aria-valuemin="180" aria-valuemax="720"></span>`;
   const head=el.querySelector('.v525-card-head'),close=el.querySelector('.v525-card-close'),gear=el.querySelector('.v526-card-gear'),resizeButton=el.querySelector('.v527-card-resize'),settings=el.querySelector('.v526-card-settings'),handle=el.querySelector('.v525-resize-handle');
   close.addEventListener('pointerdown',e=>e.stopPropagation());gear.addEventListener('pointerdown',e=>e.stopPropagation());
   close.addEventListener('click',()=>removeCard(c.id));
   gear.addEventListener('click',e=>{e.stopPropagation();openCardSettings(c,settings,gear);});
   const kindInput=settings.querySelector('.v526-set-kind'),assetInput=settings.querySelector('.v526-set-asset'),intervalInput=settings.querySelector('.v526-set-interval'),styleInput=settings.querySelector('.v526-set-chart-style'),depthInput=settings.querySelector('.v526-set-depth');
   const configChanged=()=>{
     const oldKind=cardKind(c),selected=kindInput.value;
     if(oldKind!==selected)c.type=selected;
     // V531: le card originali BTC/ETH/etc devono rispettare la selezione della crypto.
     if(isAsset(c.type)&&selected==='asset'&&assetInput.value!==c.type)c.type='asset';
     c.asset=assetInput.value;c.interval=intervalInput.value;c.chartStyle='candles';c.depth=Number(depthInput.value);
     settings.querySelector('.v526-asset-field').hidden=['clock','notes','ab'].includes(selected);
     settings.querySelector('.v526-interval-field').hidden=!['chart','indicators'].includes(selected);
     settings.querySelector('.v526-chart-style-field').hidden=selected!=='chart';
     settings.querySelector('.v526-depth-field').hidden=selected!=='orderbook';
     el.querySelector('.v525-card-title').textContent=cardTitle(c);
     chartSignatures.delete(c.id);renderBody(c,el);save();refreshValues();refreshHistory(true);refreshDetailCards(true);fetchWorkspaceQuotes(true);connectQuoteStream();syncCandleStream();refreshAllAB(true);
   };
   for(const input of [kindInput,assetInput,intervalInput,styleInput,depthInput])input.addEventListener('change',configChanged);
   settings.querySelectorAll('[data-size]').forEach(btn=>btn.addEventListener('click',()=>setPreset(c,el,btn.dataset.size)));
   let suppressResizeClick=false;
   resizeButton.addEventListener('pointerdown',e=>{e.stopPropagation();beginDrag(e,c,el,'resize',true);});
   resizeButton.addEventListener('click',e=>{
     e.stopPropagation();
     if(suppressResizeClick){suppressResizeClick=false;return;}
     const current=resizeButton.dataset.resizeStep;
     const width=geometry(c).w;
     const next=current==='compact'?'medium':current==='medium'?'large':current==='large'?'compact':
       width<270?'medium':width<385?'large':'compact';
     setPreset(c,el,next);
   });
   resizeButton.addEventListener('v527:dragged',()=>{suppressResizeClick=true;});
   head.addEventListener('pointerdown',e=>beginDrag(e,c,el,'move'));
   handle.addEventListener('pointerdown',e=>beginDrag(e,c,el,'resize'));
   head.addEventListener('keydown',e=>keyboardGeometry(e,c,el,'move'));
   handle.addEventListener('keydown',e=>keyboardGeometry(e,c,el,'resize'));
   resizeButton.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))keyboardGeometry(e,c,el,'resize');});
   renderBody(c,el);canvas.appendChild(el);applyGeometry(c,el);
 }
 function renderBody(c,el){
   const body=el.querySelector('.v525-card-body');body.replaceChildren();body.className='v525-card-body v526-kind-'+cardKind(c);
   const kind=cardKind(c),asset=cardAsset(c);
   if(['asset','chart','orderbook','indicators','stats'].includes(kind)){
     const branding=document.createElement('div');branding.className='v526-branding';iconFromDashboard(asset,branding);
     const name=document.createElement('span');name.textContent=assets[asset][1]+' / USDT';branding.appendChild(name);body.appendChild(branding);
   }
   // V531: il book è mostrato SEMPRE nelle card collegate a una crypto.
   // Non sintetizzare livelli bid/ask: quando manca una fonte spot verificata,
   // mostrare un messaggio esplicito anziché prezzi falsi.
   if(['asset','chart','indicators','stats'].includes(kind)){
     const inline=document.createElement('section');inline.className='v531-inline-book';
     inline.setAttribute('aria-label','Order Book '+assets[asset][0]);
     inline.innerHTML='<div class="v531-book-top"><strong>ORDER BOOK · BID / ASK</strong><small class="v531-book-state">Ricerca book…</small></div><div class="v531-book-levels"></div><small class="v531-book-source">Caricamento da exchange…</small>';
     body.appendChild(inline);
   }
   if(kind==='asset'){
     const quote=document.createElement('div');quote.className='v525-asset-quote';quote.innerHTML='<strong class="v525-asset-price v530-price-neutral">—</strong><span class="v525-asset-change">—</span><small class="v530-quote-source" aria-live="off">Attesa prezzi aggiornati</small>';body.appendChild(quote);
     if(kind==='asset'){const inline=body.querySelector('.v531-inline-book');if(inline)body.appendChild(inline);}
     const chart=document.createElement('div');chart.className='v525-workspace-chart';chart.innerHTML='<div class="v525-graph-wait">Caricamento candele OHLC reali…</div>';body.appendChild(chart);
     const footer=document.createElement('div');footer.className='v525-asset-footer';footer.innerHTML='<span>24h ↑ <b data-field="high">—</b></span><span>24h ↓ <b data-field="low">—</b></span><span>DOM <b data-field="dominance">—</b></span>';body.appendChild(footer);
   }else if(kind==='chart'){
     const meta=document.createElement('div');meta.className='v526-detail-meta';meta.textContent='Candele OHLC reali · '+c.interval;body.appendChild(meta);
     const chart=document.createElement('div');chart.className='v526-candles';chart.textContent='Caricamento candele reali…';body.appendChild(chart);
     const footer=document.createElement('div');footer.className='v526-source';body.appendChild(footer);
   }else if(kind==='indicators'){
     const indicators=document.createElement('div');indicators.className='v526-stats-grid v526-indicators-grid';indicators.textContent='Caricamento indicatori tecnici da candele reali…';body.appendChild(indicators);
     const source=document.createElement('div');source.className='v526-source';body.appendChild(source);
   }else if(kind==='orderbook'){
     const spread=document.createElement('div');spread.className='v526-spread';spread.textContent='Caricamento order book reale…';body.appendChild(spread);
     const book=document.createElement('div');book.className='v526-orderbook';body.appendChild(book);
     const source=document.createElement('div');source.className='v526-source';body.appendChild(source);
   }else if(kind==='stats'){
     const stat=document.createElement('div');stat.className='v526-stats-grid';body.appendChild(stat);
     const source=document.createElement('div');source.className='v526-source';body.appendChild(source);
   }else if(kind==='ab'){
     buildABCard(c,body);
   }else if(kind==='clock')body.innerHTML='<strong class="v525-clock-big">--:--:--</strong><span class="v525-clock-date">—</span>';
   else if(kind==='notes'){
     const area=document.createElement('textarea');area.className='v525-notes-input';area.placeholder='Scrivi qui i tuoi appunti…';area.setAttribute('aria-label','Note del Workspace');area.value=c.note||'';
     area.addEventListener('input',()=>{c.note=area.value;save();});body.appendChild(area);
   }
 }
 function keyboardGeometry(e,c,el,mode){
   const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!arrows[e.key]||e.target!==e.currentTarget)return;
   e.preventDefault();const [dx,dy]=arrows[e.key],step=e.shiftKey?33:11,g=geometry(c);
   if(mode==='move'){c.x=clamp(g.x+dx*step,0,Math.max(0,canvas.clientWidth-g.w));c.y=Math.max(0,g.y+dy*step);}
   else{c.w=clamp(g.w+dx*step,180,Math.max(180,canvas.clientWidth-g.x));c.h=clamp(g.h+dy*step,145,650);}
   arrangeCards(c.id);save();renderDetail(c,el);
 }
 function beginDrag(e,c,el,mode,allowButton=false){
   if(e.button!==0||(!allowButton&&e.target.closest('button,textarea,input,select,.v526-card-settings'))||active)return;
   e.preventDefault();e.stopPropagation();const target=e.currentTarget,start=geometry(c);
   active={c,el,target,mode,start,x:e.clientX,y:e.clientY,id:e.pointerId,moved:false,
     startPositions:new Map(cards.map(item=>[item.id,geometry(item)]))};
   el.classList.add('is-moving');
   target.setPointerCapture?.(e.pointerId);target.addEventListener('pointermove',onMove);target.addEventListener('pointerup',endMove);target.addEventListener('pointercancel',endMove);
 }
 function onMove(e){
   if(!active||e.pointerId!==active.id)return;
   const {c,mode,start,x,y,startPositions}=active,dx=e.clientX-x,dy=e.clientY-y;
   if(Math.abs(dx)+Math.abs(dy)<4&&!active.moved)return;
   active.moved=true;
   if(mode==='move'){c.x=clamp(snap(start.x+dx),0,Math.max(0,canvas.clientWidth-start.w));c.y=Math.max(0,snap(start.y+dy));}
   else{c.w=clamp(snap(start.w+dx),MIN_W,Math.max(MIN_W,canvas.clientWidth-start.x));c.h=clamp(snap(start.h+dy),MIN_H,650);}
   arrangeCards(c.id,startPositions);
 }
 function endMove(e){
   if(!active||e.pointerId!==active.id)return;
   const {target,el,c,moved,mode}=active;try{target.releasePointerCapture?.(e.pointerId);}catch(_){}
   target.removeEventListener('pointermove',onMove);target.removeEventListener('pointerup',endMove);target.removeEventListener('pointercancel',endMove);
   if(moved&&target.classList.contains('v527-card-resize'))target.dispatchEvent(new Event('v527:dragged'));
   el.classList.remove('is-moving');active=null;
   if(moved){if(mode==='resize')el.querySelector('.v527-card-resize')?.removeAttribute('data-resize-step');arrangeCards(c.id);save();renderDetail(c,el);status('Card ridimensionata o spostata. Nessuna sovrapposizione.');}
 }
 confirm.addEventListener('click',()=>{
   if(cards.length>=35){status('Massimo 35 card per mantenere il Workspace reattivo.');return;}
   const c=addCard(choose.value);if(c){status('Card aggiunta. Personalizzala con ⚙ accanto alla X.');togglePicker(false);refreshHistory(true);refreshDetailCards(true);fetchWorkspaceQuotes(false);syncCandleStream();refreshAllAB(true);}
 });
 function priceDOM(t,s){return $(t+'-'+s)?.textContent?.trim()||'—';}
 function marketCache(){
   let list=[];try{list=JSON.parse(localStorage.getItem('dashboard_market_v480_top200_v1')||'{}')?.coins||[];}catch(_){}
   for(const coin of list){
     const matched=Object.keys(assets).find(k=>assets[k][2]===coin?.id&&assets[k][2]);if(!matched)continue;
     marketMeta.set(matched,coin);
     if(Array.isArray(coin.sparkline_in_7d?.price)&&coin.sparkline_in_7d.price.length>=2)
       acceptHistory(matched,coin.sparkline_in_7d.price,'Storico Top 200',Number(coin.last_updated_at||0)*1000||Date.now());
   }
   try{
     const stored=JSON.parse(localStorage.getItem('dashboard_market_v480_history_v1')||'{}');
     for(const [asset,desc] of Object.entries(assets)){
       if(!desc[2])continue;
       const history=stored['coingecko:'+desc[2]];
       if(history?.spark?.length>=2)acceptHistory(asset,history.spark,'Storico Top 200',Number(history.at)||Date.now());
     }
   }catch(_){}
 }
 function miniCandles(candles){
   if(!Array.isArray(candles)||candles.length<2)return null;
   const list=candles.slice(-44),lo=Math.min(...list.map(x=>x.l)),hi=Math.max(...list.map(x=>x.h));
   const spread=Math.max(hi-lo,hi*1e-7,1e-12),ns='http://www.w3.org/2000/svg';
   const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 300 84');svg.setAttribute('preserveAspectRatio','none');
   svg.setAttribute('class','v530-mini-candles');svg.setAttribute('role','img');svg.setAttribute('aria-label',list.length+' candele OHLC reali');
   const y=v=>79-(v-lo)/spread*74,step=292/list.length,w=Math.max(1.6,step*.65);
   for(let i=0;i<list.length;i++){
     const d=list[i],x=4+(i+.5)*step,col=d.c>d.o?'#16c784':d.c<d.o?'#ef596b':'#8da5c3';
     const wick=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:x,y1:y(d.h),x2:x,y2:y(d.l),stroke:col,'stroke-width':1.25}))wick.setAttribute(k,String(v));svg.append(wick);
     const rect=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:x-w/2,y:Math.min(y(d.o),y(d.c)),width:w,height:Math.max(1.3,Math.abs(y(d.o)-y(d.c))),fill:col,rx:.5}))rect.setAttribute(k,String(v));svg.append(rect);
   }
   return svg;
 }
 function updateSmallChart(c,el){
   const holder=el.querySelector('.v525-workspace-chart');if(!holder)return;
   const asset=cardAsset(c),record=bestCandles(asset,'1h');
   const values=record?.data||[],signature='mini:'+asset+':'+(record?.at||0)+':'+values.length+':'+(values.at(-1)?.c||0);
   if(chartSignatures.get(c.id)===signature)return;chartSignatures.set(c.id,signature);
   const svg=miniCandles(values);
   if(svg){svg.setAttribute('title',String(record.source||'Fonte dati')+' · '+values.length+' candele OHLC · aggiornato '+nowText());holder.replaceChildren(svg);}
   else holder.textContent='Recupero candele OHLC reali…';
 }
 function statsRows(c,el){
   const asset=cardAsset(c),coin=marketMeta.get(asset),host=el.querySelector('.v526-stats-grid');if(!host)return;
   const entries=[
     ['Prezzo',priceDOM(asset,'price')!=='—'?priceDOM(asset,'price'):coin?.current_price?('$'+fmt(coin.current_price,8)):'—'],
     ['Variazione 24h',priceDOM(asset,'change')!=='—'?priceDOM(asset,'change'):Number.isFinite(Number(coin?.price_change_percentage_24h))?num(coin.price_change_percentage_24h,0).toFixed(2)+'%':'—'],
     ['Massimo 24h',priceDOM(asset,'high')],['Minimo 24h',priceDOM(asset,'low')],
     ['Capitalizzazione',Number(coin?.market_cap)>0?'$'+fmt(coin.market_cap,0):'—'],
     ['Volume 24h',Number(coin?.total_volume)>0?'$'+fmt(coin.total_volume,0):'—'],
     ['Supply',Number(coin?.circulating_supply)>0?fmt(coin.circulating_supply,0):'—'],
     ['Dominance',priceDOM(asset,'card-dominance')]
   ];
   host.replaceChildren(...entries.map(([label,value])=>{const box=document.createElement('div');box.className='v526-stat';const text=document.createElement('span');text.textContent=label;const strong=document.createElement('strong');strong.textContent=value;if(label==='Prezzo'){const q=quoteMap.get(asset);strong.classList.add('v530-price-'+(q?.dir||directionFromChange(coin?.price_change_percentage_24h)));if(q?.price>0)strong.textContent='$'+fmt(q.price,8);}itemQuoteColor(label,strong,value);box.append(text,strong);return box;}));
   el.querySelector('.v526-source').textContent=quoteMap.has(asset)?quoteSourceLabel(quoteMap.get(asset)):'Dati dashboard + CoinGecko · API';
 }
 function refreshValues(){
   if(!visible())return;const now=new Date();
   for(const c of cards){
     const el=findElement(c.id);if(!el)continue;const kind=cardKind(c),asset=cardAsset(c);
     if(kind==='asset'){
       const price=el.querySelector('.v525-asset-price'),change=el.querySelector('.v525-asset-change'),coin=marketMeta.get(asset);
       const q=quoteMap.get(asset),live=priceDOM(asset,'price');
       const p=q?.price>0?'$'+fmt(q.price,8):live!=='—'?live:coin?.current_price?'$'+fmt(coin.current_price,8):'—';
       if(price){if(price.textContent!==p)price.textContent=p;price.classList.remove('v530-price-up','v530-price-down','v530-price-neutral');price.classList.add('v530-price-'+(q?.dir||directionFromChange(coin?.price_change_percentage_24h)));}
       const domChange=priceDOM(asset,'change');const pct=q?.pct ?? (Number.isFinite(Number(coin?.price_change_percentage_24h))?Number(coin.price_change_percentage_24h):null);
       const ch=pct!==null?(pct>0?'+':'')+pct.toFixed(2)+'% · 24h':domChange;
       if(change){change.textContent=ch;change.className='v525-asset-change '+(pct>0?'up':pct<0?'down':'v530-price-neutral');}
       const source=el.querySelector('.v530-quote-source');if(source)source.textContent=q?quoteSourceLabel(q):'Dati dashboard / API · aggiornamento periodico';
       for(const field of ['high','low']){const label=el.querySelector(`[data-field="${field}"]`);if(label)label.textContent=priceDOM(asset,field);}
       const dom=el.querySelector('[data-field="dominance"]');if(dom)dom.textContent=priceDOM(asset,'card-dominance');updateSmallChart(c,el);
     }else if(kind==='stats')statsRows(c,el);
     else if(kind==='ab')renderAB(c,el);
     else if(kind==='clock'){
       const time=el.querySelector('.v525-clock-big'),date=el.querySelector('.v525-clock-date');
       if(time)time.textContent=now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
       if(date)date.textContent=now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
     }
   }
 }
 function queueMissingHistories(){
   if(!visible())return;
   const required=[...new Set(cards.filter(c=>['asset','chart'].includes(cardKind(c))).map(cardAsset))];
   const now=Date.now();
   for(const key of required){
     const current=chartData.get(key);
     if(current?.values?.length>=2&&now-(current.at||0)<HISTORY_TTL)continue;
     if(historyPending.has(key)||historyQueue.includes(key)||(historyRetryAt.get(key)||0)>now)continue;
     historyQueue.push(key);
   }
   pumpHistories();
 }
 function pumpHistories(){
   if(!visible())return;
   // Limit simultaneous requests. GeckoTerminal's public API is rate limited.
   while(historyWorkers<2&&historyQueue.length){
     const key=historyQueue.shift();
     if(!key||historyPending.has(key))continue;
     historyWorkers++;historyPending.add(key);updateChartsForAsset(key);
     loadHistoryForAsset(key).then(success=>{
       if(!success)historyRetryAt.set(key,Date.now()+4*60*1000);
       else historyRetryAt.delete(key);
     }).catch(()=>{historyRetryAt.set(key,Date.now()+4*60*1000);})
       .finally(()=>{
         historyWorkers--;historyPending.delete(key);
         updateChartsForAsset(key);pumpHistories();
       });
   }
 }
 async function loadHistoryForAsset(key){
   const asset=assets[key];if(!asset)return false;
   const symbol=asset[3],id=asset[2];
   // 1) Exchange candle closes, anchored to an asset-specific configured pair.
   if(symbol){
     try{
       const raw=await requestJSON('https://data-api.binance.vision/api/v3/klines?symbol='+encodeURIComponent(symbol)+'&interval=1h&limit=168',11000);
       const candle=candleFromBinance(raw);
       if(candle?.length>=2&&acceptHistory(key,candle.map(v=>v.c),'Binance · 1h'))return true;
     }catch(_){}
   }
   // 2) CoinGecko, using the COIN ID (not the ambiguous ticker).
   if(id){
     try{
       const data=await requestJSON('https://api.coingecko.com/api/v3/coins/'+encodeURIComponent(id)+'/market_chart?vs_currency=usd&days=7',13000);
       const points=Array.isArray(data?.prices)?data.prices.filter(p=>Array.isArray(p)&&Number(p[0])>0).sort((a,b)=>a[0]-b[0]).map(p=>p[1]):[];
       if(acceptHistory(key,points,'CoinGecko · 7 giorni'))return true;
     }catch(_){}
   }
   // 3) For ORE and TARS AI, use the verified on-chain mint to locate real DEX OHLCV.
   if(DEX_MINTS[key]){
     try{
       const mint=DEX_MINTS[key];
       const data=await requestJSON('https://api.geckoterminal.com/api/v2/networks/solana/tokens/'+encodeURIComponent(mint)+'/pools',11000);
       const candidates=(Array.isArray(data?.data)?data.data:[]).map(pool=>{
         const base=String(pool.relationships?.base_token?.data?.id||'').split('_').slice(1).join('_');
         const quote=String(pool.relationships?.quote_token?.data?.id||'').split('_').slice(1).join('_');
         const token=base===mint?'base':quote===mint?'quote':null;
         return {pool,token,liquidity:Number(pool.attributes?.reserve_in_usd)||0};
       }).filter(p=>p.token&&p.liquidity>0).sort((a,b)=>b.liquidity-a.liquidity);
       for(const p of candidates.slice(0,2)){
         const address=String(p.pool.attributes?.address||p.pool.id||'').replace(/^solana_/, '');
         if(!address)continue;
         try{
           const url='https://api.geckoterminal.com/api/v2/networks/solana/pools/'+encodeURIComponent(address)+'/ohlcv/hour?aggregate=1&limit=168&currency=usd&token='+p.token;
           const response=await requestJSON(url,11000);
           const values=response?.data?.attributes?.ohlcv_list;
           if(!Array.isArray(values))continue;
           const sorted=values.filter(x=>Array.isArray(x)&&Number.isFinite(Number(x[0]))&&Number(x[4])>0).sort((a,b)=>Number(a[0])-Number(b[0]));
           if(acceptHistory(key,sorted.map(x=>Number(x[4])),'GeckoTerminal · Solana · 1h'))return true;
         }catch(_){}
       }
     }catch(_){}
   }
   // 4) CryptoCompare only for a small unambiguous major-asset symbol whitelist;
   // verify the latest USD close against the latest quote to avoid same-ticker tokens.
   if(['btc','eth','bnb','sol','ray','inj','wld','tao'].includes(key)){
     try{
       const data=await requestJSON('https://min-api.cryptocompare.com/data/v2/histohour?fsym='+encodeURIComponent(asset[1])+'&tsym=USD&limit=168',11000);
       const rows=data?.Data?.Data;
       if(data?.Response==='Success'&&Array.isArray(rows)){
         const clean=rows.filter(v=>Number(v.close)>0&&Number(v.time)>0).sort((a,b)=>a.time-b.time);
         const last=Number(clean.at(-1)?.close);
         const reference=Number(marketMeta.get(key)?.current_price);
         if(clean.length>=2&&(!Number.isFinite(reference)||reference<=0||(last/reference>.65&&last/reference<1.55))){
           if(acceptHistory(key,clean.map(p=>Number(p.close)),'CryptoCompare · 1h'))return true;
         }
       }
     }catch(_){}
   }
   return false;
 }
 function refreshHistory(force){
   if(!visible())return;
   const now=Date.now();
   if(force||now-lastCacheAt>60000){marketCache();lastCacheAt=now;}
   const needed=[...new Set(cards.map(cardAsset))].filter(k=>assets[k]?.[2]&&(!chartData.has(k)||now-(chartData.get(k)?.at||0)>HISTORY_TTL));
   if(historyBatchPending||now-networkAt<90000){queueMissingHistories();return;}
   if(!needed.length){queueMissingHistories();return;}
   networkAt=now;historyBatchPending=true;
   const ids=needed.map(k=>assets[k][2]).join(',');
   requestJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent(ids)+'&sparkline=true',14000)
     .then(list=>{
       if(!Array.isArray(list))return;
       for(const coin of list){const key=needed.find(k=>assets[k][2]===coin.id);if(!key)continue;
         marketMeta.set(key,coin);
         acceptHistory(key,coin.sparkline_in_7d?.price,'CoinGecko · 7 giorni');
       }
     }).catch(()=>{}).finally(()=>{
       historyBatchPending=false;
       refreshValues();queueMissingHistories();
     });
 }
 async function requestJSON(url,timeout=11000){
   const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),timeout);
   try{const res=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-store',signal:ctl.signal});if(!res.ok)throw Error('HTTP '+res.status);return await res.json();}
   finally{clearTimeout(tm);}
 }
 const nowText=()=>new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 function cachedFetch(cache,key,url,parse,ttl){
   const old=cache.get(key);if(old?.data&&Date.now()-old.at<ttl)return Promise.resolve(old);
   if(inflight.has(key))return inflight.get(key);
   const request=requestJSON(url).then(raw=>{
     const data=parse(raw);if(!data)throw Error('Dati non disponibili');
     const result={data,at:Date.now()};cache.set(key,result);return result;
   }).finally(()=>inflight.delete(key));
   inflight.set(key,request);return request;
 }
 function candleFromBinance(rows){
   if(!Array.isArray(rows))return null;
   const clean=rows.filter(r=>Array.isArray(r)&&r.length>=6).map(r=>({t:Number(r[0]),o:Number(r[1]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4]),v:Number(r[5])}))
     .filter(r=>Number.isFinite(r.t)&&r.o>0&&r.c>0&&r.h>=r.l&&r.l>0);
   return clean.length>=2?clean:null;
 }
 function candleSvg(candles,style){
   const list=candles.slice(-80),lo=Math.min(...list.map(d=>d.l)),hi=Math.max(...list.map(d=>d.h)),range=Math.max(hi-lo,hi*.000001,1e-10);
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
   svg.setAttribute('viewBox','0 0 640 270');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','v526-candle-svg');svg.setAttribute('role','img');svg.setAttribute('aria-label','Grafico con '+list.length+' candele OHLC reali');
   const add=(name,attrs,parent=svg)=>{const el=document.createElementNS(ns,name);Object.entries(attrs).forEach(([a,v])=>el.setAttribute(a,String(v)));parent.append(el);return el;};
   const X=i=>8+(i+.5)*548/list.length,Y=v=>202-187*(v-lo)/range;
   for(let i=0;i<5;i++){
     const yy=16+i*46.5;add('line',{x1:8,y1:yy,x2:558,y2:yy,stroke:'currentColor','stroke-opacity':'.12','stroke-dasharray':'3 5'});
     const n=hi-(hi-lo)*i/4;const label=add('text',{x:564,y:yy+4,fill:'currentColor','font-size':12,'font-family':'system-ui'});label.textContent=fmt(n,n>=1?3:8);
   }
   const maxVol=Math.max(...list.map(d=>d.v),1);
   list.forEach((d,i)=>{
     const x=X(i),col=d.c>=d.o?'#16c784':'#ef596b',width=Math.max(1,548/list.length*.62);
     add('rect',{x:x-width/2,y:210+34*(1-d.v/maxVol),width,height:Math.max(.7,34*d.v/maxVol),fill:col,'fill-opacity':'.25'});
     if(style!=='line'){
       add('line',{x1:x,y1:Y(d.h),x2:x,y2:Y(d.l),stroke:col,'stroke-width':'1.6'});
       add('rect',{x:x-width/2,y:Math.min(Y(d.o),Y(d.c)),width,height:Math.max(1,Math.abs(Y(d.o)-Y(d.c))),fill:col,rx:'.8'});
     }
   });
   if(style==='line')add('polyline',{points:list.map((d,i)=>`${X(i)},${Y(d.c)}`).join(' '),fill:'none',stroke:list.at(-1).c>=list[0].c?'#16c784':'#ef596b','stroke-width':'2.4','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'});
   const last=list.at(-1),label=add('text',{x:8,y:260,fill:'currentColor','font-size':12,'font-family':'system-ui'});label.textContent='Ultimo: '+fmt(last.c,8)+' USDT';
   return svg;
 }
 function chartDisplay(c,el){
   const area=el.querySelector('.v526-candles'),footer=el.querySelector('.v526-source');if(!area)return;
   const key=cardAsset(c),record=bestCandles(key,c.interval);
   if(record?.data?.length>=2){
     const signature='ohlc:'+key+':'+c.interval+':'+record.at+':'+record.data.at(-1).c;
     if(chartSignatures.get(c.id)!==signature){area.replaceChildren(candleSvg(record.data,'candles'));chartSignatures.set(c.id,signature);}
     footer.textContent=(record.source||'Candele OHLC reali')+' · '+(record.interval||c.interval)+' · '+new Date(record.at).toLocaleTimeString('it-IT')+(record.source==='Binance WebSocket OHLC'?' · LIVE':' · API periodica');
   }else{
     area.textContent='Ricerca candele OHLC reali da Binance, CoinGecko o GeckoTerminal…';
     footer.textContent='Nessuna candela costruita artificialmente · in attesa di OHLC';
   }
 }
 function technicalDisplay(c,el){
    const host=el.querySelector('.v526-indicators-grid'),source=el.querySelector('.v526-source');if(!host)return;
    const asset=cardAsset(c),symbol=assets[asset][3],record=bestCandles(asset,c.interval);
    if(!record?.data){host.textContent=symbol?'In attesa di candele OHLC reali…':'Indicatori non disponibili: coppia Spot non verificata';source.textContent='Indicatori derivati da quotazioni reali, non previsionali';return;}
    const close=record.data.map(x=>x.c),last=close.at(-1);
    function ema(input,period){const result=[];const alpha=2/(period+1);let prev;
      input.forEach((v,i)=>{if(i<period-1){result.push(null);return;}if(i===period-1){prev=input.slice(0,period).reduce((a,b)=>a+b,0)/period;result.push(prev);return;}prev=alpha*v+(1-alpha)*prev;result.push(prev);});
      return result;
    }
    function rsi(input,n=14){if(input.length<n+1)return null;
      let up=0,down=0;for(let i=1;i<=n;i++){const delta=input[i]-input[i-1];up+=Math.max(0,delta);down+=Math.max(0,-delta);}
      up/=n;down/=n;for(let i=n+1;i<input.length;i++){const d=input[i]-input[i-1];up=(up*(n-1)+Math.max(0,d))/n;down=(down*(n-1)+Math.max(0,-d))/n;}
      return down===0?100:100-100/(1+up/down);
    }
    const ema12=ema(close,12),ema26=ema(close,26);
    const macd=close.map((_,i)=>ema12[i]!=null&&ema26[i]!=null?ema12[i]-ema26[i]:null);
    const signal=ema(macd.filter(v=>v!=null),9).at(-1);
    const latestMacd=macd.at(-1);
    const rsi14=rsi(close);
    const values=[['Prezzo USDT',fmt(last,8)],['RSI 14',rsi14!=null?rsi14.toFixed(2):'—'],
      ['EMA 12',fmt(ema12.at(-1),8)],['EMA 26',fmt(ema26.at(-1),8)],
      ['MACD 12/26',latestMacd!=null?latestMacd.toFixed(7):'—'],['Segnale MACD 9',signal!=null?signal.toFixed(7):'—'],
      ['Vol. ultima candela',fmt(record.data.at(-1).v,4)],['Candele disponibili',String(record.data.length)]];
    host.replaceChildren(...values.map(([label,value])=>{const item=document.createElement('div');item.className='v526-stat';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;item.append(l,v);return item;}));
    source.textContent='Calcolati su '+record.data.length+' candele OHLC · '+(record.source||'API')+' · '+(record.interval||c.interval)+' · '+new Date(record.at).toLocaleTimeString('it-IT');
 }
 function bookFromExchange(raw){
   if(!Array.isArray(raw?.bids)||!Array.isArray(raw?.asks))return null;
   const clean=a=>a.map(v=>[Number(v[0]),Number(v[1])]).filter(v=>v[0]>0&&v[1]>0&&v.every(Number.isFinite));
   const bids=clean(raw.bids).sort((a,b)=>b[0]-a[0]),asks=clean(raw.asks).sort((a,b)=>a[0]-b[0]);
   return bids.length&&asks.length?{bids,asks}:null;
 }
 // Un book Spot esiste solo quando una coppia è effettivamente quotata su un exchange.
 // ORE e TARS AI possono essere scambiate su AMM (senza book centralizzato):
 // NON usare il ticker su exchange differenti (potrebbe identificare altri token).
 const noVerifiedSpot=new Set(['ore','tai']);
 const bookKey=asset=>'ob:'+asset;
 function bookEndpoints(asset){
   if(noVerifiedSpot.has(asset))return [];
   const info=assets[asset];if(!info)return [];
   const base=info[1].toUpperCase(),symbol=info[3],list=[];
   const gatePair=base+'_USDT';
   if(asset==='orai'){
     list.push({source:'Gate.io Spot API',url:'https://api.gateio.ws/api/v4/spot/order_book?currency_pair=ORAI_USDT&limit=20',parse:raw=>bookFromExchange(raw)});
   }else if(symbol){
     list.push({source:'Binance Spot API',url:'https://data-api.binance.vision/api/v3/depth?symbol='+encodeURIComponent(symbol)+'&limit=100',parse:raw=>bookFromExchange(raw)});
   }
   // Solo per ticker di asset noti, mai cercare pool/altcoin sconosciute per simbolo.
   if(asset!=='orai')list.push({source:'Gate.io Spot API',url:'https://api.gateio.ws/api/v4/spot/order_book?currency_pair='+encodeURIComponent(gatePair)+'&limit=20',parse:raw=>bookFromExchange(raw)});
   list.push({source:'KuCoin Spot API',url:'https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol='+encodeURIComponent(base+'-USDT'),parse:raw=>raw?.code==='200000'?bookFromExchange(raw.data):null});
   return list;
 }
 function showBookForAsset(asset){
   for(const c of cards){if(cardAsset(c)!==asset)continue;
     const kind=cardKind(c);if(!['asset','chart','indicators','stats','orderbook'].includes(kind))continue;
     const el=findElement(c.id);if(!el)continue;
     if(kind==='orderbook')orderBookDisplay(c,el);
     else miniBookDisplay(c,el);
   }
 }
 async function loadSpotOrderBook(asset){
   const candidates=bookEndpoints(asset);
   if(!candidates.length)throw Error('Nessuna coppia Spot verificata per questo token');
   let lastErr;
   for(const candidate of candidates){
     try{
       const raw=await requestJSON(candidate.url,8500),data=candidate.parse(raw);
       if(!data)throw Error('Nessun livello bid/ask');
       // La risposta è uno snapshot REST, non pubblicizzarla come un feed streaming.
       const record={data,at:Date.now(),source:candidate.source};
       const latest=bookCache.get(bookKey(asset));
       if(!(latest?.source==='Binance WebSocket Depth 20'&&Date.now()-latest.at<8000))bookCache.set(bookKey(asset),record);
       return record;
     }catch(err){lastErr=err;}
   }
   throw lastErr||Error('Order Book non disponibile');
 }
 function miniBookDisplay(c,el){
   const host=el.querySelector('.v531-inline-book');if(!host)return;
   const asset=cardAsset(c),record=bookCache.get(bookKey(asset));
   const levels=host.querySelector('.v531-book-levels'),state=host.querySelector('.v531-book-state'),source=host.querySelector('.v531-book-source');
   if(!record?.data){
     const unavailable=noVerifiedSpot.has(asset);
     levels.textContent=unavailable?'Nessun book Spot verificato per questo token.':'Ricerca livelli BID e ASK da Binance, Gate.io e KuCoin…';
     state.textContent=unavailable?'DEX / NO BOOK':errors.has(bookKey(asset))?'NON DISPONIBILE':'RICERCA';
     source.textContent=unavailable?'I pool AMM non pubblicano un libro ordini centralizzato.':'Nessun ordine inventato · dati reali da exchange';
     host.dataset.rendered='';return;
   }
   if(host.dataset.rendered===String(record.at))return;
   host.dataset.rendered=String(record.at);
   const depth=Math.min(3,Math.max(2,Number(c.depth)||3));
   const formatSide=(side,label)=>{
     const col=document.createElement('div');col.className='v531-book-side';
     const caption=document.createElement('b');caption.textContent=label;col.append(caption);
     for(const [price,qty] of side.slice(0,depth)){
       const row=document.createElement('div');row.className='v531-book-row';
       const p=document.createElement('span');p.textContent=fmt(price,8);
       const v=document.createElement('span');v.textContent=fmt(qty,5);
       row.append(p,v);col.append(row);
     }
     return col;
   };
   levels.replaceChildren(formatSide(record.data.bids,'ACQUISTI · BID'),formatSide(record.data.asks,'VENDITE · ASK'));
   const fresh=record.source==='Binance WebSocket Depth 20'&&Date.now()-record.at<15000;
   state.textContent=fresh?'● LIVE':'● API';
   source.textContent=record.source+' · '+new Date(record.at).toLocaleTimeString('it-IT')+' · '+assets[asset][1]+'/USDT';
 }
 function orderBookDisplay(c,el){
   const book=el.querySelector('.v526-orderbook'),spread=el.querySelector('.v526-spread'),footer=el.querySelector('.v526-source');if(!book||!spread)return;
   const asset=cardAsset(c),record=bookCache.get(bookKey(asset));
   if(!record?.data){
     const unavailable=noVerifiedSpot.has(asset);
     book.textContent=unavailable?'Nessun libro ordini Spot verificato per questa crypto: un pool AMM non ha BID/ASK centralizzati.'
       :errors.has(bookKey(asset))?'Nessun Order Book reperibile dalle fonti Spot collegate. Nuovo tentativo automatico.':'Ricerca livelli reali BID / ASK…';
     spread.textContent='Order Book · '+assets[asset][1]+'/USDT';
     footer.textContent='Nessun livello inventato · '+(unavailable?'DEX/AMM': 'Binance, Gate.io, KuCoin');return;
   }
   const bids=record.data.bids.slice(0,c.depth),asks=record.data.asks.slice(0,c.depth);
   const bid=bids[0]?.[0],ask=asks[0]?.[0],delta=ask-bid;
   spread.textContent=`Spread: ${fmt(delta,8)} USDT · ${(delta/((ask+bid)/2)*100).toFixed(3)}%`;
   const side=(entries,label)=>{
     const col=document.createElement('div');col.className='v526-book-side';
     const h=document.createElement('strong');h.textContent=label;col.append(h);
     const max=Math.max(...entries.map(r=>r[1]),1e-12);
     entries.forEach(([price,qty])=>{
       const row=document.createElement('div');row.className='v526-book-level';row.style.setProperty('--book-fill',Math.max(1,qty/max*100)+'%');
       const p=document.createElement('span');p.textContent=fmt(price,8);const q=document.createElement('span');q.textContent=fmt(qty,6);row.append(p,q);col.append(row);
     });return col;
   };
   book.replaceChildren(side(bids,'ACQUISTI · BID'),side(asks,'VENDITE · ASK'));
   footer.textContent=(record.source||'API Spot')+' · '+new Date(record.at).toLocaleTimeString('it-IT')+' · '+c.depth+' livelli per lato';
 }
 function renderDetail(c,el){const kind=cardKind(c);if(kind==='chart')chartDisplay(c,el);else if(kind==='asset')updateSmallChart(c,el);else if(kind==='indicators')technicalDisplay(c,el);else if(kind==='orderbook')orderBookDisplay(c,el);else if(kind==='ab')renderAB(c,el);if(['asset','chart','indicators','stats'].includes(kind))miniBookDisplay(c,el);}
 const errors=new Map();
 function refreshDetailCards(force=false){
   if(!visible())return;
   const current=Date.now();
   // Deduplicate identical market requests across cards. Requests only while Workspace is visible.
   const chartRequests=new Map(),bookRequests=new Map();
   for(const c of cards){
     const asset=cardAsset(c),symbol=assets[asset][3];
     if(['chart','indicators','asset'].includes(cardKind(c))){const interval=cardKind(c)==='asset'?'1h':c.interval;chartRequests.set('k:'+asset+':'+interval,{asset,symbol,interval});}
     if(['asset','chart','indicators','stats','orderbook'].includes(cardKind(c)))bookRequests.set(bookKey(asset),{asset,symbol});
   }
   for(const [cacheKey,req] of chartRequests){
     const entries=candleCache.get(cacheKey),delay=['1m','5m','15m'].includes(req.interval)?14000:35000;
     if(!force&&entries&&current-entries.at<delay)continue;
     if(inflight.has(cacheKey)||current-(errors.get(cacheKey)||0)<50000)continue;
     const promise=loadRealCandles(req,cacheKey);
     inflight.set(cacheKey,promise);
     promise.then(record=>{
       if(!record?.data?.length)throw Error('OHLC assenti');
       const latest=candleCache.get(cacheKey);
       // Never roll back a freshly received WebSocket candle with a slower REST response.
       if(!(latest?.source==='Binance WebSocket OHLC'&&Date.now()-latest.at<9000))candleCache.set(cacheKey,record);
       errors.delete(cacheKey);
       for(const c of cards)if(cardAsset(c)===req.asset && (cardKind(c)==='asset'||(['chart','indicators'].includes(cardKind(c))&&c.interval===req.interval))){const el=findElement(c.id);if(el)renderDetail(c,el);}
     }).catch(()=>{errors.set(cacheKey,Date.now());})
       .finally(()=>inflight.delete(cacheKey));
   }
   for(const [cacheKey,req] of bookRequests){
     const entries=bookCache.get(cacheKey);
     // Un feed WS Binance fresco ha priorità sulla REST. Le REST vengono
     // recuperate meno spesso per non superare i limiti pubblici.
     const ttl=entries?.source==='Binance WebSocket Depth 20'?28000:12000;
     if(!force&&entries&&current-entries.at<ttl)continue;
     if(inflight.has(cacheKey)||current-(errors.get(cacheKey)||0)<45000)continue;
     if(!bookEndpoints(req.asset).length){showBookForAsset(req.asset);continue;}
     const promise=loadSpotOrderBook(req.asset);
     inflight.set(cacheKey,promise);
     promise.then(()=>{errors.delete(cacheKey);showBookForAsset(req.asset);})
       .catch(()=>{errors.set(cacheKey,Date.now());showBookForAsset(req.asset);})
       .finally(()=>inflight.delete(cacheKey));
   }
   for(const c of cards){const el=findElement(c.id);if(el)renderDetail(c,el);}
 }
 // V530: directions are computed from actual consecutive quotes, falling back to
 // the published 24h change for the first reading. No fabricated live prices.
 function directionFromChange(raw){
   if(raw===null||raw===undefined||raw==='')return 'neutral';
   const x=Number(raw);return Number.isFinite(x)?(x>0?'up':x<0?'down':'neutral'):'neutral';
 }
 function itemQuoteColor(label,node,value){
   if(label==='Variazione 24h'){
     const n=parseFloat(String(value).replace(',','.'));
     node.classList.add('v530-price-'+directionFromChange(Number.isFinite(n)?n:null));
   }
 }
 function quoteSourceLabel(q){
   const time=new Date(q.at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
   const fresh=Date.now()-q.at<15000;
   return (q.source==='Binance WebSocket'&&fresh?'● LIVE · ':'● API · ')+q.source+' · '+time+(Date.now()-q.at>QUOTE_POLL_MS*2?' · dato non aggiornato':'');
 }
 function applyQuote(asset,price,pct,source,at=Date.now()){
   const p=Number(price);if(!isAsset(asset)||!(p>0)||!Number.isFinite(p))return;
   const prior=quoteMap.get(asset);
   if(prior?.source==='Binance WebSocket'&&source!=='Binance WebSocket'&&prior.at>at-20000)return;
   if(prior?.price>0&&(p/prior.price>.0)&& (p/prior.price>4||p/prior.price<.25))return;
   const percentage=Number.isFinite(Number(pct))&&pct!==null?Number(pct):(prior?.pct??null);
   const dir=prior?.price>0?(p>prior.price?'up':p<prior.price?'down':'neutral'):directionFromChange(percentage);
   quoteMap.set(asset,{price:p,pct:percentage,dir,source,at});
 }
 let quoteRenderTimeout=null;
 function queueQuoteRender(){
   if(quoteRenderTimeout!==null)return;
   quoteRenderTimeout=setTimeout(()=>{quoteRenderTimeout=null;if(visible()){refreshValues();refreshAllAB(false);}},220);
 }
 function fetchWorkspaceQuotes(force=false){
   if(!visible()||Date.now()-lastQuotePoll<QUOTE_POLL_MS)return;
   lastQuotePoll=Date.now();
   const ids=Object.values(assets).map(d=>d[2]).filter(Boolean).join(',');
   requestJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent(ids)+'&sparkline=false',14000)
     .then(list=>{
       if(!Array.isArray(list))return;
       for(const coin of list){
         const key=Object.keys(assets).find(k=>assets[k][2]===coin.id);
         if(!key)continue;
         marketMeta.set(key,coin);
         applyQuote(key,coin.current_price,coin.price_change_percentage_24h,'CoinGecko API',Date.now());
       }
       queueQuoteRender();
     }).catch(()=>{});
 }
 function connectQuoteStream(){
   if(!visible()||quoteSocket||typeof WebSocket==='undefined')return;
   const pairMap=new Map(Object.keys(assets).filter(k=>assets[k][3]).map(k=>[assets[k][3],k]));
   try{
     const ws=new WebSocket('wss://data-stream.binance.vision/ws/!miniTicker@arr');quoteSocket=ws;
     ws.onmessage=e=>{
       if(!visible())return;
       let data;try{data=JSON.parse(e.data);}catch(_){return;}
       if(!Array.isArray(data))return;
       let updated=false;
       for(const ticker of data){
         const key=pairMap.get(ticker.s),price=Number(ticker.c),open=Number(ticker.o);
         if(!key||!Number.isFinite(price)||price<=0)continue;
         const reference=Number(marketMeta.get(key)?.current_price);
         if(reference>0&&(price/reference>2||price/reference<.5))continue;
         applyQuote(key,price,open>0?(price/open-1)*100:null,'Binance WebSocket');updated=true;
       }
       if(updated)queueQuoteRender();
     };
     ws.onerror=()=>{try{ws.close();}catch(_){}};
     ws.onclose=()=>{
       if(quoteSocket===ws)quoteSocket=null;
       if(visible()&&!quoteRetry)quoteRetry=setTimeout(()=>{quoteRetry=null;connectQuoteStream();},4500);
     };
   }catch(_){quoteSocket=null;}
 }
 function disconnectQuoteStream(){
   if(quoteRetry){clearTimeout(quoteRetry);quoteRetry=null;}
   const ws=quoteSocket;quoteSocket=null;
   if(ws){ws.onclose=null;try{ws.close();}catch(_){}}
 }
 // Every displayed candle must be a provider-supplied OHLC point. Do not
 // reconstruct open/high/low from simple daily price samples.
 function validatedOHLC(list){
   return Array.isArray(list)?list.filter(x=>x&&x.t>0&&x.o>0&&x.h>0&&x.l>0&&x.c>0&&
     Number.isFinite(x.t)&&Number.isFinite(x.o)&&Number.isFinite(x.h)&&Number.isFinite(x.l)&&Number.isFinite(x.c)&&x.h>=Math.max(x.o,x.c,x.l)&&x.l<=Math.min(x.o,x.c,x.h))
     .sort((a,b)=>a.t-b.t).slice(-130):[];
 }
 function bestCandles(asset,interval){
   const data=candleCache.get('k:'+asset+':'+interval);
   if(data?.data?.length>=2)return data;
   if(interval!=='1h'){
     const oneHour=candleCache.get('k:'+asset+':1h');
     if(oneHour?.data?.length>=2)return oneHour;
   }
   return null;
 }
 async function loadRealCandles(req,cacheKey){
   const {asset,symbol,interval}=req;
   // Main exchange OHLC first, preserves true selected time frame.
   if(symbol){
     try{
       const data=await requestJSON('https://data-api.binance.vision/api/v3/klines?symbol='+encodeURIComponent(symbol)+'&interval='+interval+'&limit=90',11500);
       const result=validatedOHLC(candleFromBinance(data));
       if(result.length>=2)return {data:result,source:'Binance Spot',interval,at:Date.now()};
     }catch(_){}
   }
   // CoinGecko OHLC is independent of Binance. Its own resolution is determined
   // by the requested day range; the UI labels it accordingly.
   const id=assets[asset]?.[2];
   if(id){
     try{
       const raw=await requestJSON('https://api.coingecko.com/api/v3/coins/'+encodeURIComponent(id)+'/ohlc?vs_currency=usd&days=7',11000);
       const result=validatedOHLC((Array.isArray(raw)?raw:[]).map(r=>({t:Number(r[0]),o:Number(r[1]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4]),v:0})));
       if(result.length>=2)return {data:result,source:'CoinGecko OHLC',interval:'risoluzione API',at:Date.now()};
     }catch(_){}
   }
   // On-chain OHLC for tokens whose exact Solana mint is known.
   const mint=DEX_MINTS[asset];
   if(mint){
     try{
       const pools=await requestJSON('https://api.geckoterminal.com/api/v2/networks/solana/tokens/'+encodeURIComponent(mint)+'/pools',11000);
       const candidates=(Array.isArray(pools?.data)?pools.data:[]).map(pool=>{
         const base=String(pool.relationships?.base_token?.data?.id||'').split('_').slice(1).join('_');
         const quote=String(pool.relationships?.quote_token?.data?.id||'').split('_').slice(1).join('_');
         return {pool,side:base===mint?'base':quote===mint?'quote':null,liquidity:Number(pool.attributes?.reserve_in_usd)||0};
       }).filter(p=>p.side&&p.liquidity>0).sort((a,b)=>b.liquidity-a.liquidity);
       for(const p of candidates.slice(0,2)){
         const address=String(p.pool.attributes?.address||p.pool.id||'').replace(/^solana_/,'');
         if(!address)continue;
         try{
           const url='https://api.geckoterminal.com/api/v2/networks/solana/pools/'+encodeURIComponent(address)+'/ohlcv/hour?aggregate=1&limit=90&currency=usd&token='+p.side;
           const res=await requestJSON(url,11000);
           const raw=res?.data?.attributes?.ohlcv_list;
           const result=validatedOHLC((Array.isArray(raw)?raw:[]).map(r=>({t:Number(r[0])*1000,o:Number(r[1]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4]),v:Number(r[5])||0})));
           if(result.length>=2)return {data:result,source:'GeckoTerminal · Solana',interval:'1h',at:Date.now()};
         }catch(_){}
       }
     }catch(_){}
   }
   throw Error('Nessuna fonte OHLC disponibile');
 }
 // Fully usable workspace Crypto A/B with arbitrary CoinGecko IDs and a shortcut
 // to the complete on-chain-capable A/B comparator already in the dashboard.
 function buildABCard(c,body){
   body.classList.add('v530-ab-body');
   const ui=document.createElement('div');ui.className='v530-ab-controls';
   ui.innerHTML=`<div class="v530-ab-field"><label>Crypto A</label><input class="v530-ab-a" aria-label="Cerca Crypto A" autocomplete="off" placeholder="Nome o ticker"><div class="v530-ab-suggestions" hidden></div></div><div class="v530-ab-field"><label>Crypto B</label><input class="v530-ab-b" aria-label="Cerca Crypto B" autocomplete="off" placeholder="Nome o ticker"><div class="v530-ab-suggestions" hidden></div></div>`;
   body.append(ui);
   const output=document.createElement('div');output.className='v530-ab-results';output.textContent='Recupero dati Crypto A/B…';body.append(output);
   const openFull=document.createElement('button');openFull.type='button';openFull.className='v530-ab-full';openFull.textContent='↗ Apri confronto Crypto A/B completo';
   openFull.addEventListener('click',()=>document.getElementById('v490CompareNav')?.click());body.append(openFull);
   for(const side of ['A','B']){
     const input=ui.querySelector(side==='A'?'.v530-ab-a':'.v530-ab-b');
     input.value=side==='A'?(c.abLabelA||'Bitcoin (BTC)'):(c.abLabelB||'Ethereum (ETH)');
     let timer=null,sequence=0;
     const list=input.nextElementSibling;
     input.addEventListener('input',()=>{
       const term=input.value.trim();sequence++;clearTimeout(timer);
       list.hidden=true;list.replaceChildren();
       if(side==='A'){c.abA='';c.abLabelA=term;}else{c.abB='';c.abLabelB=term;}
       save();renderAB(c,findElement(c.id));
       if(term.length<2)return;
       const token=sequence;
       timer=setTimeout(async()=>{
         const local=Object.values(assets).filter(d=>(d[0]+' '+d[1]+' '+d[2]).toLowerCase().includes(term.toLowerCase())).map(d=>({id:d[2],name:d[0],symbol:d[1]}));
         let remote=[];
         try{const res=await requestJSON('https://api.coingecko.com/api/v3/search?query='+encodeURIComponent(term),9000);remote=(res.coins||[]).slice(0,12);}catch(_){}
         if(sequence!==token || !input.isConnected)return;
         const seen=new Set();const results=[...local,...remote].filter(x=>x?.id&&!seen.has(x.id)&&seen.add(x.id)).slice(0,12);
         list.replaceChildren();
         for(const item of results){
           const btn=document.createElement('button');btn.type='button';btn.className='v530-ab-option';btn.textContent=item.name+' ('+String(item.symbol||'').toUpperCase()+')';
           btn.addEventListener('click',()=>{
             input.value=btn.textContent;
             if(side==='A'){c.abA=item.id;c.abLabelA=input.value;}else{c.abB=item.id;c.abLabelB=input.value;}
             list.hidden=true;save();refreshAllAB(true);renderAB(c,findElement(c.id));
           });list.append(btn);
         }
         list.hidden=results.length===0;
       },350);
     });
     input.addEventListener('blur',()=>setTimeout(()=>{list.hidden=true;},170));
     input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=list.querySelector('button');if(first&&!list.hidden){e.preventDefault();first.click();}}});
   }
   renderAB(c,findElement(c.id));
 }
 function refreshAllAB(force=false){
   if(!visible())return;
   for(const c of cards){
     if(cardKind(c)!=='ab'||!c.abA||!c.abB)continue;
     const key=[c.abA,c.abB].join('|'),cached=abRecords.get(key);
     if(abRequests.has(key)||Date.now()<(abRetryAt.get(key)||0)||(!force&&cached&&Date.now()-cached.at<QUOTE_POLL_MS))continue;
     const work=requestJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent([c.abA,c.abB].join(','))+'&sparkline=false',12000)
       .then(data=>{
         if(!Array.isArray(data))throw Error('Risposta non valida');
         abRecords.set(key,{coins:data,at:Date.now()});
         for(const card of cards)if(cardKind(card)==='ab'&&card.abA+'|'+card.abB===key)renderAB(card,findElement(card.id));
       }).catch(()=>{abRetryAt.set(key,Date.now()+45000);})
       .finally(()=>abRequests.delete(key));abRequests.set(key,work);
   }
 }
 function renderAB(c,el){
   if(!el)return;
   const output=el.querySelector('.v530-ab-results');if(!output)return;
   if(!c.abA||!c.abB){output.textContent='Seleziona entrambe le crypto dall’elenco dei risultati.';return;}
   const record=abRecords.get(c.abA+'|'+c.abB);
   if(!record){output.textContent='Recupero prezzi, supply e capitalizzazione dalle API…';return;}
   const a=record.coins.find(coin=>coin.id===c.abA),b=record.coins.find(coin=>coin.id===c.abB);
   if(!a||!b){output.textContent='Quotazioni non disponibili per entrambe le crypto: riprova o usa il confronto completo.';return;}
   const amountA=Number(a.circulating_supply),marketCapB=Number(b.market_cap);
   if(!(amountA>0)||!(marketCapB>0)){
     output.textContent='Manca la supply circolante A o la capitalizzazione B. Nessuna stima inventata.';return;
   }
   const assetA=Object.keys(assets).find(k=>assets[k][2]===c.abA);
   const assetB=Object.keys(assets).find(k=>assets[k][2]===c.abB);
   const liveA=assetA?quoteMap.get(assetA):null,liveB=assetB?quoteMap.get(assetB):null;
   // Reference market cap B remains from the last API snapshot; do not label it streaming.
   const currentA=liveA?.price||Number(a.current_price),currentB=liveB?.price||Number(b.current_price);
   const projected=marketCapB/amountA,multiple=currentA>0?projected/currentA:null;
   output.replaceChildren();
   const headline=document.createElement('div');headline.className='v530-ab-title';headline.textContent='Prezzo teorico Crypto A';
   const price=document.createElement('strong');price.className='v530-ab-projected';price.textContent='$'+fmt(projected,10);
   const line=document.createElement('div');line.className='v530-ab-quote';
   line.textContent=String(a.symbol||'A').toUpperCase()+' $'+fmt(currentA,8)+'  ↔  '+String(b.symbol||'B').toUpperCase()+' $'+fmt(currentB,8);
   const multipleLabel=document.createElement('div');multipleLabel.className='v530-ab-multiple';multipleLabel.textContent=multiple&&Number.isFinite(multiple)?'×'+fmt(multiple,3)+' sul prezzo di A':'Moltiplicatore non disponibile';
   const source=document.createElement('small');source.className='v530-ab-source';source.textContent='Cap B e supply A: CoinGecko API · '+new Date(record.at).toLocaleTimeString('it-IT')+(liveA?.source==='Binance WebSocket'?' · prezzo A LIVE Binance':' · quotazioni API')+' · scenario, non previsione';
   output.append(headline,price,line,multipleLabel,source);
 }


 // LIVE candle streaming is independent from the periodic OHLC fallback.
 let candleWS=null,candleWSKey='',candleWSRetry=null,candlePaintTimer=null;
 const candlePaintSet=new Set(),bookPaintSet=new Set();
 let bookPaintTimer=null;
 function closeCandleWS(){
   if(candleWSRetry){clearTimeout(candleWSRetry);candleWSRetry=null;}
   const old=candleWS;candleWS=null;candleWSKey='';
   if(old){old.onclose=null;try{old.close();}catch(_){}}
 }
 function syncCandleStream(){
   if(!visible()||typeof WebSocket==='undefined'){closeCandleWS();return;}
   const desired=new Map();
   for(const card of cards){
     if(!['asset','chart','indicators','stats','orderbook'].includes(cardKind(card)))continue;
     const asset=cardAsset(card),symbol=assets[asset][3],interval=cardKind(card)==='asset'?'1h':card.interval;
     if(!symbol)continue;
     if(['asset','chart','indicators'].includes(cardKind(card)))desired.set(symbol.toLowerCase()+'@kline_'+interval,{asset,interval,kind:'kline'});
     desired.set(symbol.toLowerCase()+'@depth20@100ms',{asset,kind:'book'});
   }
   const streams=[...desired.keys()].sort(),signature=streams.join('/');
   if(signature===candleWSKey && candleWS)return;
   closeCandleWS();if(!streams.length)return;
   const url='wss://data-stream.binance.vision/stream?streams='+streams.join('/');
   try{
     const ws=new WebSocket(url);candleWS=ws;candleWSKey=signature;
     ws.onmessage=event=>{
       if(!visible())return;
       let payload;try{payload=JSON.parse(event.data);}catch(_){return;}
       const data=payload?.data||payload,k=data?.k;
       if(data?.lastUpdateId&&Array.isArray(data.bids)&&Array.isArray(data.asks)){
         const streamName=String(payload?.stream||'');const desc=desired.get(streamName);
         if(desc?.kind==='book'){
           const book=bookFromExchange(data);
           if(book){
             bookCache.set(bookKey(desc.asset),{data:book,at:Date.now(),source:'Binance WebSocket Depth 20'});
             bookPaintSet.add(desc.asset);
             if(bookPaintTimer===null)bookPaintTimer=setTimeout(()=>{
               bookPaintTimer=null;const touched=new Set(bookPaintSet);bookPaintSet.clear();
               for(const asset of touched)showBookForAsset(asset);
             },350);
           }
         }return;
       }
       if(!k||data?.e!=='kline')return;
       const desc=desired.get(String(data.s||'').toLowerCase()+'@kline_'+String(k.i||''));
       if(!desc)return;
       const point={t:Number(k.t),o:Number(k.o),h:Number(k.h),l:Number(k.l),c:Number(k.c),v:Number(k.v)};
       if(validatedOHLC([point]).length!==1)return;
       const key='k:'+desc.asset+':'+desc.interval,old=candleCache.get(key);
       // Do not replace a complete historical chart with a single live candle.
       if(!old?.data?.length)return;
       const list=old.data.slice(),idx=list.findIndex(x=>x.t===point.t);
       if(idx>=0)list[idx]=point;
       else if(point.t>list.at(-1).t)list.push(point);
       else return;
       candleCache.set(key,{data:list.slice(-130),source:'Binance WebSocket OHLC',interval:desc.interval,at:Date.now()});
       candlePaintSet.add(desc.asset);
       if(candlePaintTimer===null)candlePaintTimer=setTimeout(()=>{
         candlePaintTimer=null;const touched=new Set(candlePaintSet);candlePaintSet.clear();
         for(const c of cards)if(touched.has(cardAsset(c))&&['asset','chart','indicators'].includes(cardKind(c))){
           const el=findElement(c.id);if(el)renderDetail(c,el);
         }
       },650);
     };
     ws.onerror=()=>{try{ws.close();}catch(_){}};
     ws.onclose=()=>{
       if(candleWS===ws){candleWS=null;candleWSKey='';}
       if(visible()&&!candleWSRetry)candleWSRetry=setTimeout(()=>{candleWSRetry=null;syncCandleStream();},5500);
     };
   }catch(_){candleWS=null;candleWSKey='';}
 }

 function defaultLayout(){
   const width=canvas.clientWidth||innerWidth||800,w=Math.min(268,Math.max(MIN_W,width-25));
   const cols=Math.max(1,Math.floor((width-15)/(w+GUTTER)));
   return ['btc','eth','sol'].map((type,i)=>({type,x:12+(i%cols)*(w+GUTTER),y:12+Math.floor(i/cols)*221,w,h:208}));
 }
 const stored=hasStorage();const initial=Array.isArray(stored)?stored:defaultLayout();
 // Solo i riquadri con MISURE STANDARD V525/V526 vengono rimpiccioliti;
 // non cambiare le dimensioni personalizzate dall'utente.
 const MIGRATION='dashboard-v527-compact-defaults-v1';
 let migrate=false;
 try{migrate=Array.isArray(stored)&&localStorage.getItem(MIGRATION)!=='true';}catch(_){}
 initial.slice(0,35).forEach(item=>{
   if(!item||(!isAsset(item.type)&&!Object.hasOwn(kinds,item.type)))return;
   let w=clamp(num(item.w,268),MIN_W,720),h=clamp(num(item.h,208),MIN_H,650);
   if(migrate&&w===330&&h===245){w=268;h=208;}
   if(migrate&&w===330&&h===310){w=285;h=258;}
   addCard(item.type,{id:String(item.id||'')||undefined,x:clamp(num(item.x,8),0,5000),y:clamp(num(item.y,8),0,8000),w,h,
     note:String(item.note||'').slice(0,10000),asset:item.asset,interval:item.interval,depth:item.depth,chartStyle:'candles',abA:item.abA,abB:item.abB,abLabelA:item.abLabelA,abLabelB:item.abLabelB});
 });
 if(migrate){try{localStorage.setItem(MIGRATION,'true');}catch(_){}}
 if(empty)empty.hidden=cards.length>0;
 document.addEventListener('v525:workspace-visibility',ev=>{
   if(!ev.detail?.visible){restoreMainSettings();togglePicker(false);closeAllSettings(null);disconnectQuoteStream();closeCandleWS();return;}
   requestAnimationFrame(()=>{
     arrangeCards();save();
     refreshValues();refreshHistory(true);refreshDetailCards(true);fetchWorkspaceQuotes(true);connectQuoteStream();syncCandleStream();refreshAllAB(true);
   });
 });
 const resize=new ResizeObserver(()=>{if(active)return;arrangeCards();});resize.observe(canvas);
 canvas.style.overflowY='auto';
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshValues();refreshHistory(false);refreshDetailCards();fetchWorkspaceQuotes(false);connectQuoteStream();refreshAllAB(false);}else{disconnectQuoteStream();closeCandleWS();}});
 setInterval(()=>{if(document.hidden)return;refreshValues();refreshHistory(false);refreshDetailCards();fetchWorkspaceQuotes(false);refreshAllAB(false);if(visible()){connectQuoteStream();syncCandleStream();}},2600);
 window.__v525Workspace={getCards:()=>cards.map(c=>({...c})),add:type=>addCard(type)};
})();
