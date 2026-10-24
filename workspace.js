/* V527 — Workspace: resize from card toolbar, responsive collision-free placement. */
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
  ore:['ORE Protocol','ORE','',''],tai:['TARS AI','TAI','',''],
  virtual:['Virtuals Protocol','VIRTUAL','virtual-protocol','VIRTUALUSDT'],
  wld:['Worldcoin','WLD','worldcoin-wld','WLDUSDT'],
  orai:['Oraichain','ORAI','oraichain-token',''],
  tao:['Bittensor','TAO','bittensor','TAOUSDT'],
  lunc:['Terra Luna Classic','LUNC','terra-luna-classic','LUNCUSDT'],
  luna:['Terra','LUNA','terra-luna-2','LUNAUSDT']
 };
 const kinds={asset:'Riepilogo crypto',chart:'Grafico prezzi',orderbook:'Order Book',indicators:'Indicatori tecnici',stats:'Dati di mercato',notes:'Note personali',clock:'Orologio live'};
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
 const candleCache=new Map(),bookCache=new Map(),inflight=new Map();
 let cards=[],counter=0,active=null,networkAt=0,lastCacheAt=0,snapEnabled=true;
 const GUTTER=13, MIN_W=180, MIN_H=145;
 const PRESETS={compact:[210,174],medium:[285,222],large:[440,345]};
 try{snapEnabled=localStorage.getItem(SNAP_STORAGE)!=='false';}catch(_){}
 const snap=v=>snapEnabled?Math.round(v/11)*11:v;
 function save(){
   try{localStorage.setItem(STORAGE,JSON.stringify(cards.map(({id,type,asset,interval,depth,chartStyle,x,y,w,h,note})=>({id,type,asset,interval,depth,chartStyle,x,y,w,h,note}))));}catch(_){}
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
     <label class="v526-asset-field" ${['clock','notes'].includes(kind)?'hidden':''}>Criptovaluta
       <select class="v526-set-asset" aria-label="Criptovaluta della card">${options(Object.entries(assets).map(([id,data])=>[id,data[0]+' · '+data[1]]),asset)}</select>
     </label>
     <label class="v526-interval-field" ${!['chart','indicators'].includes(kind)?'hidden':''}>Intervallo grafico
       <select class="v526-set-interval" aria-label="Intervallo grafico">${options(intervals.map(i=>[i,i]),c.interval)}</select>
     </label>
     <label class="v526-chart-style-field" ${kind!=='chart'?'hidden':''}>Visualizzazione
       <select class="v526-set-chart-style" aria-label="Stile del grafico">${options([['candles','Candele OHLC'],['line','Linea prezzi']],c.chartStyle)}</select>
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
   const bh=type==='chart'?258:208;
   const base={id:'w'+Date.now().toString(36)+'-'+(++counter),type,asset:isAsset(type)?type:'btc',interval:'1h',depth:10,chartStyle:'candles',
     x:12+(idx%cols)*(bw+GUTTER),y:12+Math.floor(idx/cols)*(bh+GUTTER),w:bw,h:bh,note:''};
   const c={...base,...initial,type};
   if(!c.id||cards.some(old=>old.id===c.id))c.id=base.id;
   if(!isAsset(c.asset))c.asset=isAsset(type)?type:'btc';
   if(!intervals.includes(c.interval))c.interval='1h';
   if(![5,10,20].includes(Number(c.depth)))c.depth=10;
   if(!['candles','line'].includes(c.chartStyle))c.chartStyle='candles';
   cards.push(c);mount(c);arrangeCards(c.id);if(empty)empty.hidden=true;save();refreshValues();return c;
 }
 function removeCard(id){
   if(connectedCard?.cardId===id)restoreMainSettings();
   cards=cards.filter(c=>c.id!==id);findElement(id)?.remove();chartSignatures.delete(id);
   if(empty)empty.hidden=cards.length>0;arrangeCards();save();status('Card rimossa. Layout salvato.');
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
     c.asset=assetInput.value;c.interval=intervalInput.value;c.chartStyle=styleInput.value;c.depth=Number(depthInput.value);
     settings.querySelector('.v526-asset-field').hidden=['clock','notes'].includes(selected);
     settings.querySelector('.v526-interval-field').hidden=!['chart','indicators'].includes(selected);
     settings.querySelector('.v526-chart-style-field').hidden=selected!=='chart';
     settings.querySelector('.v526-depth-field').hidden=selected!=='orderbook';
     el.querySelector('.v525-card-title').textContent=cardTitle(c);
     chartSignatures.delete(c.id);renderBody(c,el);save();refreshValues();refreshHistory(true);refreshDetailCards(true);
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
   if(kind==='asset'){
     const quote=document.createElement('div');quote.className='v525-asset-quote';quote.innerHTML='<strong class="v525-asset-price">—</strong><span class="v525-asset-change">—</span>';body.appendChild(quote);
     const chart=document.createElement('div');chart.className='v525-workspace-chart';chart.innerHTML='<div class="v525-graph-wait">Caricamento storico reale…</div>';body.appendChild(chart);
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
   const c=addCard(choose.value);if(c){status('Card aggiunta. Personalizzala con ⚙ accanto alla X.');togglePicker(false);refreshHistory(true);refreshDetailCards(true);}
 });
 function priceDOM(t,s){return $(t+'-'+s)?.textContent?.trim()||'—';}
 function marketCache(){
   let list=[];try{list=JSON.parse(localStorage.getItem('dashboard_market_v480_top200_v1')||'{}')?.coins||[];}catch(_){}
   for(const coin of list){
     const matched=Object.keys(assets).find(k=>assets[k][2]===coin?.id&&assets[k][2]);if(!matched)continue;
     marketMeta.set(matched,coin);
     if(Array.isArray(coin.sparkline_in_7d?.price)&&coin.sparkline_in_7d.price.length>=2)
       chartData.set(matched,{values:coin.sparkline_in_7d.price,origin:'Storico Top 200'});
   }
 }
 function spark(values){
   const clean=values.map(Number).filter(v=>Number.isFinite(v)&&v>0).slice(-168);
   if(clean.length<2)return null;
   const lo=Math.min(...clean),hi=Math.max(...clean),r=Math.max(hi-lo,hi*1e-5,1e-10);
   const color=clean.at(-1)>clean[0]?'#16c784':clean.at(-1)<clean[0]?'#ef596b':'#8da5c3';
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 120 40');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','v525-mini-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','Grafico di '+clean.length+' quotazioni reali');
   const poly=document.createElementNS(svg.namespaceURI,'polyline');poly.setAttribute('points',clean.map((v,i)=>`${(2+116*i/(clean.length-1)).toFixed(2)},${(35-30*(v-lo)/r).toFixed(2)}`).join(' '));poly.setAttribute('fill','none');poly.setAttribute('stroke',color);poly.setAttribute('stroke-width','2.4');poly.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(poly);return svg;
 }
 function updateSmallChart(c,el){
   const holder=el.querySelector('.v525-workspace-chart');if(!holder)return;
   const asset=cardAsset(c),d=chartData.get(asset),vals=d?.values||[];
   const signature='small:'+asset+':'+vals.length+':'+(vals.at(-1)||0);
   if(chartSignatures.get(c.id)===signature)return;chartSignatures.set(c.id,signature);
   const svg=spark(vals);
   if(svg){svg.setAttribute('title',(d.origin||'Storico reale')+' · '+vals.length+' punti');holder.replaceChildren(svg);}
   else holder.textContent='Storico reale non ancora disponibile';
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
   host.replaceChildren(...entries.map(([label,value])=>{const box=document.createElement('div');box.className='v526-stat';const text=document.createElement('span');text.textContent=label;const strong=document.createElement('strong');strong.textContent=value;box.append(text,strong);return box;}));
   el.querySelector('.v526-source').textContent='Dati dashboard + CoinGecko, quando disponibili';
 }
 function refreshValues(){
   if(!visible())return;const now=new Date();
   for(const c of cards){
     const el=findElement(c.id);if(!el)continue;const kind=cardKind(c),asset=cardAsset(c);
     if(kind==='asset'){
       const price=el.querySelector('.v525-asset-price'),change=el.querySelector('.v525-asset-change'),coin=marketMeta.get(asset);
       const live=priceDOM(asset,'price');const p=live!=='—'?live:coin?.current_price?'$'+fmt(coin.current_price,8):'—';if(price&&price.textContent!==p)price.textContent=p;
       const domChange=priceDOM(asset,'change');const ch=domChange!=='—'?domChange:Number.isFinite(Number(coin?.price_change_percentage_24h))?num(coin.price_change_percentage_24h,0).toFixed(2)+'%':'—';
       if(change){change.textContent=ch;change.className='v525-asset-change'+(ch.includes('-')?' down':ch.includes('+')?' up':'');}
       for(const field of ['high','low']){const label=el.querySelector(`[data-field="${field}"]`);if(label)label.textContent=priceDOM(asset,field);}
       const dom=el.querySelector('[data-field="dominance"]');if(dom)dom.textContent=priceDOM(asset,'card-dominance');updateSmallChart(c,el);
     }else if(kind==='stats')statsRows(c,el);
     else if(kind==='clock'){
       const time=el.querySelector('.v525-clock-big'),date=el.querySelector('.v525-clock-date');
       if(time)time.textContent=now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
       if(date)date.textContent=now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
     }
   }
 }
 function refreshHistory(force){
   if(!visible())return;const now=Date.now();
   if(force||now-lastCacheAt>60000){marketCache();lastCacheAt=now;}
   const needed=[...new Set(cards.map(cardAsset))].filter(k=>assets[k]?.[2]&&!chartData.has(k));
   if(!needed.length||now-networkAt<90000)return;networkAt=now;
   const ids=needed.map(k=>assets[k][2]).join(',');
   requestJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent(ids)+'&sparkline=true',14000)
   .then(list=>{
     if(!Array.isArray(list))return;
     for(const coin of list){const key=needed.find(k=>assets[k][2]===coin.id);if(!key)continue;
       marketMeta.set(key,coin);const series=coin.sparkline_in_7d?.price;
       if(Array.isArray(series)&&series.length>=2)chartData.set(key,{values:series,origin:'CoinGecko 7g'});
     }refreshValues();
   }).catch(()=>{});
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
   const key=cardAsset(c),symbol=assets[key][3],cacheKey='k:'+symbol+':'+c.interval;
   const record=candleCache.get(cacheKey);
   let signature='';
   if(record?.data){
     signature=candleCache.get(cacheKey).at+':'+c.chartStyle;
     if(chartSignatures.get(c.id)!==signature){area.replaceChildren(candleSvg(record.data,c.chartStyle));chartSignatures.set(c.id,signature);}
     footer.textContent='Binance Spot · '+c.interval+' · aggiornato '+new Date(record.at).toLocaleTimeString('it-IT');
   }else{
     // CoinGecko fallback is an authentic price-line, NOT fabricated OHLC candles.
     const fallback=chartData.get(key);
     if(fallback?.values?.length>=2){const svg=spark(fallback.values);if(svg){area.replaceChildren(svg);footer.textContent=(fallback.origin||'CoinGecko')+' · storico reale · OHLC non disponibile';}}
     else{area.textContent=!symbol?'Coppia Spot non verificata per '+assets[key][1]:errors.has(cacheKey)?'Storico OHLC temporaneamente non disponibile':'Caricamento storico dal mercato…';footer.textContent=symbol?'Binance Spot · solo dati autentici':'Usa un asset disponibile su Binance oppure il grafico della Dashboard';}
   }
 }
 function technicalDisplay(c,el){
    const host=el.querySelector('.v526-indicators-grid'),source=el.querySelector('.v526-source');if(!host)return;
    const asset=cardAsset(c),symbol=assets[asset][3],record=candleCache.get('k:'+symbol+':'+c.interval);
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
    source.textContent='Calcolati su '+record.data.length+' candele '+c.interval+' · Binance Spot · '+new Date(record.at).toLocaleTimeString('it-IT');
 }
 function bookFromExchange(raw){
   if(!Array.isArray(raw?.bids)||!Array.isArray(raw?.asks))return null;
   const clean=a=>a.map(v=>[Number(v[0]),Number(v[1])]).filter(v=>v[0]>0&&v[1]>0&&v.every(Number.isFinite));
   const bids=clean(raw.bids).sort((a,b)=>b[0]-a[0]),asks=clean(raw.asks).sort((a,b)=>a[0]-b[0]);
   return bids.length&&asks.length?{bids,asks}:null;
 }
 function orderBookDisplay(c,el){
   const book=el.querySelector('.v526-orderbook'),spread=el.querySelector('.v526-spread'),footer=el.querySelector('.v526-source');if(!book||!spread)return;
   const asset=cardAsset(c),symbol=assets[asset][3],cacheKey=asset==='orai'?'g:ORAI_USDT':'d:'+symbol;
   const record=bookCache.get(cacheKey);
   if(!record?.data){book.textContent=(!symbol&&asset!=='orai')?'Order Book non disponibile per questa coppia Spot.':errors.has(cacheKey)?'Book momentaneamente non disponibile dalla fonte dati.':'In attesa dei livelli bid/ask reali.';spread.textContent='Order Book · '+assets[asset][1]+'/USDT';footer.textContent=(!symbol&&asset!=='orai')?'La dashboard principale può usare una fonte diversa. Nessun dato inventato.':'Dati bid/ask reali, aggiornati automaticamente se accessibili';return;}
   const bids=record.data.bids.slice(0,c.depth),asks=record.data.asks.slice(0,c.depth);
   const bid=bids[0]?.[0],ask=asks[0]?.[0];const delta=ask-bid;
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
   footer.textContent=(asset==='orai'?'Gate.io Spot':'Binance Spot')+' · '+new Date(record.at).toLocaleTimeString('it-IT')+' · '+c.depth+' livelli per lato';
 }
 function renderDetail(c,el){const kind=cardKind(c);if(kind==='chart')chartDisplay(c,el);else if(kind==='indicators')technicalDisplay(c,el);else if(kind==='orderbook')orderBookDisplay(c,el);}
 const errors=new Map();
 function refreshDetailCards(force=false){
   if(!visible())return;
   const current=Date.now();
   // Deduplicate identical market requests across cards. Requests only while Workspace is visible.
   const chartRequests=new Map(),bookRequests=new Map();
   for(const c of cards){
     const asset=cardAsset(c),symbol=assets[asset][3];
     if(['chart','indicators'].includes(cardKind(c)))chartRequests.set('k:'+symbol+':'+c.interval,{asset,symbol,interval:c.interval});
     if(cardKind(c)==='orderbook')bookRequests.set(asset==='orai'?'g:ORAI_USDT':'d:'+symbol,{asset,symbol});
   }
   for(const [cacheKey,req] of chartRequests){
     const entries=candleCache.get(cacheKey);const delay=['1m','5m','15m'].includes(req.interval)?25000:65000;
     if(!req.symbol){continue;}
     if(!force&&entries&&current-entries.at<delay)continue;
     if(inflight.has(cacheKey)||current-(errors.get(cacheKey)||0)<40000)continue;
     const url='https://data-api.binance.vision/api/v3/klines?symbol='+encodeURIComponent(req.symbol)+'&interval='+req.interval+'&limit=90';
     cachedFetch(candleCache,cacheKey,url,candleFromBinance,delay).then(()=>{
       for(const c of cards)if(['chart','indicators'].includes(cardKind(c))&&cardAsset(c)===req.asset&&c.interval===req.interval){const el=findElement(c.id);if(el)renderDetail(c,el);}
     }).catch(()=>{errors.set(cacheKey,Date.now());for(const c of cards){const el=findElement(c.id);if(el)renderDetail(c,el);}});
   }
   for(const [cacheKey,req] of bookRequests){
     const entries=bookCache.get(cacheKey);
     if(!req.symbol&&req.asset!=='orai')continue;
     if(!force&&entries&&current-entries.at<12000)continue;
     if(inflight.has(cacheKey)||current-(errors.get(cacheKey)||0)<40000)continue;
     const url=req.asset==='orai'?'https://api.gateio.ws/api/v4/spot/order_book?currency_pair=ORAI_USDT&limit=20'
        :'https://data-api.binance.vision/api/v3/depth?symbol='+encodeURIComponent(req.symbol)+'&limit=100';
     cachedFetch(bookCache,cacheKey,url,bookFromExchange,12000).then(()=>{
       for(const c of cards)if(cardKind(c)==='orderbook'&&cardAsset(c)===req.asset){const el=findElement(c.id);if(el)orderBookDisplay(c,el);}
     }).catch(()=>{errors.set(cacheKey,Date.now());for(const c of cards){const el=findElement(c.id);if(el)renderDetail(c,el);}});
   }
   for(const c of cards){const el=findElement(c.id);if(el)renderDetail(c,el);}
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
     note:String(item.note||'').slice(0,10000),asset:item.asset,interval:item.interval,depth:item.depth,chartStyle:item.chartStyle});
 });
 if(migrate){try{localStorage.setItem(MIGRATION,'true');}catch(_){}}
 if(empty)empty.hidden=cards.length>0;
 document.addEventListener('v525:workspace-visibility',ev=>{
   if(!ev.detail?.visible){restoreMainSettings();togglePicker(false);closeAllSettings(null);return;}
   requestAnimationFrame(()=>{
     arrangeCards();save();
     refreshValues();refreshHistory(true);refreshDetailCards(true);
   });
 });
 const resize=new ResizeObserver(()=>{if(active)return;arrangeCards();});resize.observe(canvas);
 canvas.style.overflowY='auto';
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshValues();refreshHistory(false);refreshDetailCards();}});
 setInterval(()=>{if(document.hidden)return;refreshValues();refreshHistory(false);refreshDetailCards();},2600);
 window.__v525Workspace={getCards:()=>cards.map(c=>({...c})),add:type=>addCard(type)};
})();
