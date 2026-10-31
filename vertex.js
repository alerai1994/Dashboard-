/* Vertex Global v2 — accessible interactive market terminal. No fabricated quotes. */
(function () {
'use strict';
const $=s=>document.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const sym=n=>'<svg class="icon" aria-hidden="true"><use href="#ic-'+n+'"></use></svg>';
const ESC_MAP={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>ESC_MAP[c]);
const num=x=>typeof x==='number'&&Number.isFinite(x);
const PREC={maximumFractionDigits:2,minimumFractionDigits:2};
const STORE='vertex-global-v2-';
const load=(key,fallback)=>{try{const v=localStorage.getItem(STORE+key);return v===null?fallback:JSON.parse(v)}catch(e){return fallback}};
const save=(key,value)=>{try{localStorage.setItem(STORE+key,JSON.stringify(value))}catch(e){}};
const ASSETS=[
{id:'sp500',name:'S&P 500',short:'S&P 500',group:'markets',symbol:'^GSPC',country:'USA',where:'New York · USA'},
{id:'nasdaq',name:'NASDAQ Composite',short:'NASDAQ',group:'markets',symbol:'^IXIC',country:'USA',where:'New York · USA'},
{id:'tsx',name:'S&P/TSX Composite',short:'S&P/TSX',group:'markets',symbol:'^GSPTSE',country:'Canada',where:'Toronto · Canada'},
{id:'ibov',name:'Ibovespa',short:'Ibovespa',group:'markets',symbol:'^BVSP',country:'Brasile',where:'San Paolo · Brasile'},
{id:'ftse',name:'FTSE 100',short:'FTSE 100',group:'markets',symbol:'^FTSE',country:'Regno Unito',where:'Londra · Regno Unito'},
{id:'dax',name:'DAX',short:'DAX',group:'markets',symbol:'^GDAXI',country:'Germania',where:'Francoforte · Germania'},
{id:'cac',name:'CAC 40',short:'CAC 40',group:'markets',symbol:'^FCHI',country:'Francia',where:'Parigi · Francia'},
{id:'jse',name:'FTSE/JSE Top 40',short:'JSE Top 40',group:'markets',symbol:'J200.JO',country:'Sudafrica',where:'Johannesburg · Sudafrica'},
{id:'tadawul',name:'Tadawul All Share',short:'Tadawul',group:'markets',symbol:'^TASI.SR',country:'Arabia Saudita',where:'Riyadh · Arabia Saudita'},
{id:'nikkei',name:'Nikkei 225',short:'NIKKEI 225',group:'markets',symbol:'^N225',country:'Giappone',where:'Tokyo · Giappone'},
{id:'hsi',name:'Hang Seng',short:'Hang Seng',group:'markets',symbol:'^HSI',country:'Hong Kong',where:'Hong Kong'},
{id:'nifty',name:'Nifty 50',short:'Nifty 50',group:'markets',symbol:'^NSEI',country:'India',where:'Mumbai · India'},
{id:'kospi',name:'KOSPI',short:'KOSPI',group:'markets',symbol:'^KS11',country:'Corea del Sud',where:'Seul · Corea del Sud'},
{id:'asx',name:'S&P/ASX 200',short:'ASX 200',group:'markets',symbol:'^AXJO',country:'Australia',where:'Sydney · Australia'},
{id:'gold',name:'Gold',short:'Oro',group:'commodities',symbol:'GC=F',icon:'🟡',currency:'USD'},
{id:'brent',name:'Brent Crude',short:'Brent Crude',group:'commodities',symbol:'BZ=F',icon:'💧',currency:'USD'},
{id:'wti',name:'WTI Crude',short:'WTI Crude',group:'commodities',symbol:'CL=F',icon:'💧',currency:'USD'},
{id:'silver',name:'Silver',short:'Argento',group:'commodities',symbol:'SI=F',icon:'🥈',currency:'USD'},
{id:'naturalgas',name:'Natural Gas',short:'Natural Gas',group:'commodities',symbol:'NG=F',icon:'🔥',currency:'USD'},
{id:'copper',name:'Copper',short:'Rame',group:'commodities',symbol:'HG=F',icon:'🟠',currency:'USD'},
{id:'eurusd',name:'EUR / USD',short:'EUR / USD',group:'forex',symbol:'EURUSD=X',icon:'🇪🇺',currency:'RATIO'},
{id:'gbpusd',name:'GBP / USD',short:'GBP / USD',group:'forex',symbol:'GBPUSD=X',icon:'🇬🇧',currency:'RATIO'},
{id:'usdjpy',name:'USD / JPY',short:'USD / JPY',group:'forex',symbol:'JPY=X',icon:'🇯🇵',currency:'RATIO'},
{id:'usdchf',name:'USD / CHF',short:'USD / CHF',group:'forex',symbol:'CHF=X',icon:'🇨🇭',currency:'RATIO'},
{id:'audusd',name:'AUD / USD',short:'AUD / USD',group:'forex',symbol:'AUDUSD=X',icon:'🇦🇺',currency:'RATIO'},
{id:'usdcny',name:'USD / CNY',short:'USD / CNY',group:'forex',symbol:'CNY=X',icon:'🇨🇳',currency:'RATIO'},
{id:'btc',name:'Bitcoin (BTC)',short:'Bitcoin',group:'crypto',symbol:'BTC-USD',icon:'₿',currency:'USD'},
{id:'eth',name:'Ethereum (ETH)',short:'Ethereum',group:'crypto',symbol:'ETH-USD',icon:'◆',currency:'USD'},
{id:'sol',name:'Solana (SOL)',short:'Solana',group:'crypto',symbol:'SOL-USD',icon:'◎',currency:'USD'},
{id:'xrp',name:'XRP',short:'XRP',group:'crypto',symbol:'XRP-USD',icon:'✕',currency:'USD'},
{id:'bnb',name:'BNB',short:'BNB',group:'crypto',symbol:'BNB-USD',icon:'⬡',currency:'USD'},
{id:'doge',name:'Dogecoin (DOGE)',short:'Dogecoin',group:'crypto',symbol:'DOGE-USD',icon:'Ð',currency:'USD'},
{id:'inj',name:'Injective (INJ)',short:'Injective',group:'crypto',symbol:'INJ-USD',icon:'∿',currency:'USD'}
];
const ASSET_BY_ID=Object.fromEntries(ASSETS.map(a=>[a.id,a]));
const SECTIONS={
home:['Home','La tua panoramica dei mercati e degli strumenti.'],
global:['Global','Real-time market data across every region, market and asset class.'],
markets:['Markets','Prezzi, variazioni, grafici e mercati mondiali.'],
watchlist:['Watchlist','I mercati che vuoi seguire, salvati sul tuo dispositivo.'],
portfolio:['Portfolio','Tieni traccia delle posizioni inserite manualmente.'],
news:['News','Accesso rapido a fonti finanziarie verificabili.'],
analytics:['Analytics','Indicatori e andamento dei principali mercati mondiali.'],
alerts:['Alerts','Soglie di prezzo controllate quando la dashboard è aperta.'],
settings:['Settings','Aspetto, origini dei dati e accesso al terminale originale.']
};
const REGIONS=[
{id:'north-america',name:'North America',italian:'America del Nord',glyph:'🌎',ids:['sp500','nasdaq','tsx'],lead:'sp500',pin:[-93,42],callout:[20,34],color:'#18dba0'},
{id:'south-america',name:'South America',italian:'America del Sud',glyph:'🌎',ids:['ibov'],lead:'ibov',pin:[-60,-18],callout:[27,68]},
{id:'europe',name:'Europe',italian:'Europa',glyph:'🌍',ids:['ftse','dax','cac'],lead:'ftse',pin:[11,51],callout:[50,21]},
{id:'africa',name:'Africa',italian:'Africa',glyph:'🌍',ids:['jse'],lead:'jse',pin:[21,-4],callout:[54,64]},
{id:'middle-east',name:'Middle East',italian:'Medio Oriente',glyph:'🌏',ids:['tadawul'],lead:'tadawul',pin:[47,25],callout:[67,52]},
{id:'asia',name:'Asia',italian:'Asia',glyph:'🌏',ids:['nikkei','hsi','nifty','kospi'],lead:'hsi',pin:[112,39],callout:[80,31]},
{id:'oceania',name:'Oceania',italian:'Oceania',glyph:'🌏',ids:['asx'],lead:'asx',pin:[136,-27],callout:[86,77]}
];
const REGION_BY_ID=Object.fromEntries(REGIONS.map(r=>[r.id,r]));
const QUOTE_GROUPS=[
{group:'commodities',title:'Commodities',icon:'🌐',ids:['gold','brent','wti','silver','naturalgas','copper']},
{group:'forex',title:'Forex',icon:'🌐',ids:['eurusd','gbpusd','usdjpy','usdchf','audusd','usdcny']},
{group:'crypto',title:'Crypto',icon:'🌐',ids:['btc','eth','sol','xrp','bnb','doge']}
];
const TOP_IDS=['sp500','nasdaq','ftse','dax','nikkei','hsi'];
const FALLBACK_LAND=[
'M70 113L136 53L211 53L256 78L267 110L239 148L225 168L218 198L183 220L164 180L128 169L101 153Z',
'M191 204L240 221L251 266L232 302L239 345L211 437L190 389L182 338L165 300Z',
'M268 36L315 18L344 43L309 78L273 71Z',
'M451 136L476 113L516 112L538 135L508 157L475 150Z',
'M464 169L515 166L548 196L561 244L546 295L514 352L484 311L468 275L451 223Z',
'M515 129L547 104L593 98L624 70L672 75L718 66L793 93L846 128L889 146L871 173L840 181L801 202L778 181L748 199L707 201L677 235L648 210L613 222L593 190L563 176L540 167Z',
'M683 239L719 242L740 277L716 313L695 288Z',
'M795 345L842 314L889 344L905 387L862 411L819 393Z','M904 397L929 398L931 428L912 435Z'];
const CITY_MARKETS=[
[-74,40.7,'sp500'],[-79.38,43.65,'tsx'],[-46.63,-23.55,'ibov'],[-0.13,51.51,'ftse'],[8.68,50.11,'dax'],[2.35,48.86,'cac'],[28.04,-26.2,'jse'],[46.7,24.7,'tadawul'],[139.7,35.7,'nikkei'],[114.17,22.31,'hsi'],[72.8,19.1,'nifty'],[126.9,37.5,'kospi'],[151.2,-33.87,'asx']
];
const state={
 page:(location.hash||'#global').slice(1).toLowerCase(),quotes:{},feedTime:null,feedError:false,loading:true,
 watch:Array.isArray(load('watch',[]))?load('watch',[]):[],
 holdings:Array.isArray(load('holdings',[]))?load('holdings',[]):[],
 alerts:Array.isArray(load('alerts',[]))?load('alerts',[]):[],
 theme:load('theme','dark'),region:null,marketFilter:'all',marketSearch:'',dialogId:null,chartShift:0,chartHover:null,
 land:'',searchResults:[],errorText:''
};
if(!SECTIONS[state.page])state.page='global';
if(!['dark','light'].includes(state.theme))state.theme='dark';
document.body.className='theme-'+state.theme;
const safeDate=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?d:null};
const localeDate=(t,opts)=>{const d=safeDate(t);return d?new Intl.DateTimeFormat('it-IT',opts).format(d):'n.d.'};
const pct=x=>num(x)?(x>0?'▲ +':x<0?'▼ ':'')+x.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—';
const trend=x=>!num(x)?'unknown':x>0?'up':x<0?'down':'flat';
const trendClass=x=>'color-'+trend(x);
const quote=id=>state.quotes[id]||null;
const change=id=>quote(id)&&quote(id).change;
const dataCount=()=>ASSETS.filter(a=>quote(a.id)&&num(quote(a.id).value)).length;
const formatValue=(v,a)=>{
 if(!num(v))return '—';
 if(a&&a.group==='forex')return v.toLocaleString('it-IT',{minimumFractionDigits:v>=100?2:4,maximumFractionDigits:v>=100?3:5});
 if(a&&a.group==='markets')return v.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
 const digits=Math.abs(v)<1?4:Math.abs(v)<10?3:2;
 return (a&&(a.group==='crypto'||a.group==='commodities')?'$':'')+v.toLocaleString('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits});
};
const assetValue=a=>formatValue(quote(a.id)&&quote(a.id).value,a);
const refTime=id=>quote(id)&&quote(id).time?localeDate(quote(id).time,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Non disponibile';
const classArrow=id=>trendClass(change(id));
function sparkLine(id,width=120,height=32){
 const q=quote(id),candles=q&&q.candles,values=Array.isArray(candles)&&candles.length>2?candles.slice(-26).map(x=>x.c):q&&Array.isArray(q.history)?q.history:[];
 const arr=values.map(Number).filter(num);if(arr.length<2)return '<svg class="spark" aria-hidden="true" viewBox="0 0 '+width+' '+height+'"><path d="M 4 '+height/2+' L '+(width-4)+' '+height/2+'" stroke="currentColor" opacity=".24" stroke-dasharray="2 4" fill="none"/></svg>';
 const min=Math.min(...arr),max=Math.max(...arr),range=Math.max(max-min,Math.abs(max)*.002,1e-8);
 const points=arr.map((v,i)=>[(4+i*(width-8)/(arr.length-1)),(height-5-(v-min)/range*(height-10))]);
 const path=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
 return '<svg class="spark" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function meanRegion(r){
 const changes=r.ids.map(change).filter(num);
 return changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:null;
}
function meanPrice(r){const a=ASSET_BY_ID[r.lead];return a?assetValue(a):'—';}
function selectRegion(id){state.region=state.region===id?null:id;render();const map=$('#worldMap');if(map)map.scrollIntoView({block:'nearest',behavior:'smooth'});}
function indexCard(id){
 const a=ASSET_BY_ID[id],q=quote(id),tr=trend(q&&q.change);
 return '<button class="index-mini panel" type="button" data-asset="'+esc(id)+'" data-trend="'+tr+'" aria-label="Apri '+esc(a.name)+'">'+
 '<span class="mini-title">'+esc(a.short)+'</span><span class="mini-price mono">'+assetValue(a)+'</span><span class="mini-country">'+esc(a.country)+'</span>'+
 '<b class="mini-change change">'+pct(q&&q.change)+'</b>'+sparkLine(id)+'</button>';
}
function geographicLegend(){return '<div class="map-legend"><span style="color:var(--green)"><i></i> Rialzo</span><span style="color:var(--red)"><i></i> Ribasso</span><span style="color:var(--muted)"><i></i> N/D</span></div>';}
const coord=(lon,lat)=>[(lon+180)/360*1000,(90-lat)/180*580];
function mapArc(a,b,red){
 const s=coord(...a.pin),e=coord(...b.pin),cx=(s[0]+e[0])/2,cy=(s[1]+e[1])/2-65;
 return '<path class="region-arc'+(red?' red':'')+'" d="M'+s.map(x=>x.toFixed(1)).join(' ')+' Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+e.map(x=>x.toFixed(1)).join(' ')+'"/>';
}
function svgMap(){
 let graticule='';
 for(let lon=-150;lon<=150;lon+=30){const x=coord(lon,0)[0];graticule+='<path class="longitude" d="M'+x+' 0V580"/>';}
 for(let lat=-60;lat<=60;lat+=30){const y=coord(0,lat)[1];graticule+='<path class="latitude" d="M0 '+y+'H1000"/>';}
 const arcs=[[0,2],[2,5],[5,6],[2,3],[0,1],[5,4],[4,6]].map(([a,b])=>mapArc(REGIONS[a],REGIONS[b],meanRegion(REGIONS[b])<0)).join('');
 const glows=CITY_MARKETS.map(([lon,lat,id])=>{
  const [x,y]=coord(lon,lat),t=trend(change(id)),c=t==='up'?'#19e9ac':t==='down'?'#ff6677':'#71a8b3';
  return '<circle cx="'+x+'" cy="'+y+'" r="2.2" fill="'+c+'" opacity=".85"/><circle cx="'+x+'" cy="'+y+'" r="8" fill="'+c+'" opacity=".06"/>';
 }).join('');
 return '<svg class="map-svg" viewBox="0 0 1000 580" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mappa geografica dei mercati">' +
 '<defs><radialGradient id="globeGrad"><stop stop-color="#0f3851"/><stop offset="1" stop-color="#061422"/></radialGradient><filter id="city-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>'+
 '<rect x="0" y="0" width="1000" height="580" fill="url(#globeGrad)"/>'+
 '<g class="graticule">'+graticule+'</g><g class="land-group" id="landGroup">'+(state.land||FALLBACK_LAND.map(d=>'<path class="land" d="'+d+'"/>').join(''))+'</g><g>'+arcs+'</g><g>'+glows+'</g></svg>';
}
function mapPanel(){
 return '<section class="world-map-panel" id="worldMap" aria-label="Mappa dei mercati mondiali">'+
 '<div class="world-map-header"><span>WORLD MARKET MAP</span></div><div class="map-stage">'+svgMap()+
 REGIONS.map(r=>{
 const p=coord(...r.pin),avg=meanRegion(r),tr=trend(avg),selected=state.region===r.id;
 return '<button type="button" class="map-pin'+(selected?' selected':'')+'" data-region="'+r.id+'" data-trend="'+tr+'" style="left:'+(p[0]/10).toFixed(2)+'%;top:'+(p[1]/5.8).toFixed(2)+'%" aria-label="'+esc(r.italian)+': '+pct(avg)+'" title="'+esc(r.italian)+'"></button>'+
 '<button type="button" class="map-callout'+(selected?' selected':'')+'" data-region="'+r.id+'" data-trend="'+tr+'" style="left:'+r.callout[0]+'%;top:'+r.callout[1]+'%" aria-label="Apri '+esc(r.italian)+'"><strong>'+esc(r.name)+'</strong><span>'+pct(avg)+'</span></button>';
 }).join('')+
 '<div class="map-hint">● Seleziona una regione · media degli indici disponibili</div></div>'+geographicLegend()+
 (state.region?regionInsight(REGION_BY_ID[state.region]):'')+'</section>';
}
function regionInsight(r){
 if(!r)return '';
 const avail=r.ids.filter(id=>quote(id)&&num(quote(id).value)).length;
 return '<div class="region-insight"><strong>'+esc(r.italian)+'</strong><small>Media aritmetica di '+avail+' indici disponibili su '+r.ids.length+'</small><div class="region-insight-markets">'+r.ids.map(id=>'<button type="button" data-asset="'+id+'">'+esc(ASSET_BY_ID[id].short)+' <span class="'+classArrow(id)+'">'+pct(change(id))+'</span></button>').join('')+'</div></div>';
}
function regionList(){
 return '<section class="global-regions panel"><div class="section-topline"><h2>'+sym('globe')+' Global Markets</h2><button type="button" class="text-action" data-page="markets">View All</button></div><div class="region-list">'+
 REGIONS.map(r=>'<button type="button" class="region-list-item'+(state.region===r.id?' selected':'')+'" data-region="'+r.id+'"><span class="region-glyph">'+r.glyph+'</span><span class="region-titles"><strong>'+esc(r.name)+'</strong><span class="region-change '+trendClass(meanRegion(r))+'">'+pct(meanRegion(r))+'</span></span>'+sym('arrow')+'</button>').join('')+
 '</div></section>';
}
function assetLogo(a){return '<span class="asset-logo asset-'+esc(a.id)+'">'+esc(a.icon||'◉')+'</span>';}
function sidePanel(group){
 return '<section class="market-panel panel"><div class="section-topline"><h3><span>'+group.icon+'</span> '+esc(group.title)+'</h3><button type="button" class="text-action" data-page="markets" data-category="'+group.group+'">View All</button></div>'+
 '<div class="instrument-rows">'+group.ids.map(id=>{
 const a=ASSET_BY_ID[id],q=quote(id);
 return '<button type="button" class="instrument-row" data-asset="'+id+'" aria-label="Apri '+esc(a.name)+'">'+assetLogo(a)+'<span class="asset-label">'+esc(a.name)+'</span>'+
 '<span class="asset-price">'+assetValue(a)+'</span><span class="asset-change '+classArrow(id)+'">'+pct(q&&q.change)+'</span></button>';
 }).join('')+'</div></section>';
}
function photoCard(r){
 const lead=ASSET_BY_ID[r.lead],q=quote(r.lead);
 return '<button type="button" class="photo-card" data-region="'+r.id+'" data-trend="'+trend(q&&q.change)+'" data-id="'+r.id+'" aria-label="Apri '+esc(r.name)+'">'+
 '<span class="photo-cover" aria-hidden="true"></span><span class="photo-card-body"><span class="photo-card-title">'+esc(r.name)+'</span>'+
 '<span class="photo-card-metrics"><strong>'+meanPrice(r)+'</strong><span class="change '+trendClass(meanRegion(r))+'">'+pct(meanRegion(r))+'</span></span>'+sparkLine(r.lead,120,32)+'</span></button>';
}
function feedStatus(){
 const when=state.feedTime?localeDate(state.feedTime,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'non disponibile';
 return '<div class="data-footnote"><span class="data-status'+(state.feedError?' error':'')+'"><i></i> '+(state.feedError?'Feed non raggiungibile':'Dati disponibili: '+dataCount()+'/'+ASSETS.length)+' · Ultimo snapshot '+when+'</span>'+
 '<span>Quotazioni indicative e potenzialmente ritardate; mercati chiusi = ultima seduta. <button type="button" data-refresh="1">'+sym('refresh')+' Aggiorna</button></span></div>';
}
function globalPage(){
 return '<section class="market-index-strip">'+TOP_IDS.map(indexCard).join('')+'</section>'+
 '<div class="global-grid">'+regionList()+mapPanel()+
 '<aside class="aside-stack">'+QUOTE_GROUPS.map(sidePanel).join('')+'</aside>'+
 '<div class="region-photo-grid" aria-label="Panoramica fotografica delle regioni">'+REGIONS.map(photoCard).join('')+'</div></div>'+
 feedStatus();
}
function secHeader(title,subtitle,actions){return '<div class="content-heading"><div><h2>'+esc(title)+'</h2><p>'+esc(subtitle||'')+'</p></div>'+(actions?'<div class="btn-group">'+actions+'</div>':'')+'</div>';}
function countMarketMood(){
 const q=ASSETS.filter(a=>quote(a.id)&&num(change(a.id)));
 return {up:q.filter(a=>change(a.id)>0).length,down:q.filter(a=>change(a.id)<0).length,flat:q.filter(a=>change(a.id)===0).length,total:q.length};
}
function overviewCard(label,value,note,cls=''){
 return '<article class="summary-card panel"><small>'+esc(label)+'</small><strong class="'+cls+'">'+esc(value)+'</strong><div class="micro-note">'+esc(note)+'</div></article>';
}
function homePage(){
 const s=countMarketMood();
 const g=(id)=>ASSET_BY_ID[id];
 const marketCards=['btc','eth','sol','sp500','nasdaq','dax'].map(id=>'<button type="button" class="index-mini panel" data-asset="'+id+'" data-trend="'+trend(change(id))+'"><span class="mini-title">'+esc(g(id).short)+'</span><span class="mini-price">'+assetValue(g(id))+'</span><span class="mini-country">'+esc(g(id).group==='crypto'?'Crypto':g(id).country)+'</span><span class="mini-change change">'+pct(change(id))+'</span>'+sparkLine(id)+'</button>').join('');
 return secHeader('Panoramica','Controlla i mercati e accedi subito alle sezioni principali','<button class="btn btn-primary" type="button" data-page="global">'+sym('globe')+' Mappa mondiale</button>')+
 '<div class="summary-grid">'+overviewCard('Mercati disponibili',dataCount()+'/'+ASSETS.length,'Dati reali da fonti esterne')+
 overviewCard('Strumenti in rialzo',String(s.up),'Variazioni disponibili','color-up')+
 overviewCard('Strumenti in ribasso',String(s.down),'Ultima seduta / 24h','color-down')+
 overviewCard('Mercati nella watchlist',String(state.watch.length),'Salvati in questo browser')+'</div>'+
 secHeader('Indici e criptovalute','Grafici e variazioni')+'<div class="market-index-strip">'+marketCards+'</div>'+
 '<div class="quick-grid">'+
 [['global','globe','Global Markets','Mappa mondiale interattiva'],['markets','bars','Markets','Esplora gli strumenti'],['analytics','trend','Analytics','Analisi dei movimenti'],['portfolio','pie','Portfolio','Posizioni manuali'],['watchlist','star','Watchlist','Asset preferiti'],['alerts','bell','Alerts','Soglie di prezzo']].map(x=>'<button type="button" class="quick-card" data-page="'+x[0]+'">'+sym(x[1])+'<strong>'+esc(x[2])+'</strong><small>'+esc(x[3])+'</small></button>').join('')+
 '</div>'+feedStatus();
}
function tableForAssets(items,emptyTitle){
 if(!items.length)return '<div class="empty-state"><h3>'+esc(emptyTitle||'Nessun mercato da mostrare')+'</h3><p>Modifica la ricerca o aggiungi strumenti alla watchlist.</p></div>';
 return '<div class="data-table-scroll"><table class="data-table"><thead><tr><th>Strumento</th><th>Ultimo prezzo</th><th>Variazione</th><th>Storico</th><th>Fonte</th></tr></thead><tbody>'+
 items.map(a=>'<tr tabindex="0" data-asset="'+a.id+'" aria-label="Dettagli '+esc(a.name)+'"><td><strong>'+esc(a.name)+'</strong><small>'+esc(a.symbol)+'</small></td>'+
 '<td>'+assetValue(a)+'</td><td class="'+classArrow(a.id)+'">'+pct(change(a.id))+'</td>'+
 '<td class="'+classArrow(a.id)+'">'+sparkLine(a.id,90,26)+'</td><td><small>'+esc(a.group==='crypto'?'CoinGecko':'Yahoo Finance')+'</small></td></tr>').join('')+
 '</tbody></table></div>';
}
function marketsPage(){
 const options=[['all','Tutti'],['markets','Indici'],['commodities','Materie prime'],['forex','Forex'],['crypto','Crypto']];
 const text=state.marketSearch.trim().toLowerCase();
 const filtered=ASSETS.filter(a=>(state.marketFilter==='all'||state.marketFilter===a.group)&&(!text||(a.name+' '+a.symbol+' '+a.country).toLowerCase().includes(text)));
 return secHeader('Esplora tutti i mercati','Seleziona uno strumento per aprire il grafico storico e gli indicatori',
 '<a class="btn btn-small" href="./legacy.html">'+sym('external')+' Terminal Pro</a>')+
 '<section class="content-card panel"><div class="filter-row"><div class="tab-filters" role="group" aria-label="Categorie mercati">'+
 options.map(([id,label])=>'<button type="button" data-filter="'+id+'" class="'+(state.marketFilter===id?'active':'')+'">'+label+'</button>').join('')+
 '</div><input class="filter-input" type="search" id="marketSearch" value="'+esc(state.marketSearch)+'" placeholder="Cerca per nome o ticker..." aria-label="Filtra strumenti"></div><div id="marketRows">'+tableForAssets(filtered,'Nessun risultato')+'</div></section>'+feedStatus();
}
function watchlistPage(){
 const assets=state.watch.map(id=>ASSET_BY_ID[id]).filter(Boolean);
 return secHeader('La tua Watchlist','Preferiti memorizzati solo in questo browser','<button type="button" class="btn btn-primary" data-page="markets">'+sym('plus')+' Aggiungi mercati</button>')+
 '<section class="content-card panel"><h3>Strumenti preferiti ('+assets.length+')</h3>'+tableForAssets(assets,'La watchlist è vuota')+
 '<p class="subnote">Apri uno strumento e premi ☆ Watchlist per salvarlo o rimuoverlo.</p></section>'+feedStatus();
}
function portfolioTotals(){
 let value=0,cost=0,available=0;
 for(const h of state.holdings){
  const q=quote(h.id),a=ASSET_BY_ID[h.id];
  if(!a||!num(q&&q.value))continue;
  const qty=Math.max(0,Number(h.qty)||0),basis=Math.max(0,Number(h.cost)||0);
  if(!num(qty)||!num(basis))continue;
  value+=qty*q.value;cost+=qty*basis;available++;
 }
 return {value,cost,available};
}
function portfolioPage(){
 const total=portfolioTotals(),pnl=total.value-total.cost;
 const opts=ASSETS.filter(a=>a.group==='crypto'||a.group==='commodities').map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('');
 return secHeader('Portfolio','Monitoraggio manuale, senza collegamento a conti o exchange')+
 '<div class="summary-grid">'+overviewCard('Valore delle posizioni con quotazione',formatValue(total.value,{group:'crypto'}),'Asset con prezzo disponibile')+
 overviewCard('Capitale di carico',formatValue(total.cost,{group:'crypto'}),'Somma dei costi inseriti')+
 overviewCard('Differenza stimata',formatValue(pnl,{group:'crypto'}),'Non considera commissioni o tasse',trendClass(pnl))+
 overviewCard('Posizioni',String(state.holdings.length),'In questo browser')+'</div>'+
 '<section class="content-card panel"><h3>Aggiungi una posizione</h3><form id="portfolioForm" class="form-grid">'+
 '<div class="form-field"><label for="holdingAsset">Strumento</label><select id="holdingAsset" name="id" required>'+opts+'</select></div>'+
 '<div class="form-field"><label for="holdingQty">Quantità</label><input id="holdingQty" type="number" name="qty" placeholder="0,00" min=".00000001" step="any" required></div>'+
 '<div class="form-field"><label for="holdingCost">Prezzo medio di carico (USD)</label><input id="holdingCost" type="number" name="cost" placeholder="0,00" min="0" step="any" required></div>'+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">'+sym('plus')+' Aggiungi</button></div></form></section>'+
 '<section class="content-card panel" style="margin-top:13px"><h3>Le tue posizioni</h3>'+
 (state.holdings.length?'<div class="data-table-scroll"><table class="data-table"><thead><tr><th>Strumento</th><th>Quantità</th><th>Carico</th><th>Prezzo attuale</th><th>Valore stimato</th><th></th></tr></thead><tbody>'+
 state.holdings.map((h,i)=>{const a=ASSET_BY_ID[h.id],q=quote(h.id);if(!a)return '';
 return '<tr><td><strong>'+esc(a.name)+'</strong></td><td>'+Number(h.qty).toLocaleString('it-IT')+'</td><td>$'+Number(h.cost).toLocaleString('it-IT',PREC)+'</td><td>'+assetValue(a)+'</td><td>'+(num(q&&q.value)?'$'+(q.value*Number(h.qty)).toLocaleString('it-IT',PREC):'—')+'</td><td><button class="btn btn-small" data-delete-holding="'+i+'">Rimuovi</button></td></tr>';
 }).join('')+'</tbody></table></div>':'<div class="empty-state"><h3>Nessuna posizione</h3><p>Inserisci un asset, la quantità e il prezzo di carico.</p></div>')+
 '<p class="notice">Questi sono calcoli indicativi su dati pubblici, non un rendiconto fiscale o patrimoniale. Informazioni conservate solo sul dispositivo.</p></section>';
}
function newsPage(){
 const sites=[
 ['Reuters Markets','Notizie sui mercati finanziari internazionali','https://www.reuters.com/markets/'],
 ['CNBC Markets','Copertura di mercati, economia e società quotate','https://www.cnbc.com/markets/'],
 ['Bloomberg Markets','Analisi e cronaca finanziaria','https://www.bloomberg.com/markets'],
 ['Il Sole 24 Ore','Mercati e finanza in italiano','https://www.ilsole24ore.com/finanza'],
 ['Yahoo Finance','Quotazioni, grafici e notizie sugli asset','https://finance.yahoo.com/'],
 ['CoinDesk','Notizie e approfondimenti sulle criptovalute','https://www.coindesk.com/']
 ];
 return secHeader('Financial News','Fonti esterne: qui non vengono inventati titoli o notizie')+
 '<div class="card-links">'+sites.map(([name,description,link])=>'<a class="news-link" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer"><span><strong>'+esc(name)+'</strong><small>'+esc(description)+'</small></span>'+sym('external')+'</a>').join('')+'</div>'+
 '<p class="data-footnote">Le notizie si aprono sui rispettivi siti. Nessun contenuto di terzi viene ripubblicato senza autorizzazione.</p>';
}
function analyticsPage(){
 const s=countMarketMood(),total=s.up+s.down;const r=REGIONS.map(x=>({name:x.italian,avg:meanRegion(x),available:x.ids.filter(id=>num(change(id))).length}));
 return secHeader('Global Analytics','Panoramica calcolata dalle variazioni effettivamente disponibili',
 '<a href="./legacy.html" class="btn btn-primary">'+sym('trend')+' Apri grafici avanzati</a>')+
 '<div class="summary-grid">'+overviewCard('Strumenti in rialzo',s.up,'Positivi','color-up')+
 overviewCard('Strumenti in ribasso',s.down,'Negativi','color-down')+
 overviewCard('Invariati',s.flat,'Variazione = 0')+
 overviewCard('Copertura',s.total+'/'+ASSETS.length,'Strumenti con variazione')+'</div>'+
 '<div class="analytics-grid"><section class="content-card panel"><h3>Ampiezza dei mercati</h3><p class="subnote">Quota di rialzi e ribassi sugli strumenti con dati disponibili.</p>'+
 '<div class="data-bands"><div class="data-band"><span>Rialzi</span><div class="bar-track"><div class="bar-fill" style="width:'+(total?s.up/total*100:0)+'%"></div></div><strong class="color-up">'+s.up+'</strong></div>'+
 '<div class="data-band"><span>Ribassi</span><div class="bar-track"><div class="bar-fill down" style="width:'+(total?s.down/total*100:0)+'%"></div></div><strong class="color-down">'+s.down+'</strong></div></div>'+
 '<p class="subnote">Esclusi i dati mancanti e quelli invariati.</p></section>'+
 '<section class="content-card panel"><h3>Variazione media per regione</h3><p class="subnote">Media aritmetica non ponderata dei principali indici elencati.</p>'+
 '<div class="data-bands">'+r.map(o=>'<div class="data-band"><span>'+esc(o.name)+'</span><div class="bar-track"><div class="bar-fill'+(o.avg<0?' down':'')+'" style="width:'+(num(o.avg)?Math.min(100,Math.abs(o.avg)*20+3):0)+'%"></div></div><strong class="'+trendClass(o.avg)+'">'+pct(o.avg)+'</strong></div>').join('')+'</div></section></div>'+
 '<div class="content-card panel" style="margin-top:14px"><h3>Grafici degli indici principali</h3><div class="market-index-strip">'+TOP_IDS.map(indexCard).join('')+'</div><p class="subnote">Clicca su un indice per accedere al grafico completo con medie mobili e indicatori, dove lo storico è disponibile.</p></div>'+feedStatus();
}
function alertState(a){
 const v=quote(a.id)&&quote(a.id).value;
 if(!num(v))return 'Senza quotazione';
 return a.operator==='above'?(v>=a.value?'Soglia raggiunta':'In attesa'):(v<=a.value?'Soglia raggiunta':'In attesa');
}
function triggeredAlerts(){return state.alerts.filter(x=>alertState(x)==='Soglia raggiunta');}
function alertsPage(){
 const options=ASSETS.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('');
 return secHeader('Price Alerts','Controllo locale del prezzo quando questa pagina è aperta')+
 '<section class="content-card panel"><h3>Nuovo alert</h3><form id="alertForm" class="form-grid">'+
 '<div class="form-field"><label for="alertAsset">Asset</label><select name="id" id="alertAsset">'+options+'</select></div>'+
 '<div class="form-field"><label for="alertOperator">Condizione</label><select name="operator" id="alertOperator"><option value="above">Prezzo ≥</option><option value="below">Prezzo ≤</option></select></div>'+
 '<div class="form-field"><label for="alertValue">Prezzo soglia (unità di quotazione)</label><input id="alertValue" name="value" type="number" min="0" step="any" required></div>'+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">'+sym('plus')+' Aggiungi alert</button></div></form>'+
 '<p class="notice">Gli alert sono conservati nel browser e valutati sui dati disponibili al caricamento/aggiornamento. Nessuna notifica push e nessun monitoraggio a browser chiuso.</p></section>'+
 '<section class="content-card panel" style="margin-top:14px"><h3>Alert salvati ('+state.alerts.length+')</h3>'+
 (state.alerts.length?state.alerts.map((x,i)=>'<div class="alert-row"><div><strong>'+esc(ASSET_BY_ID[x.id]?.name||x.id)+' · '+(x.operator==='above'?'≥':'≤')+' '+Number(x.value).toLocaleString('it-IT')+'</strong><small>'+esc(alertState(x))+' · Prezzo '+assetValue(ASSET_BY_ID[x.id]||{id:x.id,group:'markets'})+'</small></div><button type="button" data-delete-alert="'+i+'">Rimuovi</button></div>').join(''):'<div class="empty-state"><h3>Nessun alert</h3><p>Aggiungi una soglia per monitorarla quando usi la dashboard.</p></div>')+'</section>'+feedStatus();
}
function settingsPage(){
 const readable=state.feedTime?localeDate(state.feedTime,{dateStyle:'medium',timeStyle:'short'}):'Non disponibile';
 return secHeader('Impostazioni','Preferenze locali e trasparenza delle fonti')+
 '<section class="content-card panel"><h3>Aspetto</h3><p>La dashboard si adatta automaticamente a PC, tablet e smartphone.</p><button class="btn" type="button" data-toggle-theme="1">'+sym('moon')+' '+(state.theme==='dark'?'Attiva tema chiaro':'Attiva tema scuro')+'</button></section>'+
 '<section class="content-card panel" style="margin-top:14px"><h3>Dati finanziari</h3><p class="muted">Indici, materie prime e Forex: Yahoo Finance. Criptovalute: CoinGecko. Snapshot aggiornato da GitHub Actions ogni 30 minuti circa, soggetto a limiti delle API e ritardi delle borse.</p><p>Ultimo feed: <strong>'+readable+'</strong></p><button type="button" class="btn" data-refresh="1">'+sym('refresh')+' Ricarica snapshot</button></section>'+
 '<section class="content-card panel" style="margin-top:14px"><h3>Crypto Terminal Pro originale</h3><p class="muted">La versione precedente rimane disponibile, con gli strumenti avanzati già presenti.</p><a class="btn btn-primary" href="./legacy.html">'+sym('external')+' Apri la vecchia dashboard</a></section>';
}
const PAGE_RENDERERS={home:homePage,global:globalPage,markets:marketsPage,watchlist:watchlistPage,portfolio:portfolioPage,news:newsPage,analytics:analyticsPage,alerts:alertsPage,settings:settingsPage};
function updateNav(){
 $$('.side-link[data-page]').forEach(b=>{const sel=b.dataset.page===state.page;b.classList.toggle('active',sel);if(sel)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 const count=triggeredAlerts().length;$('#alertCount').hidden=count===0;if(count)$('#alertCount').textContent=String(count);
 $('#notifDot').hidden=count===0;
}
function render(){
 const page=SECTIONS[state.page]||SECTIONS.global;
 $('#pageTitle').textContent=page[0];$('#pageSubtitle').textContent=page[1];
 const main=$('#pageContainer');
 main.innerHTML=PAGE_RENDERERS[state.page]();
 updateNav();
 if(state.page==='global'&&!state.land)loadWorldShape();
}
function navigate(page){
 if(!SECTIONS[page])page='global';
 state.page=page;
 if(location.hash!=='#'+page)history.replaceState(null,'','#'+page);
 $('#sidebar').classList.remove('open');
 render();
 window.scrollTo({top:0,behavior:'instant'});
}
function setTheme(val){
 state.theme=val==='light'?'light':'dark';
 document.body.className='theme-'+state.theme;
 save('theme',state.theme);
 $('#themeSwitch').classList.toggle('on',state.theme==='dark');
 $('#themeToggle').setAttribute('aria-label',state.theme==='dark'?'Attiva modalità chiara':'Attiva modalità scura');
 if(state.page==='settings')render();
}
function toast(message){
 const el=$('#toast');el.textContent=String(message);el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3400);
}
function updateClock(){
 const now=new Date();
 $('#localDate').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Rome'}).format(now);
 $('#localTime').textContent=new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Rome'}).format(now)+' (Roma)';
}
async function fetchQuotes(isManual=false){
 try{
  const response=await fetch('./global-quotes.json?cache='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();
  if(!data||!Array.isArray(data.markets))throw new Error('Invalid format');
  const all=[...(data.markets||[]),...(data.commodities||[]),...(data.forex||[]),...(data.crypto||[])];
  state.quotes=Object.fromEntries(all.filter(x=>x&&x.id&&ASSET_BY_ID[x.id]).map(x=>[x.id,x]));
  state.feedTime=data.generatedAt||null;
  state.feedError=false;state.loading=false;
  if(isManual)toast('Snapshot dei mercati ricaricato.');
 }catch(e){state.feedError=true;state.loading=false;if(isManual)toast('Impossibile ricaricare il feed.');}
 render();
 if(state.dialogId)refreshDialog();
}
function findAssets(term){
 const needle=term.trim().toLowerCase();
 if(needle.length<1)return [];
 return ASSETS.filter(a=>(a.name+' '+a.symbol+' '+a.short+' '+(a.country||'')).toLowerCase().includes(needle)).slice(0,9);
}
function updateSearch(){
 const input=$('#searchInput'),menu=$('#searchMenu'),matches=findAssets(input.value);
 state.searchResults=matches;
 if(!matches.length){menu.hidden=true;input.setAttribute('aria-expanded','false');return}
 menu.innerHTML=matches.map(a=>'<button type="button" data-asset="'+a.id+'"><span><strong>'+esc(a.name)+'</strong><small>'+esc(a.group.toUpperCase()+' · '+a.symbol)+'</small></span><span class="'+classArrow(a.id)+'">'+assetValue(a)+'</span></button>').join('');
 menu.hidden=false;input.setAttribute('aria-expanded','true');
}
function loadWorldShape(){
 if(loadWorldShape.started)return;loadWorldShape.started=true;
 fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('topo');return r.json()}).then(data=>{
  if(!data.arcs||!data.objects||!data.objects.land||!data.transform)return;
  const tr=data.transform;
  const resolveArc=n=>{
   let x=0,y=0;
   const raw=data.arcs[n>=0?n:~n]||[];
   const coords=raw.map(v=>{x+=v[0];y+=v[1];return [x*tr.scale[0]+tr.translate[0],y*tr.scale[1]+tr.translate[1]]});
   return n>=0?coords:coords.reverse();
  };
  const pathRing=ring=>{
   let pts=[];ring.forEach((idx,i)=>{const line=resolveArc(idx);pts.push(...(i?line.slice(1):line))});
   if(pts.length<3)return '';
   return pts.map(([lon,lat],i)=>{const p=coord(lon,lat);return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' ')+'Z';
  };
  const out=[];
  const poly=p=>p.map(pathRing).join(' ');
  const geom=g=>{if(g.type==='Polygon')out.push(poly(g.arcs));else if(g.type==='MultiPolygon')g.arcs.forEach(p=>out.push(poly(p)));else if(g.type==='GeometryCollection')g.geometries.forEach(geom)};
  geom(data.objects.land);
  if(out.length){state.land=out.map(d=>'<path class="land" d="'+d+'"/>').join('');const land=$('#landGroup');if(land)land.innerHTML=state.land;}
 }).catch(()=>{});
}
function externalUrl(a){
 return 'https://finance.yahoo.com/quote/'+encodeURIComponent(a.symbol)+'/';
}
function openAsset(id){
 const a=ASSET_BY_ID[id];if(!a)return;
 state.dialogId=id;state.chartShift=0;state.chartHover=null;
 refreshDialog();
 const dlg=$('#assetDialog');if(!dlg.open)dlg.showModal();
 requestAnimationFrame(drawChart);
}
function closeAsset(){
 const dlg=$('#assetDialog');if(dlg.open)dlg.close();state.dialogId=null;state.chartHover=null;
}
function refreshDialog(){
 const a=ASSET_BY_ID[state.dialogId];if(!a)return;
 const q=quote(a.id),isWatch=state.watch.includes(a.id);
 $('#dialogTitle').textContent=a.name;
 $('#dialogCategory').textContent=a.group.toUpperCase()+' · '+a.symbol;
 $('#dialogSubtitle').textContent=a.where||'Quotazione di mercato';
 $('#dialogWatch').textContent=(isWatch?'★ Rimuovi dalla Watchlist':'☆ Aggiungi alla Watchlist');
 const candleAvailable=q&&Array.isArray(q.candles)&&q.candles.length>=20;
 const lineAvailable=q&&Array.isArray(q.history)&&q.history.length>1;
 $('#dialogBody').innerHTML='<div class="dialog-stats"><strong>'+assetValue(a)+'</strong><span class="change '+classArrow(a.id)+'">'+pct(q&&q.change)+'</span><span class="dialog-meta">Ultima quotazione: '+esc(refTime(a.id))+'</span></div>'+
 '<div class="chart-toolbar"><div class="chart-legend"><span><i style="background:#74b2ff"></i>EMA 12</span><span><i style="background:#f1ba55"></i>EMA 26</span><span><i style="background:#b382ee"></i>EMA 50</span><span><i style="background:#ef7192"></i>EMA 200</span></div><span class="badge">'+(candleAvailable?'Candele · 1D':lineAvailable?'Storico prezzi':'Storico non disponibile')+'</span></div>'+
 '<div class="chart-frame"><canvas id="detailChart" width="900" height="470" role="img" aria-label="Grafico di '+esc(a.name)+', medie mobili e indicatori" tabindex="0"></canvas></div>'+
 '<div class="chart-toolbar"><div class="chart-legend"><span>RSI (14)</span><span>Stochastic RSI (14/14/3/3)</span><span>MACD (12/26/9)</span></div>'+
 '<div><button class="btn btn-small" type="button" data-pan="-20">◀ Storico</button> <button class="btn btn-small" type="button" data-pan="20">Recenti ▶</button> <button class="btn btn-small" type="button" data-pan="reset">Oggi</button></div></div>'+
 '<div class="chart-help">Trascina il grafico in orizzontale per scorrere lo storico. Nessuno zoom. Le medie e gli indicatori sono mostrati solo quando le serie contengono dati sufficienti.</div>'+
 '<div class="chart-source"><span>Fonte: '+(a.group==='crypto'?'CoinGecko (prezzo), Yahoo Finance (storico quando disponibile)':'Yahoo Finance')+' · quotazioni anche ritardate.</span>'+
 '<a href="'+esc(externalUrl(a))+'" target="_blank" rel="noopener noreferrer">Apri fonte '+sym('external')+'</a></div>';
 requestAnimationFrame(drawChart);
}
function toggleWatch(id){
 if(!ASSET_BY_ID[id])return;
 const i=state.watch.indexOf(id);
 if(i<0){state.watch.push(id);toast('Aggiunto alla watchlist.');}else{state.watch.splice(i,1);toast('Rimosso dalla watchlist.');}
 save('watch',state.watch);
 if(state.dialogId)refreshDialog();
 if(state.page==='watchlist'||state.page==='home')render();
}
function getCandles(id){
 const q=quote(id);
 if(q&&Array.isArray(q.candles)&&q.candles.length){
  return q.candles.map(x=>({t:x.t,o:Number(x.o),h:Number(x.h),l:Number(x.l),c:Number(x.c)})).filter(x=>[x.o,x.h,x.l,x.c].every(num)&&x.h>=x.l&&x.h>0);
 }
 if(q&&Array.isArray(q.history))return q.history.filter(num).map((c,i)=>({t:i,o:c,h:c,l:c,c}));
 return [];
}
function ema(values,length){
 const arr=Array(values.length).fill(null);if(values.length<length)return arr;
 let start=0;
 while(start<values.length&&!num(values[start]))start++;
 let sum=0;
 for(let i=start;i<start+length&&i<values.length;i++){if(!num(values[i]))return arr;sum+=values[i];}
 if(start+length>values.length)return arr;
 let last=sum/length;arr[start+length-1]=last;
 const k=2/(length+1);
 for(let i=start+length;i<values.length;i++){if(!num(values[i]))continue;last=values[i]*k+last*(1-k);arr[i]=last;}
 return arr;
}
function sma(values,n){
 return values.map((_,i)=>{
  if(i+1<n)return null;
  const slice=values.slice(i-n+1,i+1);
  return slice.every(num)?slice.reduce((a,b)=>a+b,0)/n:null;
 });
}
function rsi(values,n=14){
 const out=Array(values.length).fill(null);if(values.length<n+1)return out;
 let gain=0,loss=0;
 for(let i=1;i<=n;i++){const diff=values[i]-values[i-1];gain+=Math.max(diff,0);loss+=Math.max(-diff,0);}
 gain/=n;loss/=n;
 out[n]=loss===0?100:100-100/(1+gain/loss);
 for(let i=n+1;i<values.length;i++){
  const diff=values[i]-values[i-1];
  gain=(gain*(n-1)+Math.max(diff,0))/n;
  loss=(loss*(n-1)+Math.max(-diff,0))/n;
  out[i]=loss===0?100:100-100/(1+gain/loss);
 }
 return out;
}
function stochRsi(rsiSeries,window=14,smoothK=3,smoothD=3){
 const base=rsiSeries.map((v,i)=>{
  if(i<window-1||!num(v))return null;
  const lookback=rsiSeries.slice(i-window+1,i+1);
  if(!lookback.every(num))return null;
  const lo=Math.min(...lookback),hi=Math.max(...lookback);
  return hi===lo?50:(v-lo)/(hi-lo)*100;
 });
 const k=sma(base,smoothK),d=sma(k,smoothD);return {k,d};
}
function macd(values){
 const f=ema(values,12),s=ema(values,26);
 const line=values.map((_,i)=>num(f[i])&&num(s[i])?f[i]-s[i]:null);
 const signal=ema(line,9);
 return {line,signal,hist:line.map((v,i)=>num(v)&&num(signal[i])?v-signal[i]:null)};
}
const round=(x,n=2)=>x.toFixed(n);
function drawChart(){
 if(!state.dialogId)return;
 const canvas=$('#detailChart');if(!canvas||!canvas.isConnected)return;
 const q=quote(state.dialogId),candles=getCandles(state.dialogId),ctx=canvas.getContext('2d');if(!ctx)return;
 const rect=canvas.getBoundingClientRect();
 const width=Math.max(360,Math.floor(rect.width)),height=470,dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,width,height);
 const dark=state.theme==='dark',color=dark?'#9db4c8':'#536c82',grid=dark?'#173149':'#dbe3e8';
 ctx.fillStyle=dark?'#071523':'#f5f9fd';ctx.fillRect(0,0,width,height);
 const left=19,right=67,chartW=width-left-right,visible=Math.max(25,Math.min(100,Math.floor(chartW/9)));
 const maxShift=Math.max(0,candles.length-visible);
 state.chartShift=Math.max(0,Math.min(maxShift,state.chartShift));
 const start=Math.max(0,candles.length-visible-state.chartShift),end=Math.min(candles.length,start+visible),sample=candles.slice(start,end);
 const regions=[{top:13,bottom:221,label:'PRICE'},{top:237,bottom:305,label:'RSI (14)'},{top:317,bottom:385,label:'STOCH RSI'},{top:397,bottom:453,label:'MACD'}];
 function line(x1,y1,x2,y2,stroke,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
 function text(value,x,y,align='left',size=10){ctx.fillStyle=color;ctx.font=size+'px Inter,Segoe UI,Arial';ctx.textAlign=align;ctx.fillText(value,x,y);}
 for(const p of regions){
  for(let k=0;k<=3;k++){const y=p.top+(p.bottom-p.top)*k/3;line(left,y,width-right+4,y,grid,.6)}
  text(p.label,left+3,p.top+11,'left',9);
 }
 if(!sample.length){text('Storico non disponibile da fonte dati.',width/2,130,'center',13);return;}
 const ix=i=>left+(i-start+.5)*chartW/sample.length;
 const closes=candles.map(x=>x.c);
 const emaSets=[{values:ema(closes,12),color:'#6fb2ff'},{values:ema(closes,26),color:'#f1b954'},{values:ema(closes,50),color:'#b18aff'},{values:ema(closes,200),color:'#e96798'}];
 const lows=sample.map(x=>x.l),highs=sample.map(x=>x.h);
 emaSets.forEach(a=>a.values.slice(start,end).forEach(v=>{if(num(v)){lows.push(v);highs.push(v)}}));
 const lo=Math.min(...lows),hi=Math.max(...highs),pad=(hi-lo||Math.max(hi*.03,1))*.07;
 const min=lo-pad,max=hi+pad;
 const yPrice=v=>regions[0].bottom-(v-min)/(max-min)*(regions[0].bottom-regions[0].top);
 const step=chartW/sample.length,cw=Math.max(2,Math.min(9,step*.58));
 if(candles.length>1&&q&&Array.isArray(q.candles)&&q.candles.length>8){
  sample.forEach((c,i)=>{
   const x=ix(start+i),up=c.c>=c.o;
   const colorC=up?'#18df9d':'#f75d72';
   line(x,yPrice(c.h),x,yPrice(c.l),colorC,1);
   ctx.fillStyle=colorC;const top=yPrice(Math.max(c.o,c.c)),bottom=yPrice(Math.min(c.o,c.c));
   ctx.fillRect(x-cw/2,top,cw,Math.max(1,bottom-top));
  });
 }else{
  ctx.beginPath();sample.forEach((c,i)=>{const x=ix(start+i),y=yPrice(c.c);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
  ctx.strokeStyle='#25dbab';ctx.lineWidth=1.8;ctx.stroke();
 }
 emaSets.forEach(a=>{
  ctx.beginPath();let started=false;
  for(let i=start;i<end;i++){
   const v=a.values[i];if(!num(v)){started=false;continue}
   const x=ix(i),y=yPrice(v);
   if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
  }
  ctx.strokeStyle=a.color;ctx.lineWidth=1.6;ctx.stroke();
 });
 for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;text(v.toLocaleString('it-IT',{maximumFractionDigits:Math.abs(v)>=10?1:3}),width-right+7,yPrice(v)+4,'left',10)}
 const rsiValues=rsi(closes,14),st=stochRsi(rsiValues),m=macd(closes);
 const drawIndicator=(values,yMap,stroke,widthLine=1.35)=>{
  ctx.beginPath();let started=false;
  for(let i=start;i<end;i++){
   const v=values[i];if(!num(v)){started=false;continue}
   const x=ix(i),y=yMap(v);
   if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
  }
  ctx.strokeStyle=stroke;ctx.lineWidth=widthLine;ctx.stroke();
 };
 const mapOsc=(v,p)=>p.bottom-(Math.max(0,Math.min(100,v))/100)*(p.bottom-p.top-6)-3;
 drawIndicator(rsiValues,v=>mapOsc(v,regions[1]),'#c68ef0');
 drawIndicator(st.k,v=>mapOsc(v,regions[2]),'#56b8fa');
 drawIndicator(st.d,v=>mapOsc(v,regions[2]),'#f0c264');
 const macdVals=[...m.line.slice(start,end),...m.signal.slice(start,end),...m.hist.slice(start,end)].filter(num);
 const maxMacd=Math.max(0.001,...macdVals.map(Math.abs));
 const yMac=v=>(regions[3].top+regions[3].bottom)/2-v/maxMacd*(regions[3].bottom-regions[3].top)*.42;
 line(left,yMac(0),width-right,yMac(0),grid,1);
 for(let i=start;i<end;i++){
  const v=m.hist[i];if(!num(v))continue;
  const x=ix(i),y=yMac(v),zero=yMac(0);
  ctx.fillStyle=v>=0?'#13866e':'#b34c60';ctx.fillRect(x-cw/2,Math.min(y,zero),cw,Math.max(1,Math.abs(y-zero)));
 }
 drawIndicator(m.line,yMac,'#7bb9ff');
 drawIndicator(m.signal,yMac,'#efb55e');
 line(left,mapOsc(70,regions[1]),width-right,mapOsc(70,regions[1]),'#a2686c',.6);
 line(left,mapOsc(30,regions[1]),width-right,mapOsc(30,regions[1]),'#597c80',.6);
 line(left,mapOsc(80,regions[2]),width-right,mapOsc(80,regions[2]),'#a2686c',.6);
 line(left,mapOsc(20,regions[2]),width-right,mapOsc(20,regions[2]),'#597c80',.6);
 for(let i=0;i<=4;i++){
  const idx=Math.floor(start+(Math.max(0,sample.length-1))*i/4),c=candles[idx];if(!c)continue;
  const d=typeof c.t==='number'&&c.t>1e9?localeDate(c.t*1000,{month:'short',day:'2-digit'}):'−'+(candles.length-idx)+'g';
  text(d,ix(idx),465,'center',9);
 }
 if(num(state.chartHover)&&state.chartHover>=start&&state.chartHover<end){
  const c=candles[state.chartHover],x=ix(state.chartHover);line(x,regions[0].top,x,regions[3].bottom,'#a0c7d2',.8);
  const tooltip=([c.o,c.h,c.l,c.c].map(v=>v.toLocaleString('it-IT',{maximumFractionDigits:3})));
  const tx=Math.max(35,Math.min(width-250,x-100));
  ctx.fillStyle=dark?'#183046':'#e2eef7';ctx.fillRect(tx,14,228,37);
  text('O '+tooltip[0]+'  H '+tooltip[1],tx+8,28,'left',10);
  text('L '+tooltip[2]+'  C '+tooltip[3],tx+8,43,'left',10);
 }
 if(closes.length<205){text('EMA 200: storico insufficiente',width-right-9,26,'right',9)}
}
function setupCanvasInteractions(){
 const dlg=$('#assetDialog');
 dlg.addEventListener('pointerdown',e=>{
  if(e.target.id!=='detailChart')return;
  const can=e.target;
  can.setPointerCapture(e.pointerId);
  can.dataset.downX=String(e.clientX);can.dataset.startShift=String(state.chartShift);
 });
 dlg.addEventListener('pointermove',e=>{
  if(e.target.id!=='detailChart')return;
  const can=e.target;
  const width=can.getBoundingClientRect().width;
  const candles=getCandles(state.dialogId);
  const visible=Math.max(25,Math.min(100,Math.floor((Math.max(360,width)-86)/9)));
  const start=Math.max(0,candles.length-visible-state.chartShift);
  const relative=(e.clientX-can.getBoundingClientRect().left)/width;
  const idx=Math.floor(start+relative*visible);
  state.chartHover=Math.max(0,Math.min(candles.length-1,idx));
  if(can.hasPointerCapture(e.pointerId)){
   const moved=e.clientX-Number(can.dataset.downX||e.clientX);
   const begin=Number(can.dataset.startShift)||0;
   state.chartShift=Math.max(0,Math.min(Math.max(0,candles.length-visible),Math.round(begin+moved/Math.max(5,width/visible))));
  }
  drawChart();
 });
 dlg.addEventListener('pointerleave',e=>{if(e.target.id==='detailChart'){state.chartHover=null;drawChart()}},true);
 dlg.addEventListener('wheel',e=>{if(e.target.id==='detailChart')e.preventDefault()},{passive:false});
}
function setupEvents(){
 $$('.side-link[data-page]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.page)));
 $('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
 $('#themeToggle').addEventListener('click',()=>setTheme(state.theme==='dark'?'light':'dark'));
 $('#profileButton').addEventListener('click',()=>navigate('settings'));
 $('#notificationsButton').addEventListener('click',()=>navigate('alerts'));
 $('#searchInput').addEventListener('input',updateSearch);
 $('#searchInput').addEventListener('keydown',e=>{
  if(e.key==='Escape'){$('#searchMenu').hidden=true;$('#searchInput').setAttribute('aria-expanded','false')}
  if(e.key==='Enter'&&state.searchResults.length){e.preventDefault();openAsset(state.searchResults[0].id);$('#searchMenu').hidden=true}
 });
 document.addEventListener('click',e=>{
  const searchItem=e.target.closest('#searchMenu [data-asset]');
  if(searchItem){openAsset(searchItem.dataset.asset);$('#searchMenu').hidden=true;$('#searchInput').value='';return;}
  if(!e.target.closest('.search-wrap'))$('#searchMenu').hidden=true;
  if(e.target.closest('#sidebar')||e.target.closest('#menuToggle'))return;
  if($('#sidebar').classList.contains('open'))$('#sidebar').classList.remove('open');
 });
 $('#pageContainer').addEventListener('click',e=>{
  const btn=e.target.closest('button,a,tr[data-asset]');
  if(!btn)return;
  if(btn.dataset.asset){openAsset(btn.dataset.asset);return;}
  if(btn.dataset.region){selectRegion(btn.dataset.region);return;}
  if(btn.dataset.page){if(btn.dataset.category)state.marketFilter=btn.dataset.category;navigate(btn.dataset.page);return;}
  if(btn.dataset.filter){state.marketFilter=btn.dataset.filter;render();return;}
  if(btn.dataset.refresh){fetchQuotes(true);return;}
  if(btn.dataset.toggleTheme){setTheme(state.theme==='dark'?'light':'dark');return;}
  if(btn.dataset.deleteHolding!=null){state.holdings.splice(Number(btn.dataset.deleteHolding),1);save('holdings',state.holdings);render();return;}
  if(btn.dataset.deleteAlert!=null){state.alerts.splice(Number(btn.dataset.deleteAlert),1);save('alerts',state.alerts);render();return;}
 });
 $('#pageContainer').addEventListener('keydown',e=>{if(e.key==='Enter'){const tr=e.target.closest('tr[data-asset]');if(tr)openAsset(tr.dataset.asset)}});
 $('#pageContainer').addEventListener('input',e=>{
  if(e.target.id==='marketSearch'){
   const target=e.target,cursor=target.selectionStart;
   state.marketSearch=target.value;
   const rows=$('#marketRows');
   if(rows)rows.innerHTML=tableForAssets(ASSETS.filter(a=>(state.marketFilter==='all'||a.group===state.marketFilter)&&
    (a.name+' '+a.symbol+' '+a.country).toLowerCase().includes(state.marketSearch.trim().toLowerCase())),'Nessun risultato');
   try{target.setSelectionRange(cursor,cursor)}catch(err){}
  }
 });
 $('#pageContainer').addEventListener('submit',e=>{
  if(e.target.id==='portfolioForm'){
   e.preventDefault();
   const form=new FormData(e.target),id=String(form.get('id')),qty=Number(form.get('qty')),cost=Number(form.get('cost'));
   if(!ASSET_BY_ID[id]||!num(qty)||qty<=0||!num(cost)||cost<0){toast('Inserisci quantità e prezzo validi.');return;}
   state.holdings.push({id,qty,cost});save('holdings',state.holdings);render();toast('Posizione salvata sul dispositivo.');
  }
  if(e.target.id==='alertForm'){
   e.preventDefault();
   const form=new FormData(e.target),id=String(form.get('id')),operator=String(form.get('operator')),value=Number(form.get('value'));
   if(!ASSET_BY_ID[id]||!['above','below'].includes(operator)||!num(value)||value<=0){toast('Inserisci una soglia valida.');return;}
   state.alerts.push({id,operator,value});save('alerts',state.alerts);render();toast('Alert locale salvato.');
  }
 });
 $('#closeDialog').addEventListener('click',closeAsset);
 $('#assetDialog').addEventListener('click',e=>{if(e.target===$('#assetDialog'))closeAsset();const btn=e.target.closest('[data-pan]');if(btn){if(btn.dataset.pan==='reset')state.chartShift=0;else state.chartShift+=Number(btn.dataset.pan);drawChart();}});
 $('#assetDialog').addEventListener('close',()=>{state.dialogId=null;state.chartHover=null});
 $('#dialogWatch').addEventListener('click',()=>state.dialogId&&toggleWatch(state.dialogId));
 setupCanvasInteractions();
 window.addEventListener('resize',()=>{if(state.dialogId)requestAnimationFrame(drawChart)});
 window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)fetchQuotes()});
}
function init(){
 setupEvents();setTheme(state.theme);updateClock();
 setInterval(updateClock,30000);
 render();
 fetchQuotes();
 setInterval(()=>{if(!document.hidden)fetchQuotes()},300000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();