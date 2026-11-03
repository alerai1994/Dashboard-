/* Vertex Windows 11 PWA widget provider (Edge). No fabricated prices.
   Widgets are optional; unsupported browsers ignore this service worker API. */
const PREFIX='vertex-crypto-';
const FALLBACK={name:'Crypto',price:'—',change:'—',changeColor:'Default',
 asof:'Prezzo non disponibile',source:'Fonte: Vertex'};
const templateUrl=new URL('./widgets/crypto-card-template.json',self.registration.scope);
const quotesUrl=new URL('./market-quotes.json',self.registration.scope);
let pending=false;

async function fetchWidgetSnapshot(){
 const [templateResponse,quotesResponse]=await Promise.all([
  fetch(templateUrl,{cache:'no-store'}),
  fetch(quotesUrl,{cache:'no-store'})
 ]);
 if(!templateResponse.ok||!quotesResponse.ok)throw new Error('Widget feed not available');
 const [template,quotes]=await Promise.all([templateResponse.text(),quotesResponse.json()]);
 return {template,items:new Map((quotes.crypto||[]).map(row=>[row.id,row]))};
}
function widgetData(id,item){
 const numeric=Number(item?.value),change=Number(item?.change);
 const good=Number.isFinite(numeric)&&numeric>0;
 const price=good?numeric.toLocaleString('it-IT',{
  style:'currency',currency:'USD',minimumFractionDigits:numeric<1?4:2,
  maximumFractionDigits:numeric<1?8:2}):'—';
 const changed=Number.isFinite(change);
 const name=(item?.symbol&&String(item.symbol).length<20)?item.symbol:id.toUpperCase();
 const asof=item?.time?new Date(item.time):null;
 return {name,price,change:changed?(change>=0?'+':'')+change.toFixed(2)+'%':'—',
  changeColor:changed?(change<0?'Attention':change>0?'Good':'Default'):'Default',
  asof:asof&&Number.isFinite(asof.getTime())?
   'Dato del '+asof.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):
   'Ora della quotazione non disponibile',
  source:'Fonte: '+(item?.source||'Vertex')+' · possibile ritardo'};
}
async function refreshWidgets(){
 if(!self.widgets||pending)return;
 pending=true;
 try{
  const instances=await self.widgets.matchAll({installed:true});
  if(!instances||!instances.length)return;
  let snapshot=null;
  try{snapshot=await fetchWidgetSnapshot();}catch(_err){}
  const fallbackTemplate=snapshot?.template||
   JSON.stringify({type:'AdaptiveCard',version:'1.5',
    body:[{type:'TextBlock',text:'Vertex Crypto',weight:'Bolder'},
      {type:'TextBlock',text:'Prezzo temporaneamente non disponibile'}]});
  await Promise.all(instances.filter(w=>w?.definition?.tag?.startsWith(PREFIX)).map(async widget=>{
   const tag=widget.definition.tag,id=tag.slice(PREFIX.length);
   const data=snapshot?widgetData(id,snapshot.items.get(id)):FALLBACK;
   try{await self.widgets.updateByTag(tag,{template:fallbackTemplate,data:JSON.stringify(data)});}
   catch(_err){}
  }));
 }finally{pending=false;}
}
self.addEventListener('widgetinstall',event=>{
 event.waitUntil((async()=>{
  try{
   if(self.registration.periodicSync){
    await self.registration.periodicSync.register('vertex-widgets',{minInterval:900000});
   }
  }catch(_err){}
  await refreshWidgets();
 })());
});
self.addEventListener('widgetresume',event=>{event.waitUntil(refreshWidgets());});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{await self.clients.claim();await refreshWidgets();})());
});
self.addEventListener('periodicsync',event=>{
 if(event.tag==='vertex-widgets')event.waitUntil(refreshWidgets());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='VERTEX_WIDGETS_REFRESH')event.waitUntil(refreshWidgets());
});
self.addEventListener('widgetclick',event=>{
 if(event.action==='open-vertex')event.waitUntil(
  self.clients.openWindow(new URL('./#widgets',self.registration.scope).href));
});
