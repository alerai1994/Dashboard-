/* V525 - Workspace indipendente, con dati reali dalla dashboard e layout persistente. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const panel=$('v525WorkspacePanel'), canvas=$('v525WorkspaceCanvas'),
   gear=$('v525WorkspaceGear'), setting=$('v525WorkspaceSettings'),
   add=$('v525WorkspaceAdd'), choose=$('v525CardType'),
   confirm=$('v525ConfirmAdd'), dismiss=$('v525WorkspaceSettingsClose'),
   reset=$('v525WorkspaceReset'), snap=$('v525WorkspaceSnap'),
   empty=$('v525WorkspaceEmpty'), msg=$('v525WorkspaceStatus');
 if(!panel||!canvas||!gear||!setting||!add||!choose||!confirm)return;
 const STORAGE='dashboard-v525-workspace-layout-v1';
 const SNAP_STORAGE='dashboard-v525-workspace-snap-v1';
 const assets={
  btc:['Bitcoin','BTC','bitcoin'],eth:['Ethereum','ETH','ethereum'],bnb:['BNB','BNB','binancecoin'],
  sol:['Solana','SOL','solana'],ray:['Raydium','RAY','raydium'],inj:['Injective','INJ','injective-protocol'],
  ore:['ORE Protocol','ORE',''],tai:['TARS AI','TAI',''],virtual:['Virtuals','VIRTUAL','virtual-protocol'],
  wld:['Worldcoin','WLD','worldcoin-wld'],orai:['Oraichain','ORAI','oraichain-token'],
  tao:['Bittensor','TAO','bittensor'],lunc:['Terra Luna Classic','LUNC','terra-luna-classic'],luna:['Terra','LUNA','terra-luna-2']
 };
 const isAsset=t=>Object.prototype.hasOwnProperty.call(assets,t);
 let cards=[], counter=0, active=null, networkAt=0, lastCacheAt=0;
 const chartData=new Map(), marketMeta=new Map(), chartSignatures=new Map();
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const num=(n,d)=>Number.isFinite(Number(n))?Number(n):d;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(cards.map(({id,type,x,y,w,h,note})=>({id,type,x,y,w,h,note}))));}catch(_){}};
 const stored=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'null');}catch(_){return null;}};
 try{snap.checked=localStorage.getItem(SNAP_STORAGE)!=='false';}catch(_){}
 const grid=v=>snap.checked?Math.round(v/11)*11:v;
 function cardGeometry(card){
   // The layout is always responsive; stored desktop coordinates are preserved.
   const viewport=canvas.clientWidth||window.innerWidth||800;
   const available=Math.max(180,viewport-12);
   const w=clamp(num(card.w,320),180,Math.min(720,available));
   const h=clamp(num(card.h,235),145,650);
   const x=clamp(num(card.x,12),0,Math.max(0,viewport-w));
   const y=Math.max(0,num(card.y,12));
   return {x,y,w,h};
 }
 function applyGeometry(card,element){
   const {x,y,w,h}=cardGeometry(card);
   element.style.transform=`translate3d(${x}px,${y}px,0)`;
   element.style.width=w+'px';element.style.height=h+'px';
 }
 function updateCanvasExtent(){
   // Positioned children contribute to scrolling overflow in supported browsers.
   canvas.style.overflowY='auto';
 }
 function showStatus(s){if(msg)msg.textContent=s;}
 function setOpen(value){
   setting.hidden=!value;
   gear.setAttribute('aria-expanded',String(value));
   add.setAttribute('aria-expanded',String(value));
   if(value)choose.focus({preventScroll:true});
 }
 gear.addEventListener('click',()=>setOpen(setting.hidden));
 add.addEventListener('click',()=>setOpen(setting.hidden));
 dismiss.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&!setting.hidden){e.stopImmediatePropagation();setOpen(false);gear.focus({preventScroll:true});}
 },true);
 snap.addEventListener('change',()=>{
   try{localStorage.setItem(SNAP_STORAGE,String(snap.checked));}catch(_){}
   showStatus(snap.checked?'Allineamento griglia attivo.':'Posizionamento libero attivo.');
 });
 function addCard(type,initial){
   if(!isAsset(type)&&type!=='clock'&&type!=='notes')return;
   const index=cards.length;
   const viewWidth=canvas.clientWidth||window.innerWidth||800;
   const basicWidth=Math.min(330,Math.max(180,viewWidth-25));
   const columns=Math.max(1,Math.floor((viewWidth-14)/(basicWidth+14)));
   const basic={id:'w'+Date.now().toString(36)+'-'+(++counter),type,
     x:12+(index%columns)*(basicWidth+14),y:12+Math.floor(index/columns)*248,
     w:basicWidth,h:type==='notes'?230:225,note:''};
   const card={...basic,...initial,type};
   if(!card.id || cards.some(existing=>existing.id===card.id))card.id=basic.id;
   cards.push(card);
   mount(card);
   if(empty)empty.hidden=true;
   save();refreshValues();
   return card;
 }
 function removeCard(id){
   cards=cards.filter(c=>c.id!==id);
   const el=Array.from(canvas.querySelectorAll('.v525-widget')).find(node=>node.dataset.cardId===id);
   if(el)el.remove();
   chartSignatures.delete(id);
   if(empty)empty.hidden=cards.length>0;
   save();showStatus('Card rimossa. Disposizione salvata.');
 }
 function iconFromDashboard(type,body){
   const image=document.querySelector('#'+type+'-market .asset-logo img');
   if(image){
     const src=image.currentSrc||image.getAttribute('src');
     if(src){const img=document.createElement('img');img.alt='';img.width=30;img.height=30;img.decoding='async';img.style.cssText='border-radius:50%;object-fit:contain;flex:0 0 30px';img.src=src;body.appendChild(img);return;}
   }
   const fallback=document.createElement('b');fallback.textContent=assets[type][1].slice(0,2);fallback.style.cssText='font-size:14px;color:#7ebaff';body.appendChild(fallback);
 }
 function mount(card){
   const el=document.createElement('article');
   el.className='v525-widget';el.dataset.cardId=card.id;
   const title=isAsset(card.type)?assets[card.type][0]:card.type==='clock'?'Orologio live':'Note personali';
   el.setAttribute('aria-label','Card '+title+' spostabile e ridimensionabile');
   el.innerHTML=`<div class="v525-card-head" tabindex="0" role="button" aria-label="Trascina ${escapeText(title)}. Frecce sulla tastiera per spostare la card.">
      <span class="v525-drag-dots" aria-hidden="true">⠿</span><span class="v525-card-title">${escapeText(title)}</span>
      <button class="v525-card-close" type="button" aria-label="Rimuovi card ${escapeText(title)}" title="Rimuovi card">✕</button>
     </div><div class="v525-card-body"></div><span class="v525-resize-handle" role="slider" tabindex="0" aria-label="Ridimensiona card ${escapeText(title)} con le frecce" aria-valuemin="180" aria-valuemax="720"></span>`;
   const head=el.querySelector('.v525-card-head'), close=el.querySelector('.v525-card-close');
   const body=el.querySelector('.v525-card-body');
   const handle=el.querySelector('.v525-resize-handle');
   if(isAsset(card.type)){
     const branding=document.createElement('div');branding.style.cssText='display:flex;align-items:center;gap:9px';
     iconFromDashboard(card.type,branding);
     const subtitle=document.createElement('span');subtitle.style.cssText='font-size:12px;font-weight:800;letter-spacing:.025em';subtitle.textContent=assets[card.type][1]+' / USD';branding.appendChild(subtitle);body.appendChild(branding);
     const quote=document.createElement('div');quote.className='v525-asset-quote';
     quote.innerHTML='<strong class="v525-asset-price">—</strong><span class="v525-asset-change">—</span>';body.appendChild(quote);
     const chart=document.createElement('div');chart.className='v525-workspace-chart';chart.style.cssText='flex:1;min-height:60px;display:flex;align-items:stretch';
     chart.innerHTML='<div class="v525-graph-wait">Storico reale in caricamento…</div>';
     body.appendChild(chart);
     const footer=document.createElement('div');footer.className='v525-asset-footer';
     footer.innerHTML='<span>24h ↑ <b data-field="high">—</b></span><span>24h ↓ <b data-field="low">—</b></span><span>DOM <b data-field="dominance">—</b></span>';
     body.appendChild(footer);
   }else if(card.type==='clock'){
     body.innerHTML='<strong class="v525-clock-big">--:--:--</strong><span class="v525-clock-date">—</span>';
   }else{
     const textarea=document.createElement('textarea');textarea.className='v525-notes-input';textarea.placeholder='Scrivi qui i tuoi appunti…';
     textarea.setAttribute('aria-label','Note del Workspace');textarea.value=card.note||'';
     textarea.addEventListener('input',()=>{card.note=textarea.value;save();});
     body.appendChild(textarea);
   }
   close.addEventListener('pointerdown',e=>e.stopPropagation());
   close.addEventListener('click',()=>removeCard(card.id));
   head.addEventListener('pointerdown',e=>beginDrag(e,card,el,'move'));
   handle.addEventListener('pointerdown',e=>beginDrag(e,card,el,'resize'));
   head.addEventListener('keydown',e=>keyboardGeometry(e,card,el,'move'));
   handle.addEventListener('keydown',e=>keyboardGeometry(e,card,el,'resize'));
   canvas.appendChild(el);applyGeometry(card,el);
 }
 function keyboardGeometry(e,card,el,mode){
   const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
   if(!arrows[e.key])return;
   e.preventDefault();const [dx,dy]=arrows[e.key],step=e.shiftKey?33:11;
   const current=cardGeometry(card);
   if(mode==='move'){
     card.x=clamp(current.x+dx*step,0,Math.max(0,canvas.clientWidth-current.w));
     card.y=Math.max(0,current.y+dy*step);
   }else{
     card.w=clamp(current.w+dx*step,180,Math.max(180,canvas.clientWidth-current.x));
     card.h=clamp(current.h+dy*step,145,650);
   }
   applyGeometry(card,el);save();
 }
 function beginDrag(event,card,el,mode){
   if(event.button!==0 || event.target.closest('button,textarea,input,select'))return;
   event.preventDefault();event.stopPropagation();
   if(active)return;
   const target=event.currentTarget;
   const start=cardGeometry(card);
   active={card,el,target,mode,start,pX:event.clientX,pY:event.clientY,id:event.pointerId};
   el.classList.add('is-moving');
   target.setPointerCapture?.(event.pointerId);
   target.addEventListener('pointermove',onMove);
   target.addEventListener('pointerup',onFinish);
   target.addEventListener('pointercancel',onFinish);
 }
 function onMove(event){
   if(!active || event.pointerId!==active.id)return;
   const {card,el,mode,start,pX,pY}=active;
   const dx=event.clientX-pX,dy=event.clientY-pY;
   if(mode==='move'){
     card.x=clamp(grid(start.x+dx),0,Math.max(0,canvas.clientWidth-start.w));
     card.y=Math.max(0,grid(start.y+dy));
   }else{
     card.w=clamp(grid(start.w+dx),180,Math.max(180,canvas.clientWidth-start.x));
     card.h=clamp(grid(start.h+dy),145,650);
   }
   applyGeometry(card,el);
 }
 function onFinish(event){
   if(!active || event.pointerId!==active.id)return;
   const {target,el}=active;
   try{target.releasePointerCapture?.(event.pointerId);}catch(_){}
   target.removeEventListener('pointermove',onMove);target.removeEventListener('pointerup',onFinish);target.removeEventListener('pointercancel',onFinish);
   el.classList.remove('is-moving');active=null;save();showStatus('Posizione e dimensioni salvate automaticamente.');
 }
 confirm.addEventListener('click',()=>{
   if(cards.length>=35){showStatus('Limite di 35 card per mantenere il Workspace reattivo.');return;}
   const card=addCard(choose.value);
   if(card){showStatus('Card '+(assets[card.type]?.[0]||card.type)+' aggiunta e salvata.');setOpen(false);refreshHistory(true);}
 });
 reset.addEventListener('click',()=>{
   cards=[];canvas.replaceChildren(empty);chartSignatures.clear();
   defaultLayout().forEach(item=>addCard(item.type,item));
   showStatus('Disposizione iniziale ripristinata.');setOpen(false);refreshHistory(true);
 });
 function priceFromDOM(type,suffix){return $(''+type+'-'+suffix)?.textContent?.trim()||'—';}
 function lookupCachedMarket(){
   let coins=[];
   try{coins=JSON.parse(localStorage.getItem('dashboard_market_v480_top200_v1')||'{}')?.coins||[];}catch(_){}
   for(const coin of coins){
     if(!coin||!coin.symbol)continue;
     const symbol=String(coin.symbol).toUpperCase();
     const expected=Object.keys(assets).find(k=>assets[k][1]===symbol&&(coin.id===assets[k][2]||!assets[k][2]));
     if(!expected)continue;
     marketMeta.set(expected,coin);
     const values=coin.sparkline_in_7d?.price;
     if(Array.isArray(values)&&values.filter(v=>num(v,0)>0).length>=2)chartData.set(expected,{values,origin:'Storico Top 200'});
   }
 }
 function svgSpark(values){
   const clean=values.map(Number).filter(v=>Number.isFinite(v)&&v>0).slice(-168);
   if(clean.length<2)return null;
   const lo=Math.min(...clean),hi=Math.max(...clean),range=Math.max(hi-lo,hi*1e-5,1e-10);
   const color=clean.at(-1)>clean[0]?'#16c784':clean.at(-1)<clean[0]?'#ef596b':'#8da5c3';
   const points=clean.map((v,i)=>`${(2+116*i/(clean.length-1)).toFixed(2)},${(35-30*(v-lo)/range).toFixed(2)}`).join(' ');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 120 40');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','v525-mini-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','Mini grafico basato su '+clean.length+' quotazioni reali');
   const poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');poly.setAttribute('points',points);poly.setAttribute('fill','none');poly.setAttribute('stroke',color);poly.setAttribute('stroke-width','2.4');poly.setAttribute('stroke-linecap','round');poly.setAttribute('stroke-linejoin','round');poly.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(poly);return svg;
 }
 function updateChart(card,element){
   const holder=element.querySelector('.v525-workspace-chart');if(!holder)return;
   const data=chartData.get(card.type),values=data?.values||[];
   const signature=card.type+':'+values.length+':'+(values.at(-1)||0);
   if(chartSignatures.get(card.id)===signature)return;
   chartSignatures.set(card.id,signature);
   const svg=svgSpark(values);
   if(svg){svg.setAttribute('title',(data.origin||'Storico reale')+' · '+values.length+' rilevazioni');holder.replaceChildren(svg);}
   else{const wait=document.createElement('div');wait.className='v525-graph-wait';wait.textContent='Storico non ancora disponibile';holder.replaceChildren(wait);}
 }
 function refreshValues(){
   if(panel.hidden || !document.body.classList.contains('v442-market-open'))return;
   const now=new Date();
   for(const card of cards){
     const el=Array.from(canvas.querySelectorAll('.v525-widget')).find(x=>x.dataset.cardId===card.id);
     if(!el)continue;
     if(isAsset(card.type)){
       const quote=el.querySelector('.v525-asset-price'),change=el.querySelector('.v525-asset-change');
       const meta=marketMeta.get(card.type);
       const domPrice=priceFromDOM(card.type,'price');
       const p=(domPrice&&domPrice!=='—')?domPrice:(Number.isFinite(Number(meta?.current_price))?('$'+Number(meta.current_price).toLocaleString('en-US',{maximumSignificantDigits:8})):'—');
       if(quote&&quote.textContent!==p)quote.textContent=p;
       const domChange=priceFromDOM(card.type,'change');
       const ch=(domChange&&domChange!=='—')?domChange:(Number.isFinite(Number(meta?.price_change_percentage_24h))?Number(meta.price_change_percentage_24h).toFixed(2)+'%':'—');
       if(change){change.textContent=ch;change.className='v525-asset-change'+(ch.includes('-')?' down':ch.includes('+')?' up':'');}
       for(const field of ['high','low']){const label=el.querySelector('[data-field="'+field+'"]');if(label)label.textContent=priceFromDOM(card.type,field);}
       const dominance=el.querySelector('[data-field="dominance"]');if(dominance)dominance.textContent=priceFromDOM(card.type,'card-dominance');
       updateChart(card,el);
     }else if(card.type==='clock'){
       const time=el.querySelector('.v525-clock-big'),date=el.querySelector('.v525-clock-date');
       if(time)time.textContent=now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
       if(date)date.textContent=now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
     }
   }
 }
 function refreshHistory(force){
   if(panel.hidden||!document.body.classList.contains('v442-market-open'))return;
   const now=Date.now();
   if(force||now-lastCacheAt>60000){lookupCachedMarket();lastCacheAt=now;}
   const keys=[...new Set(cards.map(c=>c.type).filter(isAsset))];
   const missing=keys.filter(k=>!chartData.has(k)&&assets[k][2]);
   if(!missing.length||now-networkAt<90000)return;
   networkAt=now;
   const ids=missing.map(k=>assets[k][2]).join(',');
   const ctl=new AbortController();const timeout=setTimeout(()=>ctl.abort(),14000);
   fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent(ids)+'&sparkline=true',{signal:ctl.signal,mode:'cors'})
    .then(res=>{if(!res.ok)throw new Error('API '+res.status);return res.json();})
    .then(data=>{
      if(!Array.isArray(data))return;
      for(const coin of data){
        const id=String(coin.id||'');const type=missing.find(k=>assets[k][2]===id);
        if(!type)continue;
        marketMeta.set(type,coin);
        const values=coin.sparkline_in_7d?.price;
        if(Array.isArray(values)&&values.filter(x=>num(x,0)>0).length>=2)chartData.set(type,{values,origin:'CoinGecko 7 giorni'});
      }
      refreshValues();
    }).catch(()=>{/* keep real-data-only placeholders when upstream is unavailable */})
    .finally(()=>clearTimeout(timeout));
 }
 const defaultLayout=()=>{
   const width=canvas.clientWidth||window.innerWidth||800;
   const w=Math.min(330,Math.max(180,width-25));
   const cols=Math.max(1,Math.floor((width-15)/(w+15)));
   return ['btc','eth','sol'].map((type,i)=>({type,x:12+(i%cols)*(w+14),y:12+Math.floor(i/cols)*243,w,h:225}));
 };
 const existing=stored();
 const original=Array.isArray(existing)?existing:defaultLayout();
 for(const item of original.slice(0,35)){
   if(!item||!['clock','notes',...Object.keys(assets)].includes(item.type))continue;
   addCard(item.type,{id:String(item.id||'')||undefined,x:clamp(num(item.x,8),0,5000),y:clamp(num(item.y,8),0,8000),w:clamp(num(item.w,300),180,720),h:clamp(num(item.h,220),145,650),note:String(item.note||'').slice(0,10000)});
 }
 // If an empty array was intentionally stored, keep it empty.
 if(empty)empty.hidden=cards.length>0;
 gear.hidden=false;
 document.addEventListener('v525:workspace-visibility',e=>{
   gear.hidden=!e.detail?.visible;
   if(!e.detail?.visible)setOpen(false);
   else{requestAnimationFrame(()=>{for(const card of cards){const el=Array.from(canvas.children).find(e=>e.dataset.cardId===card.id);if(el)applyGeometry(card,el);}refreshValues();refreshHistory(true);});}
 });
 const watch=new ResizeObserver(()=>{
   for(const card of cards){const el=Array.from(canvas.children).find(e=>e.dataset.cardId===card.id);if(el)applyGeometry(card,el);}
   updateCanvasExtent();
 });watch.observe(canvas);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshValues();refreshHistory(false);}});
 setInterval(()=>{if(document.hidden)return;refreshValues();refreshHistory(false);},2400);
 updateCanvasExtent();
 window.__v525Workspace={getCards:()=>cards.map(c=>({...c})),add:type=>addCard(type)};
})();
