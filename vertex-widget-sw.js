/* Vertex native Windows 11 Widgets Board integration for the Edge-installed PWA.
   Each definition is a selectable coin and gets its own Adaptive Card data.
   Periodic background sync is best-effort; quote timestamps always come from source. */
const PREFIX='vertex-crypto-';
const UPDATE_TAG='vertex-crypto-widget-update';
const FALLBACK={name:'Crypto',price:'—',change:'—',changeColor:'Default',
 asof:'Dati non disponibili',source:'Vertex • nessuna quotazione verificata'};
let updatingAll=false;

async function loadSnapshot(){
 const templateUrl=new URL('./widgets/crypto-card-template.json',self.registration.scope);
 const quotesUrl=new URL('./market-quotes.json',self.registration.scope);
 const [templateResponse,quoteResponse]=await Promise.all([
  fetch(templateUrl,{cache:'no-store'}),
  fetch(quotesUrl,{cache:'no-store'})
 ]);
 if(!templateResponse.ok||!quoteResponse.ok)throw new Error('Feed non disponibile');
 const [template,quotes]=await Promise.all([templateResponse.text(),quoteResponse.json()]);
 if(!Array.isArray(quotes.crypto))throw new Error('Crypto non valide');
 return {template,assets:new Map(quotes.crypto.map(row=>[row.id,row]))};
}
function quoteData(id,asset){
 const val=Number(asset?.value),delta=Number(asset?.change);
 const valid=asset!==undefined&&Number.isFinite(val)&&val>0;
 const changeValid=asset?.change!==undefined&&asset?.change!==null&&Number.isFinite(delta);
 const price=valid?new Intl.NumberFormat('it-IT',{style:'currency',currency:'USD',
  minimumFractionDigits:val<1?4:2,maximumFractionDigits:val<1?8:2}).format(val):'—';
 const asOf=asset?.time?new Date(asset.time):null;
 return {
  name:id.toUpperCase(),price,
  change:changeValid?(delta>=0?'+':'')+delta.toFixed(2)+'%':'—',
  changeColor:changeValid?(delta<0?'Attention':delta>0?'Good':'Default'):'Default',
  asof:asOf&&Number.isFinite(asOf.getTime())?
   'Quotazione '+asOf.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',
    hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}):'Orario non disponibile',
  source:'Fonte: '+(asset?.source||'Vertex')+' · eventuale ritardo'
 };
}
async function refreshWidget(widget,snapshot){
 if(!self.widgets||!widget?.definition?.tag?.startsWith(PREFIX))return;
 const id=widget.definition.tag.substring(PREFIX.length);
 let current=snapshot;
 if(!current){try{current=await loadSnapshot();}catch(_err){}}
 if(!current){
  // Preserve existing verified values after transient network outages.
  if(widget.instances?.some(instance=>instance?.payload?.data))return;
  const template=await (await fetch(new URL('./widgets/crypto-card-template.json',self.registration.scope))).text();
  await self.widgets.updateByTag(widget.definition.tag,{template,data:JSON.stringify({...FALLBACK,name:id.toUpperCase()})});
  return;
 }
 const data=quoteData(id,current.assets.get(id));
 await self.widgets.updateByTag(widget.definition.tag,{
  template:current.template,data:JSON.stringify(data)
 });
}
async function refreshAll(){
 if(!self.widgets||updatingAll)return;
 updatingAll=true;
 try{
  const widgets=await self.widgets.matchAll({installed:true});
  if(!widgets?.length)return;
  let snapshot=null;
  try{snapshot=await loadSnapshot();}catch(_err){}
  await Promise.allSettled(widgets.map(widget=>refreshWidget(widget,snapshot)));
 }finally{updatingAll=false;}
}
async function registerSync(){
 if(!self.registration.periodicSync)return;
 try{
  const tags=await self.registration.periodicSync.getTags();
  if(!tags.includes(UPDATE_TAG))await self.registration.periodicSync.register(UPDATE_TAG,{minInterval:15*60*1000});
 }catch(_err){/* Some Windows/Edge installations do not grant periodic sync. */}
}
self.addEventListener('widgetinstall',event=>{
 event.waitUntil((async()=>{
  await Promise.allSettled([refreshWidget(event.widget),registerSync()]);
 })());
});
self.addEventListener('widgetresume',event=>{
 event.waitUntil(refreshWidget(event.widget));
});
self.addEventListener('widgetuninstall',event=>{
 event.waitUntil((async()=>{
  if(!self.widgets||!self.registration.periodicSync)return;
  const left=await self.widgets.matchAll({installed:true});
  if(left.length===0){
   try{await self.registration.periodicSync.unregister(UPDATE_TAG);}catch(_err){}
  }
 })());
});
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{await self.clients.claim();await refreshAll();})());
});
self.addEventListener('periodicsync',event=>{
 if(event.tag===UPDATE_TAG)event.waitUntil(refreshAll());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='VERTEX_WIDGETS_REFRESH')event.waitUntil(refreshAll());
});
self.addEventListener('widgetclick',event=>{
 if(event.action==='open-vertex'){
  event.waitUntil(self.clients.openWindow(new URL('./#widgets',self.registration.scope).href));
 }
});
