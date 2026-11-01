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
{id:'jse',name:'FTSE/JSE All Share',short:'JSE All Share',group:'markets',symbol:'^J203.JO',country:'Sudafrica',where:'Johannesburg · Sudafrica'},
{id:'tadawul',name:'Tadawul All Share',short:'Tadawul',group:'markets',symbol:'^TASI.SR',country:'Arabia Saudita',where:'Riyadh · Arabia Saudita'},
{id:'nikkei',name:'Nikkei 225',short:'NIKKEI 225',group:'markets',symbol:'^N225',country:'Giappone',where:'Tokyo · Giappone'},
{id:'hsi',name:'Hang Seng',short:'Hang Seng',group:'markets',symbol:'^HSI',country:'Hong Kong',where:'Hong Kong'},
{id:'nifty',name:'Nifty 50',short:'Nifty 50',group:'markets',symbol:'^NSEI',country:'India',where:'Mumbai · India'},
{id:'kospi',name:'KOSPI',short:'KOSPI',group:'markets',symbol:'^KS11',country:'Corea del Sud',where:'Seul · Corea del Sud'},
{id:'asx',name:'S&P/ASX 200',short:'ASX 200',group:'markets',symbol:'^AXJO',country:'Australia',where:'Sydney · Australia'},
{id:'ndx',name:'Nasdaq-100',short:'NASDAQ 100',group:'markets',symbol:'^NDX',country:'USA',sector:'tech',where:'Borsa USA'},
{id:'sox',name:'PHLX Semiconductor Index',short:'SOX · Chip',group:'markets',symbol:'^SOX',country:'USA',sector:'tech',where:'Borsa USA'},
{id:'xlk',name:'Technology Select Sector SPDR (ETF)',short:'XLK · Tech',group:'markets',symbol:'XLK',country:'USA',sector:'tech',where:'Borsa USA'},
{id:'qqq',name:'Invesco QQQ (ETF)',short:'QQQ · Nasdaq',group:'markets',symbol:'QQQ',country:'USA',sector:'tech',where:'Borsa USA'},
{id:'smh',name:'VanEck Semiconductor (ETF)',short:'SMH · Chip',group:'markets',symbol:'SMH',country:'USA',sector:'tech',where:'Borsa USA'},
{id:'nvda',name:'NVIDIA',short:'NVIDIA',group:'bigtech',symbol:'NVDA',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'msft',name:'Microsoft',short:'Microsoft',group:'bigtech',symbol:'MSFT',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'aapl',name:'Apple',short:'Apple',group:'bigtech',symbol:'AAPL',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'googl',name:'Alphabet (Google)',short:'Alphabet (Google)',group:'bigtech',symbol:'GOOGL',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'amzn',name:'Amazon',short:'Amazon',group:'bigtech',symbol:'AMZN',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'meta',name:'Meta Platforms',short:'Meta Platforms',group:'bigtech',symbol:'META',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'tsla',name:'Tesla',short:'Tesla',group:'bigtech',symbol:'TSLA',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'avgo',name:'Broadcom',short:'Broadcom',group:'bigtech',symbol:'AVGO',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'amd',name:'AMD',short:'AMD',group:'bigtech',symbol:'AMD',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'orcl',name:'Oracle',short:'Oracle',group:'bigtech',symbol:'ORCL',country:'USA',sector:'bigtech',where:'Mercato azionario'},
{id:'tsm',name:'TSMC',short:'TSMC',group:'bigtech',symbol:'TSM',country:'Taiwan',sector:'bigtech',where:'Mercato azionario'},
{id:'asml',name:'ASML',short:'ASML',group:'bigtech',symbol:'ASML',country:'Paesi Bassi',sector:'bigtech',where:'Mercato azionario'},
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
{id:'inj',name:'Injective (INJ)',short:'Injective',group:'crypto',symbol:'INJ-USD',icon:'∿',currency:'USD'},
{id:'ore',name:'ORE Protocol (ORE)',short:'ORE Protocol',group:'crypto',symbol:'ORE',icon:'⛏',currency:'USD',coingeckoId:'ore',network:'Solana'},
{id:'ada',name:'Cardano (ADA)',short:'Cardano',group:'crypto',symbol:'ADA-USD',icon:'₳',currency:'USD',coingeckoId:'cardano'},
{id:'avax',name:'Avalanche (AVAX)',short:'Avalanche',group:'crypto',symbol:'AVAX-USD',icon:'▲',currency:'USD',coingeckoId:'avalanche-2'},
{id:'link',name:'Chainlink (LINK)',short:'Chainlink',group:'crypto',symbol:'LINK-USD',icon:'⬡',currency:'USD',coingeckoId:'chainlink'},
{id:'dot',name:'Polkadot (DOT)',short:'Polkadot',group:'crypto',symbol:'DOT-USD',icon:'●',currency:'USD',coingeckoId:'polkadot'},
{id:'trx',name:'TRON (TRX)',short:'TRON',group:'crypto',symbol:'TRX-USD',icon:'△',currency:'USD',coingeckoId:'tron'},
{id:'ton',name:'Toncoin (TON)',short:'Toncoin',group:'crypto',symbol:'TON-USD',icon:'◇',currency:'USD',coingeckoId:'the-open-network'},
{id:'sui',name:'Sui (SUI)',short:'Sui',group:'crypto',symbol:'SUI-USD',icon:'◈',currency:'USD',coingeckoId:'sui'},
{id:'ltc',name:'Litecoin (LTC)',short:'Litecoin',group:'crypto',symbol:'LTC-USD',icon:'Ł',currency:'USD',coingeckoId:'litecoin'},
{id:'bch',name:'Bitcoin Cash (BCH)',short:'Bitcoin Cash',group:'crypto',symbol:'BCH-USD',icon:'₿',currency:'USD',coingeckoId:'bitcoin-cash'},
{id:'xlm',name:'Stellar (XLM)',short:'Stellar',group:'crypto',symbol:'XLM-USD',icon:'✦',currency:'USD',coingeckoId:'stellar'},
{id:'hbar',name:'Hedera (HBAR)',short:'Hedera',group:'crypto',symbol:'HBAR-USD',icon:'ℏ',currency:'USD',coingeckoId:'hedera-hashgraph'},
{id:'near',name:'NEAR Protocol (NEAR)',short:'NEAR',group:'crypto',symbol:'NEAR-USD',icon:'N',currency:'USD',coingeckoId:'near'},
{id:'apt',name:'Aptos (APT)',short:'Aptos',group:'crypto',symbol:'APT-USD',icon:'A',currency:'USD',coingeckoId:'aptos'},
{id:'atom',name:'Cosmos (ATOM)',short:'Cosmos',group:'crypto',symbol:'ATOM-USD',icon:'⚛',currency:'USD',coingeckoId:'cosmos'},
{id:'uni',name:'Uniswap (UNI)',short:'Uniswap',group:'crypto',symbol:'UNI-USD',icon:'U',currency:'USD',coingeckoId:'uniswap'},
{id:'aave',name:'Aave (AAVE)',short:'Aave',group:'crypto',symbol:'AAVE-USD',icon:'A',currency:'USD',coingeckoId:'aave'},
{id:'arb',name:'Arbitrum (ARB)',short:'Arbitrum',group:'crypto',symbol:'ARB-USD',icon:'◉',currency:'USD',coingeckoId:'arbitrum'},
{id:'op',name:'Optimism (OP)',short:'Optimism',group:'crypto',symbol:'OP-USD',icon:'OP',currency:'USD',coingeckoId:'optimism'},
{id:'shib',name:'Shiba Inu (SHIB)',short:'Shiba Inu',group:'crypto',symbol:'SHIB-USD',icon:'S',currency:'USD',coingeckoId:'shiba-inu'},
{id:'pepe',name:'Pepe (PEPE)',short:'Pepe',group:'crypto',symbol:'PEPE-USD',icon:'P',currency:'USD',coingeckoId:'pepe'},
{id:'render',name:'Render (RENDER)',short:'Render',group:'crypto',symbol:'RENDER-USD',icon:'R',currency:'USD',coingeckoId:'render-token'},
{id:'ray',name:'Raydium (RAY)',short:'Raydium',group:'crypto',symbol:'RAY-USD',icon:'R',currency:'USD',coingeckoId:'raydium'},
{id:'lunc',name:'Terra Luna Classic (LUNC)',short:'Luna Classic',group:'crypto',symbol:'LUNC-USD',icon:'L',currency:'USD',coingeckoId:'terra-luna'},
{id:'vra',name:'Verasity (VRA)',short:'Verasity',group:'crypto',symbol:'VRA-USD',icon:'V',currency:'USD',coingeckoId:'verasity'},
{id:'wlfi',name:'World Liberty Financial (WLFI)',short:'WLFI',group:'crypto',symbol:'WLFI-USD',icon:'W',currency:'USD',coingeckoId:'world-liberty-financial'},
{id:'hot',name:'Holo (HOT)',short:'Holo',group:'crypto',symbol:'HOT-USD',icon:'H',currency:'USD',coingeckoId:'holotoken'},
{id:'ksm',name:'Kusama (KSM)',short:'Kusama',group:'crypto',symbol:'KSM-USD',icon:'K',currency:'USD',coingeckoId:'kusama'},
{id:'wld',name:'Worldcoin (WLD)',short:'Worldcoin',group:'crypto',symbol:'WLD-USD',icon:'W',currency:'USD',coingeckoId:'worldcoin-wld'},
{id:'fet',name:'Fetch.ai / Artificial Superintelligence Alliance (FET)',short:'Fetch.ai (FET)',group:'crypto',symbol:'FET-USD',icon:'F',currency:'USD',coingeckoId:'fetch-ai'},
{id:'orai',name:'Oraichain (ORAI)',short:'Oraichain',group:'crypto',symbol:'ORAI-USD',icon:'O',currency:'USD',coingeckoId:'oraichain-token'},
{id:'tai',name:'TARS AI (TAI)',short:'TARS AI',group:'crypto',symbol:'TAI-USD',icon:'T',currency:'USD',coingeckoId:'tars-protocol'},
{id:'virtual',name:'Virtuals Protocol (VIRTUAL)',short:'Virtuals Protocol',group:'crypto',symbol:'VIRTUAL-USD',icon:'V',currency:'USD',coingeckoId:'virtual-protocol'},
{id:'tao',name:'Bittensor (TAO)',short:'Bittensor',group:'crypto',symbol:'TAO-USD',icon:'τ',currency:'USD',coingeckoId:'bittensor'},
{id:'luna',name:'Terra (LUNA)',short:'Terra 2.0',group:'crypto',symbol:'LUNA-USD',icon:'L',currency:'USD',coingeckoId:'terra-luna-2'}
];
const ASSET_BY_ID=Object.fromEntries(ASSETS.map(a=>[a.id,a]));
const TECH_IDS=["ndx","sox","xlk","qqq","smh"];
const BIGTECH_IDS=["nvda","msft","aapl","googl","amzn","meta","tsla","avgo","amd","orcl","tsm","asml"];
const SECTIONS={
home:['Home','La tua panoramica dei mercati e degli strumenti.'],
global:['Global','Global market data across every region, market and asset class.'],
markets:['Markets','Prezzi, variazioni, grafici e mercati mondiali.'],
watchlist:['Watchlist','I mercati che vuoi seguire, salvati sul tuo dispositivo.'],
portfolio:['Portfolio','Tieni traccia delle posizioni inserite manualmente.'],
news:['News','Accesso rapido a fonti finanziarie verificabili.'],
analytics:['Analytics','Indicatori e andamento dei principali mercati mondiali.'],
orderbook:['Order Book','Ordini Spot di acquisto e vendita delle criptovalute.'],
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
{group:'crypto',title:'Crypto',icon:'🌐',ids:ASSETS.filter(a=>a.group==='crypto').map(a=>a.id)}
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
const deviceThemeQuery=typeof window.matchMedia==='function'?window.matchMedia('(prefers-color-scheme: dark)'):null;
const THEME_NAMES={light:'Chiaro',dark:'Scuro',ocean:'Oceano',emerald:'Smeraldo',violet:'Viola'};
function resolvedTheme(mode){
 if(mode==='auto')return deviceThemeQuery&&deviceThemeQuery.matches?'dark':'light';
 return Object.hasOwn(THEME_NAMES,mode)?mode:'dark';
}
const state={
 page:(location.hash||'#global').slice(1).toLowerCase(),quotes:{},feedTime:null,feedError:false,loading:true,
 watch:Array.isArray(load('watch',[]))?load('watch',[]):[],
 holdings:Array.isArray(load('holdings',[]))?load('holdings',[]):[],
 alerts:Array.isArray(load('alerts',[]))?load('alerts',[]):[],
 theme:load('theme','dark'),themeMode:load('themeMode',load('theme','dark')),clickSound:load('clickSound',true),clickVolume:load('clickVolume',70),brightness:load('brightness',100),adaptiveBrightness:load('adaptiveBrightness',false)===true,region:null,marketFilter:'all',marketSearch:'',dialogId:null,chartShift:0,chartHover:null,
 land:'',searchResults:[],errorText:'',cryptoExpanded:false,
 solarLastRoot:null,solarLastUpdate:0,solarLastStatus:0
};
if(!SECTIONS[state.page])state.page='global';
if(!(state.themeMode==='auto'||Object.hasOwn(THEME_NAMES,state.themeMode)))state.themeMode='dark';
state.theme=resolvedTheme(state.themeMode);
state.clickSound=state.clickSound!==false;
state.clickVolume=Number.isFinite(Number(state.clickVolume))?Math.min(100,Math.max(0,Math.round(Number(state.clickVolume)))):70;
state.brightness=Number.isFinite(Number(state.brightness))?Math.min(100,Math.max(0,Math.round(Number(state.brightness)))):100;
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
 const digits=Math.abs(v)<0.00001?10:Math.abs(v)<0.001?8:Math.abs(v)<0.1?6:Math.abs(v)<1?5:Math.abs(v)<10?3:2;
 return (a&&(a.group==='crypto'||a.group==='commodities'||a.group==='bigtech')?'$':'')+v.toLocaleString('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits});
};
const assetValue=a=>formatValue(quote(a.id)&&quote(a.id).value,a);
const refTime=id=>quote(id)&&quote(id).time?localeDate(quote(id).time,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Non disponibile';
const classArrow=id=>trendClass(change(id));
function sparkLine(id,width=120,height=32){
 const q=quote(id),candles=q&&q.candles,values=Array.isArray(candles)&&candles.length>2?candles.slice(-26).map(x=>x.c):q&&Array.isArray(q.history)?q.history:[];
 let arr=values.map(Number).filter(num);
 // Tadawul's historic feed can contain just one closing price. If the quote
 // includes a verified session percentage, recover the prior close mathematically
 // and draw the real last-session movement, not a simulated price series.
 if(id==='tadawul'&&arr.length<2&&q&&num(q.value)&&num(q.change)&&q.change>-99.9){
  const previous=q.value/(1+q.change/100);
  if(num(previous)&&previous>0)arr=[previous,q.value];
 }
 if(arr.length<2)return '<svg class="spark" aria-hidden="true" viewBox="0 0 '+width+' '+height+'"><path d="M 4 '+height/2+' L '+(width-4)+' '+height/2+'" stroke="currentColor" opacity=".35" stroke-dasharray="2 4" fill="none"/></svg>';
 const min=Math.min(...arr),max=Math.max(...arr),range=Math.max(max-min,Math.abs(max)*.002,1e-8);
 const points=arr.map((v,i)=>[(4+i*(width-8)/(arr.length-1)),(height-5-(v-min)/range*(height-10))]);
 const path=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
 return '<svg class="spark" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function meanRegion(r){
 const changes=r.ids.map(change).filter(num);
 return changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:null;
}
function regionLastQuoteLabel(r){
 const a=ASSET_BY_ID[r.lead],q=quote(r.lead);
 if(!a)return 'Indice non disponibile';
 const date=q&&q.time?safeDate(q.time):null;
 const last=date?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}).format(date):'non disponibile';
 return a.short+' · ultima quotazione: '+last+(q&&q.change!=null?' · '+pct(q.change):'');
}
function meanPrice(r){const a=ASSET_BY_ID[r.lead];return a?assetValue(a):'—';}
function selectRegion(id){state.region=state.region===id?null:id;render();const map=$('#worldMap');if(map)map.scrollIntoView({block:'nearest',behavior:'smooth'});}
function indexCard(id){
 const a=ASSET_BY_ID[id],q=quote(id),tr=trend(q&&q.change);
 return '<button class="index-mini panel" type="button" data-asset="'+esc(id)+'" data-trend="'+tr+'" aria-label="Apri '+esc(a.name)+'">'+
 '<span class="mini-title'+(showAssetLogo(a)?' crypto-mini-title':'')+'">'+(showAssetLogo(a)?assetLogo(a):'')+'<span>'+esc(a.short)+'</span></span><span class="mini-price mono">'+assetValue(a)+'</span><span class="mini-country">'+esc(a.group==='crypto'?'Crypto':a.country||'')+'</span>'+
 '<b class="mini-change change">'+pct(q&&q.change)+'</b>'+sparkLine(id)+'</button>';
}
function geographicLegend(){return '<div class="map-legend"><span style="color:var(--green)"><i></i> Rialzo</span><span style="color:var(--red)"><i></i> Ribasso</span><span style="color:var(--muted)"><i></i> N/D</span></div>';}
const coord=(lon,lat)=>[(lon+180)/360*1000,(90-lat)/180*580];
function mapArc(a,b,red){
 const s=coord(...a.pin),e=coord(...b.pin),cx=(s[0]+e[0])/2,cy=(s[1]+e[1])/2-65;
 return '<path class="region-arc'+(red?' red':'')+'" d="M'+s.map(x=>x.toFixed(1)).join(' ')+' Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+e.map(x=>x.toFixed(1)).join(' ')+'"/>';
}
/* Earth day/night follows the real current UTC time using approximate NOAA solar coordinates.
   No accelerated or simulated day/night cycle. */
const SOLAR_RADIANS=Math.PI/180;
const SOLAR_DAY=86400000;
const SOLAR_CITY_POINTS=[
 [-122.4,37.8],[-118.2,34.1],[-74,40.7],[-87.6,41.9],[-99.1,19.4],
 [-79.4,43.7],[-46.6,-23.5],[-58.4,-34.6],[-0.13,51.5],[2.35,48.86],
 [8.68,50.11],[12.5,41.9],[13.4,52.5],[-3.7,40.4],[28,-26.2],
 [31.2,30],[28.9,41],[46.7,24.7],[55.3,25.2],[51.4,35.7],
 [72.9,19.1],[77.2,28.6],[90.4,23.8],[103.8,1.35],[100.5,13.75],
 [114.2,22.3],[121.5,31.2],[116.4,39.9],[126.9,37.5],[139.7,35.7],
 [135.5,34.7],[151.2,-33.9],[144.9,-37.8],[174.8,-36.9]
];
function solarStarsSvg(){
 let out='';
 const fract=n=>{const v=Math.sin(n*127.1+91.3)*43758.5453;return v-Math.floor(v)};
 for(let i=0;i<128;i++){
  const x=(fract(i*13+1)*1000).toFixed(1),y=(fract(i*13+2)*580).toFixed(1);
  const radius=(.35+fract(i*13+3)*.8).toFixed(2);
  const opacity=(.2+fract(i*13+4)*.42).toFixed(2);
  out+='<circle class="solar-star" cx="'+x+'" cy="'+y+'" r="'+radius+'" opacity="'+opacity+'" style="animation-delay:-'+(i%9*.7).toFixed(1)+'s"/>';
 }
 return out;
}
function solarNightCitiesSvg(){
 return SOLAR_CITY_POINTS.map(([lon,lat],i)=>{
  const c=coord(lon,lat),x=c[0].toFixed(1),y=c[1].toFixed(1);
  const small=(i%3)+1;
  return '<g class="solar-night-city" data-lon="'+lon+'" data-lat="'+lat+'" opacity="0">'+
   '<circle cx="'+x+'" cy="'+y+'" r="'+(4+small)+'" fill="#ffcb73" opacity=".40" filter="url(#city-glow)"/>'+
   '<circle cx="'+x+'" cy="'+y+'" r="'+(1.2+small*.16)+'" fill="#ffe6a1" opacity=".9"/>'+
   '<circle cx="'+(c[0]+3).toFixed(1)+'" cy="'+(c[1]-2).toFixed(1)+'" r=".65" fill="#ffd28d" opacity=".75"/>'+
   '</g>';
 }).join('');
}
function solarCoordinates(date){
 const year=date.getUTCFullYear(),month=date.getUTCMonth(),day=date.getUTCDate();
 const daysInYear=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/SOLAR_DAY;
 const dayOfYear=(Date.UTC(year,month,day)-Date.UTC(year,0,1))/SOLAR_DAY+1;
 const utcHour=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600+date.getUTCMilliseconds()/3600000;
 const gamma=2*Math.PI/daysInYear*(dayOfYear-1+(utcHour-12)/24);
 const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)
  -.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)
  -.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const eqtime=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)
  -.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const longitude=((180-(utcHour*60+eqtime)/4+540)%360)-180;
 return {lat:decl,lon:longitude};
}
function solarAltitudeSin(lon,lat,sun){
 const phi=lat*SOLAR_RADIANS;
 return Math.sin(phi)*Math.sin(sun.lat)+Math.cos(phi)*Math.cos(sun.lat)*Math.cos((lon-sun.lon)*SOLAR_RADIANS);
}
function solarTerminatorPath(sun,side='night',overshoot=0){
 const northSun=sun.lat>=0,night=side==='night';
 const includeBottom=night?northSun:!northSun;
 const curve=[];
 const sine=Math.sin(sun.lat),den=Math.abs(sine)<.001?(northSun?.001:-.001):sine;
 for(let x=0;x<=1000;x+=5){
  const lon=-180+x*.36,ha=(lon-sun.lon)*SOLAR_RADIANS;
  const latitude=Math.atan(-Math.cos(sun.lat)*Math.cos(ha)/den)/SOLAR_RADIANS;
  const y=Math.max(0,Math.min(580,(90-latitude)*580/180+(includeBottom?-overshoot:overshoot)));
  curve.push((x===0?'L':'L')+x+' '+y.toFixed(2));
 }
 return 'M0 '+(includeBottom?580:0)+' '+curve.join(' ')+' L1000 '+(includeBottom?580:0)+' Z';
}
function updateWorldSunlight(force=false){
 if(state.page!=='global'||document.hidden)return;
 const root=$('#worldMap');if(!root)return;
 const now=Date.now();
 const same=state.solarLastRoot===root;
 // Compute solar geometry every 10 seconds; show actual UTC time every second.
 if(force||!same||now-state.solarLastUpdate>=10000){
  const night=root.querySelector('#worldNightPath'),day=root.querySelector('#worldDayPath');
  const twilight=root.querySelector('#worldTwilightPath'),nightClip=root.querySelector('#worldNightClipPath');
  if(!night||!day||!twilight||!nightClip)return;
  const sun=solarCoordinates(new Date(now));
  const nightGeometry=solarTerminatorPath(sun,'night');
  night.setAttribute('d',nightGeometry);
  nightClip.setAttribute('d',nightGeometry);
  twilight.setAttribute('d',solarTerminatorPath(sun,'night',14));
  day.setAttribute('d',solarTerminatorPath(sun,'day'));
  const sunP=coord(sun.lon,sun.lat/SOLAR_RADIANS);
  const sunNode=root.querySelector('#worldSunMarker');
  if(sunNode)sunNode.setAttribute('transform','translate('+sunP[0].toFixed(2)+' '+sunP[1].toFixed(2)+')');
  root.querySelectorAll('.solar-night-city').forEach(city=>{
   const altitude=solarAltitudeSin(Number(city.dataset.lon),Number(city.dataset.lat),sun);
   const opacity=Math.max(0,Math.min(.97,(-altitude+.01)*6));
   city.setAttribute('opacity',opacity.toFixed(2));
  });
  state.solarLastRoot=root;
  state.solarLastUpdate=now;
 }
 if(force||!same||now-state.solarLastStatus>=950){
  const displayTime=new Intl.DateTimeFormat('it-IT',{
   timeZone:'UTC',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).format(new Date(now));
  const label=root.querySelector('#worldSolarStatus');
  if(label)label.textContent='● LIVE · Sole reale · '+displayTime+' UTC';
  const help=root.querySelector('#worldSolarHelp');
  if(help)help.textContent='Giorno e notte sincronizzati con la Terra · stima astronomica';
  state.solarLastStatus=now;
 }
}

function svgMap(){
 let graticule='';
 for(let lon=-150;lon<=150;lon+=30){const x=coord(lon,0)[0];graticule+='<path class="longitude" d="M'+x+' 0V580"/>';}
 for(let lat=-60;lat<=60;lat+=30){const y=coord(0,lat)[1];graticule+='<path class="latitude" d="M0 '+y+'H1000"/>';}
 const arcs=[[0,2],[2,5],[5,6],[2,3],[0,1],[5,4],[4,6]].map(([a,b])=>mapArc(REGIONS[a],REGIONS[b],num(meanRegion(REGIONS[b]))&&meanRegion(REGIONS[b])<0)).join('');
 const rand=n=>{const x=Math.sin(n*37.817+8.13)*43758.545;return x-Math.floor(x);};
 const lights=CITY_MARKETS.map(([lon,lat,id],marketIndex)=>{
  const t=trend(change(id)),color=t==='up'?'#20ecaa':t==='down'?'#ff6976':'#6e9eaf';
  let dots='';
  for(let i=0;i<28;i++){
   const n=marketIndex*151+i*3,p=coord(lon+(rand(n+3)-.5)*21,lat+(rand(n+7)-.5)*14);
   const radius=i%13===0?2.2:i%5===0?1.45:.7,opacity=i%13===0?.92:.26+rand(n+11)*.5;
   dots+='<circle class="market-light" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+radius+'" fill="'+color+'" opacity="'+opacity.toFixed(2)+'"/>';
  }
  const c=coord(lon,lat);
  return '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="17" fill="'+color+'" opacity=".15" filter="url(#city-glow)"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="3.4" fill="'+color+'"/>'+dots;
 }).join('');
 return '<svg class="map-svg" viewBox="0 0 1000 580" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mappa interattiva dei mercati mondiali">'+
 '<defs><radialGradient id="globeGrad"><stop offset="0" stop-color="#103b52"/><stop offset=".64" stop-color="#0a263b"/><stop offset="1" stop-color="#061524"/></radialGradient>'+
 '<radialGradient id="sunLightGlow"><stop stop-color="#ffe0a3" stop-opacity=".44"/><stop offset=".4" stop-color="#8ed9de" stop-opacity=".17"/><stop offset="1" stop-color="#8ed9de" stop-opacity="0"/></radialGradient>'+
 '<filter id="city-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>'+
 '<filter id="solarHazeBlur" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>'+
 '<clipPath id="worldNightClip"><path id="worldNightClipPath" d=""/></clipPath></defs>'+
 '<rect width="1000" height="580" fill="url(#globeGrad)"/><g class="graticule">'+graticule+'</g>'+
 '<g class="land-group" id="landGroup">'+(state.land||FALLBACK_LAND.map(d=>'<path class="land" d="'+d+'"/>').join(''))+'</g>'+
 '<g class="world-solar-illumination" aria-hidden="true" pointer-events="none">'+
 '<path id="worldDayPath" fill="#76bac4" opacity=".13" d=""/>'+
 '<path id="worldTwilightPath" fill="#375c70" opacity=".38" filter="url(#solarHazeBlur)" d=""/>'+
 '<path id="worldNightPath" fill="#010816" opacity=".77" d=""/>'+
 '</g>'+
 '<g class="world-night-stars" clip-path="url(#worldNightClip)" pointer-events="none" aria-hidden="true">'+solarStarsSvg()+'</g>'+
 '<g class="world-night-cities" pointer-events="none" aria-hidden="true">'+solarNightCitiesSvg()+'</g>'+
 '<g id="worldSunMarker" class="world-sun-marker" pointer-events="none" aria-hidden="true"><circle r="43" fill="url(#sunLightGlow)"/><circle r="3.8" fill="#ffdc91" opacity=".87"/><circle r="7.5" fill="none" stroke="#ffdc91" stroke-opacity=".34"/></g>'+
 '<g>'+arcs+'</g><g aria-hidden="true">'+lights+'</g></svg>';
}

function mapPanel(){
 return '<section class="world-map-panel" id="worldMap" aria-label="Mappa dei mercati mondiali">'+
 '<div class="world-map-header"><span>WORLD MARKET MAP</span><div class="world-solar-controls" role="status" aria-label="Illuminazione terrestre in tempo reale">'+
 '<span class="world-solar-btn active" title="Giorno e notte secondo la posizione reale del Sole">● LIVE · ORA REALE</span>'+
 '</div></div><div class="map-stage">'+svgMap()+
 REGIONS.map(r=>{
 const p=coord(...r.pin),avg=meanRegion(r),tr=trend(avg),selected=state.region===r.id;
 const hint=esc(regionLastQuoteLabel(r));
 return '<button type="button" class="map-pin'+(selected?' selected':'')+'" data-region="'+r.id+'" data-trend="'+tr+'" style="left:'+(p[0]/10).toFixed(2)+'%;top:'+(p[1]/5.8).toFixed(2)+'%" aria-label="'+esc(r.italian)+': '+pct(avg)+'. '+hint+'" title="'+hint+'"></button>'+
 '<button type="button" class="map-callout'+(selected?' selected':'')+'" data-region="'+r.id+'" data-trend="'+tr+'" style="left:'+r.callout[0]+'%;top:'+r.callout[1]+'%" aria-label="Apri '+esc(r.italian)+'. '+hint+'" title="'+hint+'"><strong>'+esc(r.name)+'</strong><span>'+pct(avg)+'</span></button>';
 }).join('')+
 '<div class="map-hint">● Seleziona una regione · media degli indici disponibili</div></div>'+
 '<div class="world-solar-statusbar"><span class="world-solar-status" id="worldSolarStatus">Illuminazione terrestre…</span><span class="world-solar-help" id="worldSolarHelp">Ciclo giorno/notte</span></div>'+geographicLegend()+
 (state.region?regionInsight(REGION_BY_ID[state.region]):'')+'</section>';
}
function regionInsight(r){
 if(!r)return '';
 const avail=r.ids.filter(id=>quote(id)&&num(quote(id).value)).length;
 return '<div class="region-insight"><strong>'+esc(r.italian)+'</strong><small>Media aritmetica di '+avail+' indici disponibili su '+r.ids.length+'</small>'+
 '<small>'+esc(regionLastQuoteLabel(r))+'</small>'+
 '<div class="region-insight-markets">'+r.ids.map(id=>'<button type="button" data-asset="'+id+'">'+esc(ASSET_BY_ID[id].short)+' <span class="'+classArrow(id)+'">'+pct(change(id))+'</span></button>').join('')+'</div></div>';
}


/* Simplified geographic land silhouettes generated from Natural Earth country polygons.
   One permanent SVG path per region, no national flags or emoji. */
const REGION_LAND_PACKED={"north-america":"XeXgXhZgZiaiakbkblbkblakZjVhTdUgTfScRcQaQXRXQWOULTKTIUHVITHUHTGSIRGRHRGQJPNQPPURUQXQXRXQXPYPZRaQbQbRZRXTYUaVbWbVcUbTbScSdTeUfTfUhVgWeWdYeXfYfXgYeZeYfYeYdZcacbcacbbdbfadZdZeXd.WQTQSQTQRPSPUP.SORPQPQO.VOSOSNUOUN.bSaSZSZR.XPVPWOXO.ZOXNbO.XMZMYN.bPeQfReReSbSbRcRdQbQZQYPaObP.pLmMrMpMqMpNqNpNpOoPpPoPoQpQkRkTiTiShRiQhQhPiPhPgOeOdNeNcNgMjMjLmL.YMdLfLcMcNbOZNaNZNaMZMaM","south-america":"UrRrPqRrSq.TqRrPqPoQkPlReSWPUMPNOMNMMOKOHRFRHSFTGWGYJaJaLcKcMfOiOkPkQiThYeadcagYfZhWiWjUjVkTmUnSp.YpXqWp","europe":"IqHrHp.XaXXaXaWZVaVaUeSeReQeRfSjSiRjQjPlPlQmRnSmTpUpVnWmWlYjYjaiYfWfXhZgagZeXcXaaYb.XTYRZSYT.ZSZQaQZQaQZRbTZUZTaS.WNSNTNSNTMSMVM.iNhOhPgRfRePdQcOgLkKmKlLmLlNmOlPiPiNkN.iGgHeF.hFjFlFjG","africa":"LWGRHMMGOGSFVFVHZJbHeIhIhKgJjPmSnTqSpWkblgijilgmgoeqarZrViWeUZUXSWRV.qhommmnhpf","middle-east":"bVfckZkcnejkXpWjOXPNHNFKNHWIeNnMpOpVrZpblakYfXeV.IIFJGH","asia":"PaLbKaIWITFTFSHRKSKRJRMRNSMTOTNSOSOROSNQOQMQLPMONOQOQNTNUNVNWOZPaOcPcOfPiPjOkNmPoPlSmUlUlSjSiSkTjUkVkWiYgZfYeZfbfceddbcddeefdfcdcabaaYYYWaWcVdUYTZSXOXMVMWNXPXQY.eidhbeegeh.jfihhhghfgidjeif.WcXdWeWd.pjpinhmgngohogqhqj.lekdlc.jbkbjbjZkZ.pRqQrQqR","oceania":"ZkYkXiZi.LeGeFXJVMROSQPSQRSUUWPYUcZbcagYhUgTeSfTdSeRdOc.VKYMYNaPXNVO.mjojnklmjm.ojnhognepgqg"};
const REGION_COORD_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function decodeRegionLand(encoded){
 return encoded.split('.').map(ring=>{
  if(ring.length<6||ring.length%2)return '';
  const pts=[];
  for(let i=0;i<ring.length;i+=2){
   const x=REGION_COORD_ALPHABET.indexOf(ring[i]),y=REGION_COORD_ALPHABET.indexOf(ring[i+1]);
   if(x<0||y<0)return '';
   pts.push((i?'L':'M')+x+' '+y);
  }
  return pts.join(' ')+'Z';
 }).filter(Boolean).join(' ');
}
const REGION_SHAPES=Object.fromEntries(Object.entries(REGION_LAND_PACKED).map(([id,value])=>[id,decodeRegionLand(value)]));
function regionIcon(r){
 const shape=REGION_SHAPES[r.id]||REGION_SHAPES.europe;
 return '<svg class="region-land-svg" viewBox="0 0 48 48" width="32" height="32" role="img" aria-label="Sagoma geografica: '+esc(r.italian)+'" focusable="false">'+
 '<path d="'+shape+'" fill="currentColor" fill-rule="evenodd"/></svg>';
}

function regionList(){
 return '<section class="global-regions panel"><div class="section-topline"><h2>'+sym('globe')+' Global Markets</h2><button type="button" class="text-action" data-page="markets">View All</button></div><div class="region-list">'+
 REGIONS.map(r=>'<button type="button" class="region-list-item'+(state.region===r.id?' selected':'')+'" data-trend="'+trend(meanRegion(r))+'" data-region="'+r.id+'" title="'+esc(regionLastQuoteLabel(r))+'"><span class="region-glyph '+trendClass(meanRegion(r))+'">'+regionIcon(r)+'</span><span class="region-titles"><strong>'+esc(r.name)+'</strong><span class="region-change '+trendClass(meanRegion(r))+'">'+pct(meanRegion(r))+'</span></span>'+sym('arrow')+'</button>').join('')+
 '</div></section>';
}
function coinLogoUrl(url){
 if(typeof url!=='string'||!url.startsWith('https://'))return '';
 try{
  const parsed=new URL(url);
  return ['coin-images.coingecko.com','assets.coingecko.com'].includes(parsed.hostname)&&parsed.protocol==='https:'?parsed.href:'';
 }catch(e){return ''}
}
const FOREX_FLAGS={
 eurusd:[['eu','🇪🇺'],['us','🇺🇸']],
 gbpusd:[['gb','🇬🇧'],['us','🇺🇸']],
 usdjpy:[['us','🇺🇸'],['jp','🇯🇵']],
 usdchf:[['us','🇺🇸'],['ch','🇨🇭']],
 audusd:[['au','🇦🇺'],['us','🇺🇸']],
 usdcny:[['us','🇺🇸'],['cn','🇨🇳']]
};
function forexPairLogo(a){
 const countries=FOREX_FLAGS[a.id];
 if(!countries)return '<span class="asset-logo" aria-hidden="true">⇄</span>';
 return '<span class="forex-pair-logo" aria-hidden="true">'+countries.map(([code,emoji],i)=>
  '<span class="forex-pair-part forex-part-'+i+'"><span class="forex-flag-fallback">'+emoji+'</span>'+
   '<img class="forex-flag-image" src="https://flagcdn.com/w40/'+code+'.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'+
  '</span>').join('')+'</span>';
}

/* Big Tech: official-domain favicon with ticker fallback when the image is unavailable. */
const BIGTECH_DOMAINS={
 nvda:'nvidia.com',msft:'microsoft.com',aapl:'apple.com',googl:'google.com',
 amzn:'amazon.com',meta:'meta.com',tsla:'tesla.com',avgo:'broadcom.com',
 amd:'amd.com',orcl:'oracle.com',tsm:'tsmc.com',asml:'asml.com'
};
function bigTechLogo(a){
 const domain=BIGTECH_DOMAINS[a.id],fallback=esc((a.symbol||a.short||'?').slice(0,2));
 if(!domain)return '<span class="asset-logo" aria-hidden="true">'+fallback+'</span>';
 const image='https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=64';
 return '<span class="asset-logo bigtech-logo asset-'+esc(a.id)+'" aria-hidden="true">'+
  '<span class="bigtech-logo-fallback">'+fallback+'</span>'+
  '<img class="bigtech-logo-image" src="'+esc(image)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>';
}
/* Commodities have no corporate brand: use distinct lightweight SVG pictograms. */
const COMMODITY_ICONS={
 gold:'<path d="M6 13h20l3 11H3z" fill="#f0b943"/><path d="M6 13l5-7h10l5 7z" fill="#ffe49b"/><path d="M10 13l-2 11M22 13l2 11" stroke="#b77513" stroke-width="1.4" fill="none"/>',
 silver:'<path d="M6 13h20l3 11H3z" fill="#b8c9d6"/><path d="M6 13l5-7h10l5 7z" fill="#f1f8fc"/><path d="M10 13l-2 11M22 13l2 11" stroke="#768f9e" stroke-width="1.4" fill="none"/>',
 brent:'<path d="M16 3C12 10 7 14 7 20a9 9 0 0 0 18 0c0-6-5-10-9-17z" fill="#2298ca"/><path d="M10 20c0 3.8 2.5 6.3 5.8 6.5" stroke="#afe8fb" stroke-width="2" fill="none" stroke-linecap="round"/>',
 wti:'<rect x="9" y="5" width="14" height="22" rx="3" fill="#406eaa"/><path d="M9 10h14M9 22h14" stroke="#9bc7ef" stroke-width="2"/><path d="M16 12c-2 3-4 5-4 7a4 4 0 0 0 8 0c0-2-2-4-4-7z" fill="#bde9ff"/>',
 naturalgas:'<path d="M17 2c1 7-4 8-3 13-3-1-4-4-4-6-4 5-5 8-5 13a11 11 0 0 0 22 0c0-7-4-11-10-20z" fill="#ee8b32"/><path d="M17 15c0 5-5 6-5 10a5 5 0 0 0 10 0c0-4-3-7-5-10z" fill="#ffd275"/>',
 copper:'<circle cx="16" cy="16" r="12" fill="none" stroke="#ae5b35" stroke-width="5"/><circle cx="16" cy="16" r="8" fill="none" stroke="#e3a477" stroke-width="3"/><circle cx="16" cy="16" r="4" fill="#f4be89"/><path d="M9 7l13 18" stroke="#954526" stroke-width="1" opacity=".55"/>'
};
function commodityLogo(a){
 const art=COMMODITY_ICONS[a.id];
 if(!art)return '<span class="asset-logo" aria-hidden="true">'+esc(a.icon||a.short)+'</span>';
 return '<span class="asset-logo commodity-logo commodity-'+esc(a.id)+'" aria-hidden="true">'+
  '<svg viewBox="0 0 32 32" focusable="false">'+art+'</svg></span>';
}


/* Indices and Tech ETFs are tied to index publishers / fund managers.
   Show their recognizable provider favicon; keep a styled short-label fallback
   so the badge remains meaningful if the image provider is unavailable. */
const MARKET_LOGOS=Object.freeze({
 sp500:{domain:'spglobal.com',label:'S&P'},
 nasdaq:{domain:'nasdaq.com',label:'NQ'},
 tsx:{domain:'tsx.com',label:'TSX'},
 ibov:{domain:'b3.com.br',label:'B3'},
 ftse:{domain:'lseg.com',label:'FTSE'},
 dax:{domain:'stoxx.com',label:'DAX'},
 cac:{domain:'euronext.com',label:'CAC'},
 jse:{domain:'jse.co.za',label:'JSE'},
 tadawul:{domain:'saudiexchange.sa',label:'TASI'},
 nikkei:{domain:'nikkei.com',label:'225'},
 hsi:{domain:'hsi.com.hk',label:'HSI'},
 nifty:{domain:'nseindia.com',label:'N50'},
 kospi:{domain:'krx.co.kr',label:'KOS'},
 asx:{domain:'asx.com.au',label:'ASX'},
 ndx:{domain:'nasdaq.com',label:'NDX'},
 sox:{domain:'nasdaq.com',label:'SOX'},
 xlk:{domain:'ssga.com',label:'XLK'},
 qqq:{domain:'invesco.com',label:'QQQ'},
 smh:{domain:'vaneck.com',label:'SMH'}
});
function marketLogo(a){
 const logo=MARKET_LOGOS[a.id];
 if(!logo)return '<span class="asset-logo" aria-hidden="true">'+esc(a.short||a.symbol)+'</span>';
 const image='https://www.google.com/s2/favicons?domain='+encodeURIComponent(logo.domain)+'&sz=64';
 return '<span class="asset-logo market-index-logo'+(a.sector==='tech'?' market-tech-logo':'')+' asset-'+esc(a.id)+'" aria-hidden="true">'+
  '<span class="market-index-logo-fallback">'+esc(logo.label)+'</span>'+
  '<img class="market-index-logo-image" src="'+esc(image)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>';
}

function showAssetLogo(a){return a&&['crypto','forex','bigtech','commodities','markets'].includes(a.group);}

function assetLogo(a){
 const fallback=esc(a.icon||(a.short||a.name||'?').trim().charAt(0));
 if(a.group==='forex')return forexPairLogo(a);
 if(a.group==='markets')return marketLogo(a);
 if(a.group==='bigtech')return bigTechLogo(a);
 if(a.group==='commodities')return commodityLogo(a);
 if(a.group!=='crypto')return '<span class="asset-logo asset-'+esc(a.id)+'">'+fallback+'</span>';
 const q=quote(a.id),logo=coinLogoUrl(q&&q.logo);
 return '<span class="asset-logo crypto-logo asset-'+esc(a.id)+'" aria-hidden="true">'+
  '<span class="crypto-logo-fallback">'+fallback+'</span>'+
  (logo?'<img class="crypto-logo-image" src="'+esc(logo)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">':'')+'</span>';
}
function sidePanel(group){
 const crypto=group.group==='crypto';
 const visible=crypto&&!state.cryptoExpanded?group.ids.slice(0,8):group.ids;
 const count=group.ids.length;
 return '<section class="market-panel panel'+(crypto?' crypto-market-panel':'')+'"><div class="section-topline"><h3>'+sym('globe')+' '+esc(group.title)+(crypto?'<span class="crypto-counter">'+count+'</span>':'')+'<span class="market-feed-pill" data-market-group="'+group.group+'">'+marketGroupStatus(group.group)+'</span>'+'</h3><button type="button" class="text-action" data-page="markets" data-category="'+group.group+'">View All</button></div>'+
 '<div class="instrument-rows">'+visible.map(id=>{
 const a=ASSET_BY_ID[id],q=quote(id);
 return '<button type="button" class="instrument-row" data-asset="'+id+'" aria-label="Apri '+esc(a.name)+'">'+assetLogo(a)+'<span class="asset-label">'+esc(a.name)+'</span>'+
 '<span class="asset-price">'+assetValue(a)+'</span><span class="asset-change '+classArrow(id)+'">'+pct(q&&q.change)+'</span></button>';
 }).join('')+'</div>'+
 (crypto?'<button type="button" class="crypto-expand-btn" data-crypto-expand="1" aria-expanded="'+String(state.cryptoExpanded)+'">'+(state.cryptoExpanded?'− Mostra meno':'＋ Mostra altre '+(count-visible.length)+' crypto')+'</button>':'')+'</section>';
}
function middleEastPhotoChart(){
 const q=quote('tadawul');
 const historic=!!(q&&(
  (Array.isArray(q.candles)&&q.candles.filter(row=>row&&num(Number(row.c))).length>=2)||
  (Array.isArray(q.history)&&q.history.filter(v=>num(Number(v))).length>=2)
 ));
 const sessionChange=!!(q&&num(q.value)&&num(q.change)&&q.change>-99.9);
 const subtitle=historic?'TASI · andamento delle sedute':sessionChange?'TASI · ultima variazione':'TASI · storico non disponibile';
 return '<span class="middle-east-spark" role="img" aria-label="Grafico Tadawul All Share, '+esc(subtitle)+'">'+
  sparkLine('tadawul',120,34)+'<small>'+subtitle+'</small></span>';
}
function photoCard(r){
 const lead=ASSET_BY_ID[r.lead],q=quote(r.lead);
 const spark=r.id==='middle-east'?middleEastPhotoChart():sparkLine(r.lead,120,32);
 return '<button type="button" class="photo-card" data-region="'+r.id+'" data-trend="'+trend(q&&q.change)+'" data-id="'+r.id+'" aria-label="Apri '+esc(r.name)+'">'+
 '<span class="photo-cover" aria-hidden="true"></span><span class="photo-card-body"><span class="photo-card-title">'+esc(r.name)+'</span>'+
 '<span class="photo-card-metrics"><strong>'+meanPrice(r)+'</strong><span class="change '+trendClass(change(r.lead))+'">'+pct(change(r.lead))+'</span></span>'+spark+'</span></button>';
}

/* Live market feed: streaming Binance Spot USDT quotes when available.
   Non-crypto indices, futures and FX remain provider-delayed snapshot quotes. */
const STREAM_PAIRS={
 btc:'btcusdt',eth:'ethusdt',sol:'solusdt',xrp:'xrpusdt',bnb:'bnbusdt',doge:'dogeusdt',
 inj:'injusdt',ada:'adausdt',avax:'avaxusdt',link:'linkusdt',dot:'dotusdt',
 trx:'trxusdt',ton:'tonusdt',sui:'suiusdt',ltc:'ltcusdt',bch:'bchusdt',
 xlm:'xlmusdt',hbar:'hbarusdt',near:'nearusdt',apt:'aptusdt',atom:'atomusdt',
 uni:'uniusdt',aave:'aaveusdt',arb:'arbusdt',op:'opusdt',shib:'shibusdt',
 pepe:'pepeusdt',render:'renderusdt',ray:'rayusdt',lunc:'luncusdt',
 vra:'vrausdt',wlfi:'wlfiusdt',hot:'hotusdt',
 ksm:'ksmusdt',wld:'wldusdt',fet:'fetusdt',virtual:'virtualusdt',tao:'taousdt',luna:'lunausdt'
};
const STREAM_IDS=Object.fromEntries(Object.entries(STREAM_PAIRS).map(([id,pair])=>[pair.toUpperCase(),id]));
const STREAM_OVERLAY=new Map();
const streamStatus={socket:null,connected:false,seen:new Set(),last:0,attempt:0,retryTimer:null,flushTimer:null,dirty:new Set(),endpointIndex:0};
function liveConnected(){return streamStatus.connected&&Date.now()-streamStatus.last<25000;}
function liveLabel(){
 const active=liveConnected(),count=[...streamStatus.seen].filter(id=>STREAM_OVERLAY.has(id)&&Date.now()-STREAM_OVERLAY.get(id).received<90000).length;
 return active?'● LIVE crypto: '+count+' coppie Binance Spot (USDT)':'○ Crypto: '+(streamStatus.connected?'in attesa dei tick':'connessione / riconnessione');
}
function snapshotAgeMinutes(){
 const t=Date.parse(state.feedTime||'');
 return Number.isFinite(t)?Math.max(0,Math.round((Date.now()-t)/60000)):null;
}
function marketGroupStatus(group){
 const age=snapshotAgeMinutes();
 const missing=state.feedError||age===null,stale=age!==null&&age>18;
 if(group==='crypto'){
  if(liveConnected())return '● LIVE Binance · '+streamStatus.seen.size+' / '+Object.keys(STREAM_PAIRS).length;
  if(missing)return '◌ Crypto · feed non disponibile';
  return '↻ Crypto · CoinGecko ~5 min';
 }
 if(group==='forex'){
  if(fxConnected())return '● LIVE FX · broker MT5';
  if(missing)return '◌ Forex · feed non disponibile';
  return stale?'◌ Forex · ultimo dato '+age+' min':'↻ Forex · auto ~5 min';
 }
 if(missing)return '◌ Dati non disponibili';
 if(stale)return '◌ Ultimo snapshot '+age+' min fa';
 return '↻ Auto ~5 min · possibili ritardi';
}
function marketGroupLive(group){return group==='crypto'?liveConnected():group==='forex'?fxConnected():false}
function marketStatusStrip(){
 const groups=[['markets','Indici'],['tech','Tech'],['bigtech','Big Tech'],['forex','Forex'],['commodities','Commodities'],['crypto','Crypto']];
 return '<div class="market-live-strip" aria-label="Aggiornamento automatico dei mercati">'+
 groups.map(([key,name])=>'<span class="market-data-pill'+(marketGroupLive(key)?' live':'')+'" data-market-group="'+key+'"><strong>'+name+'</strong><small>'+marketGroupStatus(key)+'</small></span>').join('')+
 '</div>';
}
function feedSummaryLabel(){
 const stamp=state.feedTime?localeDate(state.feedTime,{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'n.d.';
 return (state.feedError?'Connessione al feed non riuscita':'Dati disponibili: '+dataCount()+'/'+ASSETS.length)+' · Snapshot '+stamp;
}
function updateLiveBadges(){
 document.querySelectorAll('[data-market-group]').forEach(n=>{
  const group=n.dataset.marketGroup;
  if(!group)return;
  const body=n.querySelector('small');
  if(body)body.textContent=marketGroupStatus(group);else n.textContent=marketGroupStatus(group);
  n.classList.toggle('live',marketGroupLive(group));
  n.classList.toggle('stale',!marketGroupLive(group)&&(snapshotAgeMinutes()===null||snapshotAgeMinutes()>18));
  n.title=group==='crypto'?'Tick Binance/USDT dove disponibili, altri asset CoinGecko.':group==='forex'?'FX broker MT5 streaming quando disponibile; fallback Yahoo Finance.':'Yahoo Finance: dati aggiornati automaticamente, ma potenzialmente ritardati.';
 });
 document.querySelectorAll('.crypto-stream-status').forEach(n=>{
  n.textContent=liveLabel();n.classList.toggle('live-online',liveConnected());
 });
 document.querySelectorAll('.live-stream-note').forEach(n=>{
  n.textContent=(liveConnected()?'Crypto Binance in streaming':'Crypto CoinGecko · refresh automatico')+
   ' · '+(fxConnected()?'Forex broker MT5 in streaming':'Forex snapshot automatico')+
   ' · Indici, Tech, Big Tech e Commodities: Yahoo Finance, anche ritardato.';
 });
 document.querySelectorAll('.feed-summary-text').forEach(n=>n.textContent=feedSummaryLabel());
 document.querySelectorAll('.data-status').forEach(n=>n.classList.toggle('error',state.feedError));
}

function setMovementClass(element,value){
 if(!element)return;
 const classes=['color-up','color-down','color-flat','color-unknown'];
 element.classList.remove(...classes);
 element.classList.add(trendClass(value));
}
function patchRegions(){
 if(state.page!=='global')return;
 for(const r of REGIONS){
  const avg=meanRegion(r),lead=ASSET_BY_ID[r.lead],leadQuote=quote(r.lead);
  const hint=regionLastQuoteLabel(r);
  document.querySelectorAll('#pageContainer .region-list-item[data-region="'+r.id+'"]').forEach(el=>{
   el.dataset.trend=trend(avg);
   el.title=hint;
   const d=el.querySelector('.region-change'),i=el.querySelector('.region-glyph');
   if(d){d.textContent=pct(avg);setMovementClass(d,avg)}
   setMovementClass(i,avg);
  });
  document.querySelectorAll('#worldMap .map-callout[data-region="'+r.id+'"]').forEach(el=>{
   el.dataset.trend=trend(avg);el.title=hint;
   el.setAttribute('aria-label','Apri '+r.italian+'. '+hint);
   const v=el.querySelector('span');if(v)v.textContent=pct(avg);
  });
  document.querySelectorAll('#worldMap .map-pin[data-region="'+r.id+'"]').forEach(el=>{el.dataset.trend=trend(avg);el.title=hint;el.setAttribute('aria-label',r.italian+': '+pct(avg)+'. '+hint)});
  document.querySelectorAll('#pageContainer .photo-card[data-region="'+r.id+'"]').forEach(el=>{
   el.dataset.trend=trend(change(r.lead));
   const v=el.querySelector('.photo-card-metrics strong'),p=el.querySelector('.photo-card-metrics .change');
   if(v&&lead)v.textContent=assetValue(lead);
   if(p){p.textContent=pct(leadQuote&&leadQuote.change);setMovementClass(p,leadQuote&&leadQuote.change)}
   // Update the SVG when the daily series arrives after the card was rendered.
   if(r.id==='middle-east'){
    const chart=el.querySelector('.middle-east-spark');
    if(chart)chart.outerHTML=middleEastPhotoChart();
   }
  });
 }
}
function patchPortfolio(){
 if(state.page!=='portfolio')return;
 const totals=portfolioTotals(),stats=document.querySelectorAll('#pageContainer .portfolio-summary .summary-card strong');
 if(stats[0])stats[0].textContent=totals.priced?portfolioUsd(totals.value):'—';
 if(stats[1])stats[1].textContent=portfolioUsd(totals.invested);
 if(stats[2]){
  stats[2].textContent=totals.priced?portfolioUsd(totals.pnl):'—';
  setMovementClass(stats[2],totals.priced?totals.pnl:NaN);
 }
 if(stats[3])stats[3].textContent=String(totals.count);
 state.holdings.map(portfolioRow).forEach(r=>{
  const row=document.querySelector('#pageContainer tr[data-portfolio-row="'+r.index+'"]');
  if(!row)return;
  const price=row.querySelector('[data-portfolio-price]'),
        value=row.querySelector('[data-portfolio-value]'),
        pnl=row.querySelector('[data-portfolio-pnl]');
  if(price)price.innerHTML=portfolioUnitUsd(r.hasPrice?r.price:NaN)+
   '<small class="portfolio-quote-status">'+esc(r.source)+(r.source==='Manuale'?' · non live':'')+'</small>';
  if(value)value.textContent=portfolioUsd(r.value);
  if(pnl){
   pnl.textContent=portfolioUsd(r.pnl);
   setMovementClass(pnl,r.hasPrice?r.pnl:NaN);
  }
 });
}
function patchSummary(){
 if(state.page!=='home'&&state.page!=='analytics')return;
 const c=countMarketMood(),stats=document.querySelectorAll('#pageContainer .summary-grid .summary-card strong');
 if(state.page==='home'){
  if(stats[0])stats[0].textContent=dataCount()+'/'+ASSETS.length;
  if(stats[1])stats[1].textContent=String(c.up);
  if(stats[2])stats[2].textContent=String(c.down);
 }else{
  if(stats[0])stats[0].textContent=String(c.up);
  if(stats[1])stats[1].textContent=String(c.down);
  if(stats[2])stats[2].textContent=String(c.flat);
  if(stats[3])stats[3].textContent=c.total+'/'+ASSETS.length;
 }
}
function updatePriceDom(){
 const ids=[...streamStatus.dirty];streamStatus.dirty.clear();
 if(document.hidden)return;
 for(const id of ids){
  const a=ASSET_BY_ID[id],q=quote(id);
  if(!a||!q)continue;
  document.querySelectorAll('#pageContainer [data-asset="'+id+'"]').forEach(el=>{
   const price=el.querySelector('.asset-price,.mini-price,.tech-asset-value');
   const delta=el.querySelector('.asset-change,.mini-change,.tech-asset-change');
   if(price)price.textContent=assetValue(a);
   if(delta){delta.textContent=pct(q.change);setMovementClass(delta,q.change)}
   if(el.matches('tr[data-asset]')){
    const cells=el.querySelectorAll('td');
    if(cells.length>=3){
     cells[1].textContent=assetValue(a);
     cells[2].textContent=pct(q.change);
     setMovementClass(cells[2],q.change);
    }
   }
   if(el.hasAttribute('data-trend'))el.dataset.trend=trend(q.change);
  });
  if(state.dialogId===id){
   const p=document.querySelector('#dialogBody .dialog-stats strong');
   const c=document.querySelector('#dialogBody .dialog-stats .change');
   const m=document.querySelector('#dialogBody .dialog-meta');
   if(p)p.textContent=assetValue(a);
   if(c){c.textContent=pct(q.change);setMovementClass(c,q.change)}
   if(m)m.textContent=(q.live?'Tick '+(q.source||'streaming')+' · ':'Ultimo prezzo · ')+refTime(id);
  }
 }
 if(ids.length){
  patchRegions();
  patchPortfolio();
  patchSummary();
  if(state.alerts.length)updateNav();
 }
 updateLiveBadges();
}
function scheduleLivePaint(){
 if(streamStatus.flushTimer)return;
 streamStatus.flushTimer=window.setTimeout(()=>{
  streamStatus.flushTimer=null;
  if(!document.hidden)updatePriceDom();
 },900);
}
function applyLiveTick(d){
 const id=STREAM_IDS[d&&d.s],close=Number(d&&d.c),open=Number(d&&d.o);
 if(!id||!Number.isFinite(close)||close<=0)return;
 const eventMs=Number(d.E),timeMs=Number.isFinite(eventMs)&&eventMs>1000000000000?eventMs:Date.now();
 const change24h=Number.isFinite(open)&&open>0?(close/open-1)*100:null;
 const fresh={value:close,change:change24h,currency:'USDT',source:'Binance Spot (USDT)',time:new Date(timeMs).toISOString(),live:true,received:Date.now()};
 STREAM_OVERLAY.set(id,fresh);
 state.quotes[id]={...(state.quotes[id]||{id,history:[],candles:[]}),...fresh};
 streamStatus.last=Date.now();streamStatus.seen.add(id);streamStatus.dirty.add(id);
 scheduleLivePaint();
}
function closeStream(){
 if(streamStatus.retryTimer){clearTimeout(streamStatus.retryTimer);streamStatus.retryTimer=null}
 if(streamStatus.socket){
  const ws=streamStatus.socket;streamStatus.socket=null;
  ws.onclose=null;ws.onmessage=null;ws.onerror=null;
  try{ws.close()}catch(e){}
 }
 streamStatus.connected=false;
}
function connectCryptoStream(){
 if(document.hidden||!navigator.onLine||typeof WebSocket==='undefined')return;
 if(streamStatus.socket&&(streamStatus.socket.readyState===WebSocket.OPEN||streamStatus.socket.readyState===WebSocket.CONNECTING))return;
 if(streamStatus.retryTimer){clearTimeout(streamStatus.retryTimer);streamStatus.retryTimer=null}
 const streams=Object.values(STREAM_PAIRS).map(s=>s+'@miniTicker').join('/');
 const host=streamStatus.endpointIndex%2?'wss://stream.binance.com:443':'wss://data-stream.binance.vision';
 let ws;
 try{ws=new WebSocket(host+'/stream?streams='+streams)}catch(e){scheduleReconnect();return}
 streamStatus.socket=ws;streamStatus.connected=false;
 ws.onopen=()=>{if(streamStatus.socket!==ws)return;streamStatus.connected=true;streamStatus.attempt=0;updateLiveBadges()};
 ws.onmessage=e=>{
  if(streamStatus.socket!==ws)return;
  try{
   const msg=JSON.parse(e.data),d=msg&&msg.data||msg;
   if(d&&d.e==='24hrMiniTicker')applyLiveTick(d);
  }catch(err){}
 };
 ws.onerror=()=>{if(streamStatus.socket===ws){streamStatus.connected=false;updateLiveBadges()}};
 ws.onclose=()=>{
  if(streamStatus.socket!==ws)return;
  streamStatus.socket=null;streamStatus.connected=false;
  streamStatus.endpointIndex++;updateLiveBadges();scheduleReconnect();
 };
 updateLiveBadges();
}
function scheduleReconnect(){
 if(streamStatus.retryTimer||document.hidden||!navigator.onLine)return;
 const ms=Math.min(45000,1500*Math.pow(2,Math.min(5,streamStatus.attempt++)));
 streamStatus.retryTimer=setTimeout(()=>{streamStatus.retryTimer=null;connectCryptoStream()},ms);
}
function keepStreamAlive(){
 if(document.hidden||!navigator.onLine){closeStream();updateLiveBadges();return}
 const silence=Date.now()-streamStatus.last;
 if(streamStatus.connected&&streamStatus.last&&silence>90000){
  closeStream();scheduleReconnect();
 }else if(!streamStatus.socket)connectCryptoStream();
 updateLiveBadges();
}

/* Optional independent FX broker streaming (MT5 quotes, not official exchange mid).
   The dashboard keeps its Yahoo snapshot when this service is offline/unavailable.
   No secrets are embedded in the public website. */
const FX_STREAM_IDS={EURUSD:'eurusd',GBPUSD:'gbpusd',USDJPY:'usdjpy',USDCHF:'usdchf',AUDUSD:'audusd',USDCNY:'usdcny'};
const FX_OVERLAY=new Map();
const fxStatus={connection:null,connected:false,last:0,seen:new Set(),connecting:false,activeSince:0,retryAt:0};
function fxConnected(){
 return fxStatus.connected&&Date.now()-fxStatus.last<45000;
}
function fxLabel(){
 if(fxConnected())return '● FX LIVE · '+fxStatus.seen.size+'/6 coppie · broker MT5';
 if(fxStatus.connected)return '◌ FX connesso · nessun tick recente';
 return '◌ FX automatico · snapshot / connessione';
}
function forexTick(tick){
 const id=FX_STREAM_IDS[String(tick&&tick.symbol||'').replace('/','').toUpperCase()];
 if(!id||tick.marketState==='closed'||tick.stale===true)return;
 const mid=Number(tick.mid),bid=Number(tick.bid),ask=Number(tick.ask);
 const value=Number.isFinite(mid)&&mid>0?mid:(Number.isFinite(bid)&&Number.isFinite(ask)&&bid>0&&ask>=bid?(bid+ask)/2:null);
 if(!Number.isFinite(value)||value<=0)return;
 const sent=Date.parse(tick.timestamp);
 if(!Number.isFinite(sent)||sent>Date.now()+60000||Date.now()-sent>45000)return;
 const changePct=Number(tick.dayDiffPercent);
 const fresh={
  value,change:Number.isFinite(changePct)?changePct:null,
  currency:'RATIO',time:new Date(sent).toISOString(),live:true,
  source:'biquote · broker Forex MT5',received:Date.now(),marketState:'open'
 };
 FX_OVERLAY.set(id,fresh);
 state.quotes[id]={...(state.quotes[id]||{id,history:[],candles:[]}),...fresh};
 fxStatus.last=Date.now();fxStatus.seen.add(id);
 streamStatus.dirty.add(id);scheduleLivePaint();
}
function preserveForexQuotes(snapshot){
 const now=Date.now();
 for(const [id,fx] of FX_OVERLAY){
  if(now-fx.received<90000&&snapshot[id])snapshot[id]={...snapshot[id],...fx};
  else if(now-fx.received>=90000)FX_OVERLAY.delete(id);
 }
 return snapshot;
}
function connectForexStream(){
 if(document.hidden||!navigator.onLine||!window.signalR||fxStatus.connection||fxStatus.connecting||Date.now()<fxStatus.retryAt)return;
 fxStatus.connecting=true;
 let connection;
 try{
  connection=new window.signalR.HubConnectionBuilder()
   .withUrl('https://biquote.io/hubs/tick')
   .withAutomaticReconnect([0,2500,10000,30000])
   .build();
 }catch(e){fxStatus.connecting=false;fxStatus.retryAt=Date.now()+60000;return}
 fxStatus.connection=connection;
 const subscribe=()=>connection.invoke('Subscribe',Object.keys(FX_STREAM_IDS)).catch(()=>{});
 connection.on('ReceiveTick',forexTick);
 connection.onreconnecting(()=>{fxStatus.connected=false;updateLiveBadges()});
 connection.onreconnected(()=>{fxStatus.connected=true;subscribe();updateLiveBadges()});
 connection.onclose(()=>{if(fxStatus.connection!==connection)return;fxStatus.connection=null;fxStatus.connected=false;fxStatus.connecting=false;fxStatus.retryAt=Date.now()+45000;updateLiveBadges()});
 connection.start().then(()=>{
  if(fxStatus.connection!==connection)return;
  fxStatus.connecting=false;fxStatus.connected=true;fxStatus.activeSince=Date.now();
  subscribe();updateLiveBadges();
 }).catch(()=>{
  if(fxStatus.connection===connection)fxStatus.connection=null;
  fxStatus.connected=false;fxStatus.connecting=false;fxStatus.retryAt=Date.now()+45000;
  updateLiveBadges();
 });
}
function disconnectForexStream(){
 const old=fxStatus.connection;fxStatus.connection=null;fxStatus.connected=false;fxStatus.connecting=false;
 if(old)old.stop().catch(()=>{});
}

function preserveStreamingQuotes(snapshot){
 const now=Date.now();
 for(const [id,live] of STREAM_OVERLAY){
  if(now-live.received<90000&&snapshot[id])snapshot[id]={...snapshot[id],...live};
  else if(now-live.received>=90000)STREAM_OVERLAY.delete(id);
 }
 return snapshot;
}

function feedStatus(){
 return '<div class="data-footnote"><span class="data-status'+(state.feedError?' error':'')+'"><i></i><span class="feed-summary-text">'+feedSummaryLabel()+'</span></span>'+
 '<span class="live-stream-note">Crypto: Binance quando disponibile · Forex: broker MT5 quando disponibile · altri mercati: Yahoo Finance, ritardati.</span>'+
 '<span>Mercati chiusi = ultima seduta. <button type="button" data-refresh="1">'+sym('refresh')+' Verifica ora</button></span></div>';
}
function techBigTechOverview(){
 return '<section class="sector-overview" aria-label="Mercato Tech e Big Tech">'+
 '<div class="sector-heading"><div><span class="eyebrow">TECHNOLOGY MARKETS</span><h2>Mercato Tech <span>&amp;</span> Big Tech</h2><p>Indici tecnologici, ETF e grandi aziende quotate.</p></div>'+
 '<div class="sector-actions"><button type="button" class="btn btn-small" data-page="markets" data-category="tech">Mercato Tech</button>'+
 '<button type="button" class="btn btn-small" data-page="markets" data-category="bigtech">Big Tech</button></div></div>'+
 '<div class="sector-overview-grid"><div class="panel sector-panel"><h3>'+sym('trend')+' Indici e ETF Tech <span class="market-feed-pill" data-market-group="tech">'+marketGroupStatus('tech')+'</span></h3>'+
 '<div class="sector-card-grid sector-tech-cards">'+TECH_IDS.map(indexCard).join('')+'</div></div>'+
 '<div class="panel sector-panel"><h3>'+sym('bars')+' Big Tech · Azioni <span class="market-feed-pill" data-market-group="bigtech">'+marketGroupStatus('bigtech')+'</span></h3>'+
 '<div class="sector-card-grid sector-bigtech-cards">'+BIGTECH_IDS.slice(0,7).map(indexCard).join('')+'</div>'+
 '<button type="button" class="text-action sector-view-all" data-page="markets" data-category="bigtech">Vedi tutte le '+BIGTECH_IDS.length+' aziende →</button></div></div>'+
 '<p class="sector-footnote">Nasdaq-100 e PHLX SOX sono indici; XLK, QQQ e SMH sono ETF. Le Big Tech sono azioni. Prezzi da Yahoo Finance, anche ritardati.</p></section>';
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
 const marketCards=['btc','eth','sol','sp500','nasdaq','dax'].map(indexCard).join('');
 return secHeader('Panoramica','Controlla gli indici e le criptovalute','<button class="btn btn-primary" type="button" data-page="global">'+sym('globe')+' Mappa mondiale</button>')+
 '<div class="summary-grid">'+overviewCard('Mercati disponibili',dataCount()+'/'+ASSETS.length,'Dati reali da fonti esterne')+
 overviewCard('Strumenti in rialzo',String(s.up),'Variazioni disponibili','color-up')+
 overviewCard('Strumenti in ribasso',String(s.down),'Ultima seduta / 24h','color-down')+
 overviewCard('Mercati nella watchlist',String(state.watch.length),'Salvati in questo browser')+'</div>'+
 secHeader('Indici e criptovalute','Grafici e variazioni')+'<div class="market-index-strip">'+marketCards+'</div>'+
 feedStatus();
}
function tableForAssets(items,emptyTitle){
 if(!items.length)return '<div class="empty-state"><h3>'+esc(emptyTitle||'Nessun mercato da mostrare')+'</h3><p>Modifica la ricerca o aggiungi strumenti alla watchlist.</p></div>';
 return '<div class="data-table-scroll"><table class="data-table"><thead><tr><th>Strumento</th><th>Ultimo prezzo</th><th>Variazione</th><th>Storico</th><th>Fonte</th></tr></thead><tbody>'+
 items.map(a=>'<tr tabindex="0" data-asset="'+a.id+'" aria-label="Dettagli '+esc(a.name)+'"><td><span class="market-table-asset">'+(showAssetLogo(a)?assetLogo(a):'')+'<span><strong>'+esc(a.name)+'</strong><small>'+esc(a.symbol)+'</small></span></span></td>'+
 '<td>'+assetValue(a)+'</td><td class="'+classArrow(a.id)+'">'+pct(change(a.id))+'</td>'+
 '<td class="'+classArrow(a.id)+'">'+sparkLine(a.id,90,26)+'</td><td><small>'+esc(a.group==='crypto'?'Binance/CoinGecko':a.group==='forex'?'Broker MT5/Yahoo':'Yahoo Finance')+'</small></td></tr>').join('')+
 '</tbody></table></div>';
}

/* Visual Markets gallery: charts only from actual historical candles or price data. */
const MARKET_CHART_GROUPS=[
 ['crypto','Criptovalute'],['commodities','Materie prime'],['bigtech','Big Tech'],
 ['tech','Tech · Indici ed ETF'],['markets','Indici mondiali'],['forex','Forex']
];
function marketCategory(a){return a.sector==='tech'?'tech':a.group;}
function marketFilterMatch(a){return state.marketFilter==='all'||marketCategory(a)===state.marketFilter;}
function marketChartPlot(id){
 const q=quote(id),W=320,H=142,L=10,R=10,T=10,B=14,chartW=W-L-R,chartH=H-T-B;
 const grid='<path d="M10 42H310 M10 82H310 M10 122H310" stroke="currentColor" stroke-opacity=".13" stroke-width=".7" fill="none"/>';
 const plot=(svg,note)=>'<svg viewBox="0 0 320 142" preserveAspectRatio="none" aria-hidden="true">'+grid+svg+'</svg><span class="market-chart-note">'+note+'</span>';
 const valid=c=>{
  if(!c)return false;
  const o=Number(c.o),h=Number(c.h),l=Number(c.l),cl=Number(c.c);
  return [o,h,l,cl].every(num)&&o>0&&h>0&&l>0&&cl>0&&h>=Math.max(o,cl)&&l<=Math.min(o,cl);
 };
 const candles=q&&Array.isArray(q.candles)?q.candles.filter(valid).slice(-48):[];
 if(candles.length>=2){
  const low=Math.min(...candles.map(c=>Number(c.l))),high=Math.max(...candles.map(c=>Number(c.h)));
  const pad=Math.max((high-low)*.09,high*.0002),min=low-pad,max=high+pad;
  const y=v=>T+(max-v)/(max-min)*chartH,step=chartW/candles.length;
  const paths=candles.map((c,i)=>{
   const o=Number(c.o),cl=Number(c.c),x=L+(i+.5)*step,co=cl>=o?'#18d8a0':'#f57185';
   const yo=y(o),yc=y(cl),cw=Math.max(2,Math.min(6,step*.68));
   return '<path d="M'+x.toFixed(2)+' '+y(Number(c.h)).toFixed(2)+'V'+y(Number(c.l)).toFixed(2)+'" stroke="'+co+'" stroke-width="1.15"/>'+
    '<rect x="'+(x-cw/2).toFixed(2)+'" y="'+Math.min(yo,yc).toFixed(2)+'" width="'+cw.toFixed(2)+'" height="'+Math.max(1,Math.abs(yo-yc)).toFixed(2)+'" rx=".5" fill="'+co+'"/>';
  }).join('');
  return plot(paths,'Candele OHLC · '+candles.length+' barre'+(q&&q.candleSource?' · '+esc(q.candleSource):''));
 }
 return '<span class="market-chart-unavailable">Candele OHLC non disponibili per questo strumento</span>'+
  '<span class="market-chart-note">Nessun grafico a linee o candele simulate</span>';
}
function marketChartCard(a){
 const q=quote(a.id),cat=marketCategory(a);
 const label={markets:'Indice',tech:'Tech',bigtech:'Azione',commodities:'Materia prima',forex:'Cambio',crypto:'Crypto'}[cat]||cat;
 return '<button type="button" class="market-chart-card" data-asset="'+esc(a.id)+'" data-trend="'+trend(q&&q.change)+'" aria-label="Apri grafico completo di '+esc(a.name)+'">'+
 '<span class="market-chart-top">'+(showAssetLogo(a)?assetLogo(a):'')+
 '<span class="market-chart-title"><strong>'+esc(a.short||a.name)+'</strong><small>'+esc(a.symbol)+' · '+label+'</small></span></span>'+
 '<span class="market-chart-values"><strong class="asset-price">'+assetValue(a)+'</strong>'+
 '<span class="asset-change '+classArrow(a.id)+'">'+pct(q&&q.change)+'</span></span>'+
 '<span class="market-mini-chart">'+marketChartPlot(a.id)+'</span>'+
 '<span class="market-chart-open">Grafico completo · EMA · RSI · Stoch RSI · MACD</span></button>';
}
function marketsCards(items){
 if(!items.length)return '<div class="empty-state"><h3>Nessuno strumento trovato</h3><p>Modifica ricerca o categoria.</p></div>';
 return MARKET_CHART_GROUPS.map(([group,title])=>{
  const assets=items.filter(a=>marketCategory(a)===group);
  if(!assets.length)return '';
  return '<section class="market-chart-section" aria-label="'+esc(title)+'">'+
   '<div class="market-chart-section-head"><h3>'+esc(title)+'</h3><span>'+assets.length+' grafici</span></div>'+
   '<div class="market-chart-grid">'+assets.map(marketChartCard).join('')+'</div></section>';
 }).join('');
}
function updateMarketsSnapshotCharts(){
 if(state.page!=='markets')return;
 document.querySelectorAll('#marketRows .market-chart-card[data-asset]').forEach(card=>{
  const node=card.querySelector('.market-mini-chart');if(!node)return;
  const next=marketChartPlot(card.dataset.asset);
  if(node.innerHTML!==next)node.innerHTML=next;
 });
}
function marketsPage(){
 const options=[['all','Tutti'],['markets','Indici'],['tech','Tech'],['bigtech','Big Tech'],['commodities','Materie prime'],['forex','Forex'],['crypto','Crypto']];
 const text=state.marketSearch.trim().toLowerCase();
 const filtered=ASSETS.filter(a=>marketFilterMatch(a)&&(!text||(a.name+' '+a.symbol+' '+(a.country||'')).toLowerCase().includes(text)));
 return secHeader('Tutti i grafici dei mercati','Grafici visibili per ogni strumento: selezionane uno per aprire le medie mobili e gli indicatori',
 '<a class="btn btn-small" href="#global">'+sym('globe')+' Mappa mondiale</a>')+
 '<section class="content-card panel markets-gallery"><div class="filter-row"><div class="tab-filters" role="group" aria-label="Categorie mercati">'+
 options.map(([id,label])=>'<button type="button" data-filter="'+id+'" class="'+(state.marketFilter===id?'active':'')+'">'+label+'</button>').join('')+
 '</div><input class="filter-input" type="search" id="marketSearch" value="'+esc(state.marketSearch)+'" placeholder="Cerca per nome o ticker..." aria-label="Filtra strumenti"></div>'+
 '<p class="markets-gallery-info">Solo candele OHLC reali. Se la fonte non fornisce apertura, massimo, minimo e chiusura, viene indicata la mancata disponibilità.</p>'+
 '<div id="marketRows">'+marketsCards(filtered)+'</div></section>'+feedStatus();
}

function watchlistPage(){
 const assets=state.watch.map(id=>ASSET_BY_ID[id]).filter(Boolean);
 return secHeader('La tua Watchlist','Preferiti memorizzati solo in questo browser','<button type="button" class="btn btn-primary" data-page="markets">'+sym('plus')+' Aggiungi mercati</button>')+
 '<section class="content-card panel"><h3>Strumenti preferiti ('+assets.length+')</h3>'+tableForAssets(assets,'La watchlist è vuota')+
 '<p class="subnote">Apri uno strumento e premi ☆ Watchlist per salvarlo o rimuoverlo.</p></section>'+feedStatus();
}
// Portfolio records remain local to the browser. Every add/edit/delete writes
// a complete validated next array before changing in-memory holdings.
let portfolioEditIndex=-1;
function parsePortfolioNumber(value){
 const raw=String(value==null?'':value).trim().replace(/[\s\u00a0]/g,'');
 if(!raw||!/^[0-9.,]+$/.test(raw))return NaN;
 const commas=(raw.match(/,/g)||[]).length,dots=(raw.match(/\./g)||[]).length;
 let normalized=raw;
 if(commas&&dots){
  // Accept both Italian "1.234,56" and English "1,234.56".
  const decimal=raw.lastIndexOf(',')>raw.lastIndexOf('.')?',':'.';
  normalized=raw.split(decimal==='.'?',':'.').join('').replace(decimal,'.');
 }else if(commas>1||dots>1){
  const sep=commas?',':'.';
  if(!new RegExp('^\\d{1,3}(?:\\'+sep+'\\d{3})+$').test(raw))return NaN;
  normalized=raw.split(sep).join('');
 }else if(commas){
  normalized=raw.replace(',','.');
 }
 if(!/^\d+(?:\.\d+)?$/.test(normalized))return NaN;
 const n=Number(normalized);
 return Number.isFinite(n)?n:NaN;
}
function portfolioUsd(value){
 if(!Number.isFinite(value))return '—';
 return (value<0?'-':'')+'$'+Math.abs(value).toLocaleString('it-IT',
  {minimumFractionDigits:2,maximumFractionDigits:2});
}
function portfolioQuantity(value){
 return Number.isFinite(value)?value.toLocaleString('it-IT',
  {minimumFractionDigits:0,maximumFractionDigits:12}):'—';
}
function portfolioUnitUsd(value){
 return Number.isFinite(value)?formatValue(value,{group:'crypto'}):'—';
}
function portfolioEligible(id){
 const a=ASSET_BY_ID[id];
 return !!a&&['crypto','commodities','bigtech'].includes(a.group);
}
function portfolioRow(holding,index){
 const h=holding&&typeof holding==='object'?holding:{};
 const a=ASSET_BY_ID[h.id]||null;
 const qty=Number(h.qty),cost=Number(h.cost);
 const valid=portfolioEligible(h.id)&&Number.isFinite(qty)&&qty>0&&
  Number.isFinite(cost)&&cost>=0&&Number.isFinite(qty*cost);
 const invested=valid?qty*cost:null;
 const override=h.manualPrice!==null&&h.manualPrice!==undefined&&h.manualPrice!=='';
 const manual=override?Number(h.manualPrice):null;
 const manualValid=override&&Number.isFinite(manual)&&manual>0;
 const q=quote(h.id),market=q&&Number(q.value);
 const marketValid=Number.isFinite(market)&&market>0;
 const price=valid?(manualValid?manual:marketValid?market:null):null;
 const hasPrice=Number.isFinite(price)&&price>0&&Number.isFinite(price*qty);
 const value=hasPrice?price*qty:null;
 const pnl=hasPrice?value-invested:null;
 const source=manualValid?'Manuale':marketValid?'Mercato':'Senza quotazione';
 const time=manualValid?h.manualUpdatedAt:(q&&q.time);
 return {h,index,a,qty,cost,valid,invested,price,hasPrice,value,pnl,source,time};
}
function portfolioTotals(){
 const rows=state.holdings.map(portfolioRow);
 let invested=0,pricedCost=0,value=0,priced=0,invalid=0;
 for(const row of rows){
  if(!row.valid){invalid++;continue}
  invested+=row.invested;
  if(row.hasPrice){value+=row.value;pricedCost+=row.invested;priced++}
 }
 return {invested,value,pricedCost,pnl:value-pricedCost,
  priced,missing:rows.length-priced-invalid,invalid,count:rows.length};
}
function persistPortfolio(next){
 try{
  localStorage.setItem(STORE+'holdings',JSON.stringify(next));
  state.holdings=next;
  return true;
 }catch(_error){
  toast('Salvataggio non riuscito. Verifica lo spazio disponibile nel browser.');
  return false;
 }
}
function portfolioPage(){
 const total=portfolioTotals(),editing=Number.isInteger(portfolioEditIndex)&&
  portfolioEditIndex>=0&&portfolioEditIndex<state.holdings.length;
 const edit=editing?state.holdings[portfolioEditIndex]:null;
 const chosen=editing&&portfolioEligible(edit.id)?edit.id:
  (ASSETS.find(a=>a.group==='crypto')||ASSETS[0]).id;
 const opts=ASSETS.filter(a=>portfolioEligible(a.id)).map(a=>
  '<option value="'+esc(a.id)+'"'+(a.id===chosen?' selected':'')+'>'+esc(a.name)+'</option>').join('');
 const rows=state.holdings.map(portfolioRow);
 const missingText=total.missing||total.invalid?
  ' · '+total.missing+' senza prezzo'+(total.invalid?' · '+total.invalid+' da correggere':''):'';
 return secHeader('Portfolio','Inserisci, modifica e monitora le tue posizioni con prezzi di mercato o manuali.')+
 '<div class="summary-grid portfolio-summary">'+
 overviewCard('Valore delle posizioni quotate',total.priced?portfolioUsd(total.value):'—',total.priced+'/'+(total.count-total.invalid)+' con prezzo disponibile')+
 overviewCard('Capitale di carico',portfolioUsd(total.invested),'Include anche le posizioni senza quotazione')+
 overviewCard('Profitto / perdita stimato',total.priced?portfolioUsd(total.pnl):'—','Solo posizioni con prezzo disponibile',total.priced?trendClass(total.pnl):'')+
 overviewCard('Posizioni',String(total.count),total.priced+' valutate'+missingText)+
 '</div>'+
 '<section class="content-card panel portfolio-editor" id="portfolioEditor">'+
 '<div class="portfolio-section-heading"><div><h3 id="portfolioFormTitle">'+(editing?'Modifica posizione':'Aggiungi una posizione')+'</h3>'+
 '<p>Quantità e prezzi in USD. Puoi usare la virgola o il punto come separatore decimale.</p></div>'+
 '<button type="button" class="btn btn-small" data-portfolio-refresh="1">'+sym('refresh')+' Aggiorna prezzi</button></div>'+
 '<form id="portfolioForm" class="form-grid">'+
 '<div class="form-field"><label for="holdingAsset">Criptovaluta o strumento</label>'+
 '<div class="holding-asset-selector"><span id="holdingAssetLogo">'+assetLogo(ASSET_BY_ID[chosen])+'</span>'+
 '<select id="holdingAsset" name="id" required>'+opts+'</select></div></div>'+
 '<div class="form-field"><label for="holdingQty">Quantità posseduta</label>'+
 '<input id="holdingQty" type="text" inputmode="decimal" autocomplete="off" name="qty" placeholder="Es. 1,25" value="'+
 esc(edit?String(edit.qty):'')+'" required></div>'+
 '<div class="form-field"><label for="holdingCost">Prezzo medio di acquisto (USD per unità)</label>'+
 '<input id="holdingCost" type="text" inputmode="decimal" autocomplete="off" name="cost" placeholder="Es. 125,50" value="'+
 esc(edit?String(edit.cost):'')+'" required></div>'+
 '<div class="form-field"><label for="holdingManualPrice">Prezzo attuale manuale (USD, facoltativo)</label>'+
 '<input id="holdingManualPrice" type="text" inputmode="decimal" autocomplete="off" name="manualPrice" placeholder="Vuoto = prezzo di mercato" value="'+
 esc(edit&&edit.manualPrice!==undefined&&edit.manualPrice!==null?String(edit.manualPrice):'')+'">'+
 '<small>Se inserito, prevale sul prezzo di mercato finché non lo cancelli. È un dato manuale, non live.</small></div>'+
 '<div class="portfolio-entry-preview"><span>Capitale di carico della posizione</span>'+
 '<output id="holdingCostPreview">'+(editing&&portfolioRow(edit,portfolioEditIndex).valid?
  portfolioUsd(portfolioRow(edit,portfolioEditIndex).invested):'—')+'</output></div>'+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">'+sym(editing?'check':'plus')+
 (editing?' Salva modifiche':' Aggiungi posizione')+'</button>'+
 (editing?'<button type="button" class="btn btn-small" data-portfolio-cancel="1">Annulla modifica</button>':'')+
 '</div></form></section>'+
 '<section class="content-card panel portfolio-positions" style="margin-top:13px">'+
 '<div class="portfolio-section-heading"><div><h3>Le tue posizioni</h3><p>Valore e risultato aggiornati quando cambiano le quotazioni disponibili.</p></div></div>'+
 (rows.length?'<div class="data-table-scroll"><table class="data-table portfolio-table">'+
 '<thead><tr><th>Strumento</th><th>Quantità</th><th>Carico unit.</th><th>Investito</th>'+
 '<th>Prezzo attuale</th><th>Valore</th><th>P/L</th><th>Azioni</th></tr></thead><tbody>'+
 rows.map(r=>{
  const h=r.h,a=r.a;
  return '<tr data-portfolio-row="'+r.index+'">'+
   '<td><span class="market-table-asset">'+(a&&showAssetLogo(a)?assetLogo(a):'')+
   '<strong>'+esc(a?a.name:(h.id||'Strumento sconosciuto'))+'</strong></span>'+
   (!r.valid?'<small class="portfolio-quote-status portfolio-invalid">Dati da correggere</small>':'')+'</td>'+
   '<td>'+portfolioQuantity(r.valid?r.qty:NaN)+'</td>'+
   '<td>'+portfolioUnitUsd(r.valid?r.cost:NaN)+'</td>'+
   '<td>'+portfolioUsd(r.invested)+'</td>'+
   '<td data-portfolio-price="'+r.index+'">'+portfolioUnitUsd(r.hasPrice?r.price:NaN)+
   '<small class="portfolio-quote-status">'+esc(r.source)+(r.source==='Manuale'?' · non live':'')+'</small></td>'+
   '<td data-portfolio-value="'+r.index+'">'+portfolioUsd(r.value)+'</td>'+
   '<td data-portfolio-pnl="'+r.index+'" class="'+(r.hasPrice?trendClass(r.pnl):'color-unknown')+'">'+portfolioUsd(r.pnl)+'</td>'+
   '<td><div class="portfolio-row-actions"><button class="btn btn-small" type="button" data-edit-holding="'+r.index+'">Modifica</button>'+
   '<button class="btn btn-small" type="button" data-delete-holding="'+r.index+'">Rimuovi</button></div></td></tr>';
 }).join('')+'</tbody></table></div>':
 '<div class="empty-state"><h3>Nessuna posizione</h3><p>Seleziona uno strumento e inserisci la quantità e il prezzo di acquisto.</p></div>')+
 '<p class="notice">I dati del portafoglio sono salvati soltanto in questo browser. Prezzi di mercato disponibili secondo la fonte, anche ritardati; quelli manuali non si aggiornano da soli. P/L escluso per le posizioni senza prezzo. Non include commissioni, imposte o cambi valutari.</p>'+
 '</section>';
}
const SEC_CATEGORIES=[
 ['all','Tutte le notizie'],['press','Comunicati'],['speeches','Discorsi e dichiarazioni'],
 ['testimony','Testimonianze'],['litigation','Azioni legali'],
 ['administrative','Procedimenti'],['suspensions','Sospensioni'],
 ['rules','Regolamentazione'],['investors','Avvisi investitori'],['edgar','Depositi EDGAR']
];
const secNewsState={items:[],loading:false,loaded:false,error:'',updatedAt:null,seedDate:null,selected:'all',visible:20};
function secNewsDate(value){
 const d=new Date(value);
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Rome'}).format(d):'Data non disponibile';
}
function secNewsSafeLink(value){
 try{const url=new URL(String(value));
  return url.protocol==='https:'&&(url.hostname==='sec.gov'||url.hostname.endsWith('.sec.gov')||url.hostname==='investor.gov'||url.hostname.endsWith('.investor.gov'))?url.href:'';
 }catch(e){return ''}
}
function secNewsCards(items){
 if(!items.length)return '<div class="empty-state"><h3>Nessuna notizia disponibile per questa categoria</h3><p>Prova a scegliere un’altra categoria o visita il sito ufficiale della SEC.</p></div>';
 return items.map(item=>{
  const url=secNewsSafeLink(item.url);
  if(!url)return '';
  const category=SEC_CATEGORIES.find(c=>c[0]===item.category)?.[1]||'SEC';
  return '<article class="sec-news-card"><div class="sec-news-meta"><span class="sec-news-tag">'+esc(category)+'</span><time>'+esc(secNewsDate(item.date))+'</time></div>'+
   '<h3><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.title)+'</a></h3>'+
   (item.summary?'<p>'+esc(item.summary)+'</p>':'')+
   '<a class="sec-news-source" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Leggi la fonte ufficiale SEC '+sym('external')+'</a></article>';
 }).join('');
}
function newsPage(){
 const total=secNewsState.items.length;
 const categories=SEC_CATEGORIES.filter(([id])=>id==='all'||secNewsState.items.some(item=>item.category===id));
 const chosen=secNewsState.selected;
 const selected=chosen==='all'?secNewsState.items:secNewsState.items.filter(item=>item.category===chosen);
 const visible=selected.slice(0,secNewsState.visible);
 const stamp=secNewsState.updatedAt?'Feed aggiornati: '+secNewsDate(secNewsState.updatedAt):
             secNewsState.seedDate?'Archivio iniziale verificato il '+secNewsDate(secNewsState.seedDate):'In attesa dei dati SEC';
 return secHeader('SEC · Notizie ufficiali','Comunicati, provvedimenti, dichiarazioni e depositi EDGAR pubblicati dalla SEC')+
 '<section class="content-card panel sec-news-panel">'+
 '<div class="sec-news-heading"><div><h2>Ultimi aggiornamenti SEC</h2><p class="subnote">'+esc(stamp)+' · '+total+' elementi in archivio · fonte: SEC.gov</p></div>'+
 '<button class="btn btn-small" data-sec-refresh="1" type="button"'+(secNewsState.loading?' disabled':'')+'>'+sym('refresh')+' '+(secNewsState.loading?'Caricamento…':'Aggiorna elenco')+'</button></div>'+
 (secNewsState.error?'<p class="sec-news-warning" role="status">'+esc(secNewsState.error)+'</p>':'')+
 '<div class="sec-news-filters" role="group" aria-label="Filtra notizie SEC">'+
 categories.map(([id,label])=>'<button type="button" data-sec-category="'+id+'" aria-pressed="'+(chosen===id)+'" class="'+(chosen===id?'active':'')+'">'+esc(label)+(id==='all'?' ('+total+')':'')+'</button>').join('')+
 '</div>'+
 (secNewsState.loading&&!secNewsState.loaded?'<p class="subnote">Caricamento delle pubblicazioni ufficiali SEC…</p>':
   '<div class="sec-news-grid">'+secNewsCards(visible)+'</div>')+
 (selected.length>visible.length?'<div class="sec-news-more"><button class="btn" type="button" data-sec-more="1">Carica altre ('+(selected.length-visible.length)+' rimanenti)</button></div>':'')+
 '<p class="data-footnote">Pubblicazioni originali in inglese. La lista raccoglie i feed ufficiali SEC disponibili e non rappresenta l’intero archivio storico. Gli aggiornamenti periodici possono subire ritardi.</p>'+
 '<p class="data-footnote"><a href="https://www.sec.gov/about/rss-feeds" target="_blank" rel="noopener noreferrer">Feed ufficiali SEC</a> · <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent" target="_blank" rel="noopener noreferrer">Ultimi depositi EDGAR</a></p></section>';
}
async function loadSecNews(force=false){
 if(secNewsState.loading||(secNewsState.loaded&&!force))return;
 secNewsState.loading=true;
 if(state.page==='news')render();
 try{
  const response=await fetch('./sec-news.json?v='+(force?Date.now():Math.floor(Date.now()/600000)),{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const result=await response.json();
  if(!result||!Array.isArray(result.items))throw new Error('Formato SEC non valido');
  const parsed=result.items.filter(item=>item&&typeof item.title==='string'&&typeof item.date==='string'&&secNewsSafeLink(item.url)&&typeof item.category==='string')
   .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  secNewsState.items=parsed;
  secNewsState.updatedAt=result.updated_at||null;
  secNewsState.seedDate=result.seed_date||null;
  secNewsState.loaded=true;
  secNewsState.error='';
 }catch(e){
  secNewsState.error=secNewsState.loaded?'Impossibile aggiornare il feed: sono visibili gli ultimi dati salvati.':'Feed SEC temporaneamente non disponibile. Apri i collegamenti SEC per leggere le novità.';
 }finally{
  secNewsState.loading=false;
  if(state.page==='news')render();
 }
}

function analyticsPage(){
 const s=countMarketMood(),total=s.up+s.down;const r=REGIONS.map(x=>({name:x.italian,avg:meanRegion(x),available:x.ids.filter(id=>num(change(id))).length}));
 return secHeader('Global Analytics','Panoramica calcolata dalle variazioni effettivamente disponibili',
 '<a href="#markets" class="btn btn-primary">'+sym('trend')+' Apri grafici avanzati</a>')+
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

/* Real exchange-specific public Spot order books. No estimates or fake levels.
   Binance provides supported USDT spot pairs; ORE Protocol (Solana mint
   oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp) uses LBank Spot ORE/USDT.
   Oraichain uses Gate.io and TARS AI uses MEXC. Only the selected coin
   is polled, with an unavailable state when no verified book is accessible. */
const ORDER_BOOK_COINS=ASSETS.filter(a=>a.group==='crypto');
const orderBookState={
 id:load('orderBookCoin','btc'),search:'',data:null,error:null,busy:false,
 lastTry:0,updatedAt:0,venue:'',pair:'',mode:'',serial:0,abort:null,lastTrade:null,lastTradeAt:0,previousTrade:null
};
if(!ORDER_BOOK_COINS.some(a=>a.id===orderBookState.id))orderBookState.id='btc';
const orderBookLive={
 socket:null,coin:null,transport:'',connected:false,startedAt:0,lastDepthAt:0,
 retryAt:0,attempt:0,session:0,paintTimer:null,pollTimer:null,pollAbort:null,
 polling:false,updateId:0
};
function orderBookIsStreaming(){
 return orderBookLive.coin===orderBookState.id&&orderBookLive.connected&&
  orderBookLive.transport==='ws'&&Date.now()-orderBookLive.lastDepthAt<12000;
}
function orderBookIsFastPolling(){
 return orderBookLive.coin===orderBookState.id&&orderBookLive.transport==='poll'&&
  Date.now()-orderBookLive.lastDepthAt<12000;
}
function orderBookSource(id){
 if(id==='ton')return {
  venue:'Binance Spot',pair:'GRAM/USDT',urls:[
   'https://data-api.binance.vision/api/v3/depth?symbol=GRAMUSDT&limit=20',
   'https://api.binance.com/api/v3/depth?symbol=GRAMUSDT&limit=20'
  ]
 };
 // Current ORE Protocol v2 on Solana. LBank lists the matching ORE/USDT
 // spot market; this is NOT a derivative or the unrelated ORE v1 token.
 if(id==='ore')return {
  venue:'LBank Spot',pair:'ORE/USDT',format:'lbank',
  mint:'oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp',
  urls:[
   'https://api.lbank.info/v2/depth.do?symbol=ore_usdt&size=20',
   'https://api.lbkex.com/v2/depth.do?symbol=ore_usdt&size=20'
  ]
 };
 const binance=STREAM_PAIRS[id];
 if(binance){
  const pair=binance.toUpperCase();
  return {venue:'Binance Spot',pair,urls:[
   'https://data-api.binance.vision/api/v3/depth?symbol='+pair+'&limit=20',
   'https://api.binance.com/api/v3/depth?symbol='+pair+'&limit=20'
  ]};
 }
 if(id==='orai')return {venue:'Gate.io Spot',pair:'ORAI/USDT',urls:[
  'https://api.gateio.ws/api/v4/spot/order_book?currency_pair=ORAI_USDT&limit=20'
 ]};
 if(id==='tai')return {venue:'MEXC Spot',pair:'TAI/USDT',urls:[
  'https://api.mexc.com/api/v3/depth?symbol=TAIUSDT&limit=20'
 ]};
 return null;
}
// Every item is a verified snapshot from one named Spot venue and one USDT pair.
// Never combine bids from one exchange with asks from another exchange.
function cryptoBookBundle(){
 const p=window.__VERTEX_CRYPTO_BOOKS__;
 return p&&p.books&&typeof p.books==='object'?p:null;
}
function cryptoBookEntry(id){
 const p=cryptoBookBundle(),a=ASSET_BY_ID[id],b=p&&p.books[id];
 if(!a||a.group!=='crypto'||!b||b.id!==id)return null;
 const symbol=id==='ton'?'GRAM':a.symbol.replace('-USD','');
 if(b.unit!==symbol||b.pair!==symbol+'/USDT'||!Array.isArray(b.bids)||!Array.isArray(b.asks))return null;
 if(id==='ore'&&b.mint!=='oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp')return null;
 const t=Date.parse(b.capturedAt||'');
 if(!Number.isFinite(t)||t>Date.now()+60000||Date.now()-t>3*60*60*1000)return null;
 if(!['Binance Spot','Gate Spot','MEXC Spot','LBank Spot'].includes(b.venue))return null;
 const bids=b.bids.map(r=>[Number(r[0]),Number(r[1])])
  .filter(r=>r.length===2&&r.every(x=>Number.isFinite(x)&&x>0)).sort((a,b)=>b[0]-a[0]).slice(0,20);
 const asks=b.asks.map(r=>[Number(r[0]),Number(r[1])])
  .filter(r=>r.length===2&&r.every(x=>Number.isFinite(x)&&x>0)).sort((a,b)=>a[0]-b[0]).slice(0,20);
 if(!bids.length||!asks.length||bids[0][0]>=asks[0][0])return null;
 const trade=Number(b.lastTrade),tradeTime=Date.parse(b.lastTradeAt||'');
 const lastTrade=Number.isFinite(trade)&&trade>0&&Number.isFinite(tradeTime)&&
  tradeTime>=t-60000&&tradeTime<=t+60000?trade:null;
 const previous=Number(b.previousTrade),previousAt=Date.parse(b.previousTradeAt||'');
 const previousTrade=lastTrade!==null&&Number.isFinite(previous)&&previous>0&&
  Number.isFinite(previousAt)&&previousAt<t&&t-previousAt<=3*60*60*1000?previous:null;
 return {bids,asks,unit:symbol,pair:b.pair,venue:b.venue,time:t,lastTrade,
  lastTradeAt:lastTrade!==null?tradeTime:0,previousTrade};
}
function useCryptoBookEntry(id,serial){
 const book=cryptoBookEntry(id);
 if(!book||serial!==orderBookState.serial||id!==orderBookState.id)return false;
 if(orderBookIsStreaming()||orderBookIsFastPolling())return true;
 if(orderBookState.data&&orderBookState.mode==='snapshot'&&orderBookState.updatedAt>=book.time)
  return true;
 orderBookState.data={bids:book.bids,asks:book.asks,unit:book.unit};
 orderBookState.venue=book.venue;
 orderBookState.pair=book.pair;
 orderBookState.updatedAt=book.time;
 orderBookState.lastTrade=book.lastTrade;
 orderBookState.lastTradeAt=book.lastTradeAt;
 orderBookState.previousTrade=book.previousTrade;
 orderBookState.mode='snapshot';
 orderBookState.error=null;
 paintOrderBook();
 return true;
}
function updateOrderBookAssetList(){
 if(state.page!=='orderbook')return;
 const list=$('#orderBookAssetList');
 if(list){
  const top=list.scrollTop;
  list.innerHTML=orderBookAssetList();
  list.scrollTop=top;
 }
 const coverage=$('#orderBookCoverage');
 if(coverage)coverage.textContent=ORDER_BOOK_COINS.filter(a=>!!cryptoBookEntry(a.id)).length+'/'+ORDER_BOOK_COINS.length+' book';
}
// Local JS backup works for file:// and every OS. HTTP JSON refreshes the cache.
async function loadAllCryptoBooks(serial,coin){
 let hasBook=useCryptoBookEntry(coin,serial);
 if(serial!==orderBookState.serial)return false;
 const bundle=cryptoBookBundle();
 const fetched=Date.parse(bundle&&bundle.generatedAt||'');
 if(hasBook&&Number.isFinite(fetched)&&Date.now()-fetched<60000)return true;
 const urlBase='https://raw.githubusercontent.com/alerai1994/Dashboard-/main/crypto-orderbooks.json';
 const cdn='https://cdn.jsdelivr.net/gh/alerai1994/Dashboard-@main/crypto-orderbooks.json';
 const urls=location.protocol==='file:'?[urlBase,cdn]:['crypto-orderbooks.json',urlBase,cdn];
 for(const url of urls){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),2700);
  try{
   const response=await fetch(url+(url.includes('?')?'&':'?')+'v='+Date.now(),
     {cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   const payload=await response.json();
   if(!payload||!payload.books||typeof payload.books!=='object'||payload.totalAssets!==42)
    throw Error('Snapshot crypto non valido');
   const old=Date.parse(cryptoBookBundle()&&cryptoBookBundle().generatedAt||'')||0;
   const next=Date.parse(payload.generatedAt||'')||0;
   if(next>=old){
    window.__VERTEX_CRYPTO_BOOKS__=payload;
    updateOrderBookAssetList();
   }
   hasBook=useCryptoBookEntry(coin,serial)||hasBook;
   if(hasBook)return true;
  }catch(_err){/* CORS, timeout, or missing book: keep trying known sources. */}
  finally{clearTimeout(timeout);}
  if(serial!==orderBookState.serial)return false;
 }
 return hasBook;
}

function orderBookAssetList(){
 const needle=orderBookState.search.trim().toLowerCase();
 const assets=ORDER_BOOK_COINS.filter(a=>(a.name+' '+a.short+' '+a.symbol).toLowerCase().includes(needle));
 if(!assets.length)return '<div class="ob-empty-list">Nessuna crypto trovata.</div>';
 return assets.map(a=>{
  const src=orderBookSource(a.id),book=cryptoBookEntry(a.id),selected=orderBookState.id===a.id;
  const age=book?Math.floor((Date.now()-book.time)/60000):null;
  const price=book?'<span class="ob-coin-prices"><span class="color-up" title="Miglior prezzo BID">BID '+orderBookNumber(book.bids[0][0],true)+'</span><span class="color-down" title="Miglior prezzo ASK">ASK '+orderBookNumber(book.asks[0][0],true)+'</span></span>':'<span class="ob-coin-unavailable">Book in attesa</span>';
  return '<button class="ob-coin'+(selected?' is-selected':'')+'" data-order-book-asset="'+esc(a.id)+'" type="button" aria-pressed="'+selected+'">'+
   '<span class="ob-coin-logo">'+assetLogo(a)+'</span><span class="ob-coin-label"><strong>'+esc(a.short||a.name)+'</strong><small>'+esc(a.id==='ton'?'TON → GRAM':a.symbol.replace('-USD',''))+(book?' · '+esc(book.venue)+(age>30?' · '+age+' min':''):'')+'</small>'+price+'</span>'+
   '<span class="ob-coin-venue" title="'+esc(book?book.venue:(src?src.venue+' · in attesa':'Coppia non verificata'))+'">'+(book?'●':'—')+'</span></button>';
 }).join('');
}
function orderBookPage(){
 const coin=ASSET_BY_ID[orderBookState.id]||ORDER_BOOK_COINS[0],snap=cryptoBookEntry(coin.id),source=snap?{venue:snap.venue,pair:snap.pair}:orderBookSource(coin.id);
 return secHeader('Order Book Crypto','Profondità Spot reale, per exchange e coppia USDT. Nessun ordine simulato.')+
 '<div class="ob-layout"><aside class="ob-picker panel" aria-label="Seleziona una criptovaluta">'+
 '<div class="ob-picker-header"><strong>Tutte le criptovalute</strong><span id="orderBookCoverage">'+ORDER_BOOK_COINS.filter(a=>!!cryptoBookEntry(a.id)).length+'/'+ORDER_BOOK_COINS.length+' book</span></div>'+
 '<label class="ob-search-label" for="orderBookSearch">Cerca crypto</label>'+
 '<input type="search" class="ob-search" id="orderBookSearch" placeholder="Nome o simbolo..." value="'+esc(orderBookState.search)+'" autocomplete="off">'+
 '<div class="ob-coin-list" id="orderBookAssetList">'+orderBookAssetList()+'</div></aside>'+
 '<section class="ob-detail panel" aria-label="Order book della crypto selezionata">'+
 '<div class="ob-detail-heading"><div class="ob-heading-name">'+assetLogo(coin)+'<div><h2>'+esc(coin.name)+'</h2>'+
 '<small>'+esc(source?source.venue+' · '+source.pair:'Coppia Spot non verificata')+'</small>'+(coin.id==='ton'?'<small>Toncoin rinominato GRAM (1:1)</small>':'')+'</div></div>'+
 '<button class="btn btn-small" type="button" data-order-book-refresh="1" aria-label="Aggiorna order book">'+sym('refresh')+' Aggiorna</button></div>'+
 '<div class="ob-content" id="orderBookContent" aria-live="off">'+orderBookDisplay()+'</div>'+
 '<p class="ob-footnote">Order Book Spot della criptovaluta selezionata: Binance, Gate e LBank ricevono aggiornamenti WebSocket in streaming (fino a 100 ms, secondo la fonte); MEXC utilizza richieste REST ogni circa 3 secondi, non uno stream live. Il badge indica se i dati sono LIVE, aggiornati con polling o uno snapshot di riserva. Solo livelli reali della coppia indicata, mai simulati. Se la rete o la fonte si interrompe, sono segnalati come non aggiornati. La pagina deve rimanere aperta.</p>'+
 '</section></div>';
}
function orderBookNumber(v,price=false){
 const n=Number(v);if(!Number.isFinite(n))return '—';
 const decimals=price?(n>0?Math.min(12,Math.max(2,Math.ceil(-Math.log10(n))+5)):2):Math.min(8,n<.001?8:n<1?6:4);
 return n.toLocaleString('it-IT',{minimumFractionDigits:price&&n>=1?2:0,maximumFractionDigits:decimals});
}
function orderBookSide(orders,side,unit){
 const isBid=side==='bid',sideName=isBid?'BID · Acquisti':'ASK · Vendite';
 const maxCumulative=orders.reduce((sum,[price,qty])=>sum+price*qty,0);
 const quantityUnit=esc(unit);
 // ASK: higher asks first; best/lowest ask immediately ABOVE the center price.
 // BID: best/highest bid first; immediately BELOW the center price.
 let cumulative=0;
 const depthRows=orders.map(([price,qty])=>{
  const total=price*qty;cumulative+=total;
  return {price,qty,total,cumulative};
 });
 const displayRows=isBid?depthRows:depthRows.slice().reverse();
 return '<section class="ob-side ob-'+side+'" aria-label="'+sideName+'">'+
 '<div class="ob-side-title"><strong><span class="ob-side-dot" aria-hidden="true">●</span> '+sideName+'</strong>'+
 '<small>'+orders.length+' livelli · '+(isBid?'Miglior BID in alto':'Miglior ASK in basso, vicino al prezzo centrale')+'</small></div>'+
 '<div class="ob-table-scroll" role="region" tabindex="0" aria-label="'+sideName+': prezzi, quantità e totali">'+
 '<table class="ob-book-table"><thead><tr>'+
 '<th scope="col">Prezzo <small>USDT</small></th>'+
 '<th scope="col">Quantità <small>'+quantityUnit+'</small></th>'+
 '<th scope="col">Totale <small>USDT</small></th>'+
 '<th scope="col" class="ob-depth-th">Profondità</th>'+
 '</tr></thead><tbody>'+
 displayRows.map(({price,qty,total,cumulative})=>{
  // Real cumulative quote depth measured from the best offer on this same side.
  const depth=maxCumulative>0?Math.min(100,Math.max(0,cumulative/maxCumulative*100)):0;
  return '<tr class="ob-level" style="--depth:'+depth.toFixed(2)+'%" title="Livello '+(isBid?'BID':'ASK')+' · Totale cumulato dalla migliore offerta: '+orderBookNumber(cumulative)+' USDT">'+
   '<td class="ob-level-price">'+orderBookNumber(price,true)+'</td>'+
   '<td class="ob-level-quantity">'+orderBookNumber(qty)+'</td>'+
   '<td class="ob-level-total">'+orderBookNumber(total)+'</td>'+
   '<td class="ob-level-depth" title="Profondità cumulata: '+orderBookNumber(cumulative)+' USDT ('+depth.toFixed(1)+'%)">'+
    '<span class="ob-cumulative-track" aria-hidden="true"><span class="ob-cumulative-fill" style="width:'+depth.toFixed(2)+'%"></span></span></td></tr>';
 }).join('')+'</tbody></table></div>'+
 '<div class="ob-side-footer"><span>Totale '+orders.length+' livelli '+(isBid?'BID':'ASK')+'</span><strong>'+orderBookNumber(cumulative)+' USDT</strong></div></section>';
}
function orderBookDisplay(){
 const src=orderBookSource(orderBookState.id);
 if(!src)return '<div class="ob-status"><strong>Order book Spot non disponibile</strong><p>Per questa crypto non è stata verificata una coppia di order book corrispondente. Non vengono mostrati ordini di un token omonimo o dati stimati.</p></div>';
 const book=orderBookState.data,stale=book&&Date.now()-orderBookState.updatedAt>30000;
 if(!book)return '<div class="ob-status"><strong>'+(orderBookState.busy?'Caricamento degli ordini reali…':'Dati non disponibili')+'</strong>'+
 '<p>'+esc(orderBookState.error||'Lettura del book Spot da '+src.venue+' in corso. Se la fonte non risponde, comparirà un avviso.')+'</p></div>';
 const bids=book.bids,asks=book.asks,bid=bids[0][0],ask=asks[0][0],mid=(ask+bid)/2;
 const stamp=orderBookState.updatedAt?new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(orderBookState.updatedAt)):'—';
 const changed=orderBookState.error?'<div class="ob-inline-warning">'+esc(orderBookState.error)+'</div>':'';
 const snapshotAge=Math.max(0,Date.now()-orderBookState.updatedAt);
 const delayed=orderBookState.mode==='snapshot'&&snapshotAge>30*60*1000;
 const snapshotLabel=delayed?'⚠ BOOK NON IN TEMPO REALE · Ultima verifica '+Math.floor(snapshotAge/60000)+' min fa':'◌ Snapshot verificato · '+Math.floor(snapshotAge/60000)+' min fa';
 const mode=orderBookState.mode;
 const isStreaming=orderBookIsStreaming(),isPolling=orderBookIsFastPolling();
 const bookMode=isStreaming?'live':isPolling?'poll':mode==='live'||mode==='poll'?'stale':'snapshot';
 const sourceLabel=isStreaming?'● LIVE · WebSocket · dati aggiornati '+Math.floor(snapshotAge/1000)+' s fa':
  isPolling?'● AGGIORNAMENTO RAPIDO · REST ogni ~3 s · '+Math.floor(snapshotAge/1000)+' s fa':
  bookMode==='stale'?'⚠ Aggiornamento interrotto · ultima ricezione '+Math.floor(snapshotAge/1000)+' s fa':
  snapshotLabel+(orderBookLive.coin===orderBookState.id&&orderBookLive.transport==='ws'?' · Connessione live in corso':'');
 const traded=Number(orderBookState.lastTrade);
 const hasTrade=Number.isFinite(traded)&&traded>0&&orderBookState.lastTradeAt>=orderBookState.updatedAt-60000;
 const referencePrice=hasTrade?traded:mid;
 const priceTitle=hasTrade?'ULTIMO PREZZO SCAMBIATO':'PREZZO CENTRALE INDICATIVO';
 const previous=Number(orderBookState.previousTrade);
 const hasPrevious=hasTrade&&Number.isFinite(previous)&&previous>0;
 const priceTrend=hasPrevious?(traded>previous?'up':traded<previous?'down':'flat'):'unknown';
 const priceArrow=priceTrend==='up'?'↗':priceTrend==='down'?'↘':'→';
 const arrowHint=priceTrend==='up'?'Prezzo in rialzo rispetto alla rilevazione precedente':
  priceTrend==='down'?'Prezzo in ribasso rispetto alla rilevazione precedente':
  priceTrend==='flat'?'Prezzo invariato rispetto alla rilevazione precedente':'Direzione non disponibile: manca un prezzo precedente verificato';
 return '<div class="ob-market-status ob-market-'+bookMode+'" data-orderbook-connection="'+bookMode+'">'+sourceLabel+
 ' · '+esc(orderBookState.venue||src.venue)+' · '+stamp+'</div>'+changed+
 '<div class="ob-book-stack" aria-label="Order Book verticale: vendite, prezzo di scambio e acquisti">'+
 orderBookSide(asks,'ask',book.unit)+
 '<section class="ob-trade-price" aria-label="'+esc(priceTitle)+'">'+
 '<div class="ob-trade-value"><small>'+priceTitle+'</small>'+
 '<strong class="ob-trade-number">'+orderBookNumber(referencePrice,true)+
 ' <span class="ob-price-arrow ob-price-arrow-'+priceTrend+'" title="'+esc(arrowHint)+'" aria-label="'+esc(arrowHint)+'">'+priceArrow+'</span>'+
 ' <span class="ob-trade-currency">USDT</span></strong></div>'+
 '</section>'+
 orderBookSide(bids,'bid',book.unit)+
 '</div>';
}
function paintOrderBook(){
 const node=$('#orderBookContent');
 if(node&&state.page==='orderbook'){
  // Preserve horizontal/vertical scroll while real market data updates.
  const oldScroll=[...node.querySelectorAll('.ob-table-scroll')].map(el=>({x:el.scrollLeft,y:el.scrollTop}));
  node.innerHTML=orderBookDisplay();
  [...node.querySelectorAll('.ob-table-scroll')].forEach((el,i)=>{
   if(oldScroll[i]){el.scrollLeft=oldScroll[i].x;el.scrollTop=oldScroll[i].y}
  });
  if((orderBookIsStreaming()||orderBookIsFastPolling())&&orderBookState.data){
   const row=$('#orderBookAssetList [data-order-book-asset="'+orderBookState.id+'"]');
   const summary=row&&row.querySelector('.ob-coin-prices');
   if(summary&&orderBookState.data.bids.length&&orderBookState.data.asks.length){
    summary.innerHTML='<span class="color-up">BID '+orderBookNumber(orderBookState.data.bids[0][0],true)+
     '</span><span class="color-down">ASK '+orderBookNumber(orderBookState.data.asks[0][0],true)+'</span>';
   }
  }
 }
}
function cancelOrderBookFetch(){
 orderBookState.serial++;
 if(orderBookState.abort){orderBookState.abort.abort();orderBookState.abort=null;}
 orderBookState.busy=false;
}
// REAL Spot streaming: one active pair only. Binance partial top-20 and Gate
// limited-level order-book messages are complete snapshots, NOT diff patches.
// LBank depth messages also contain complete bids/asks. MEXC currently sends
// Protobuf depth, so its REST fallback is explicitly marked fast POLLING.
function liveBookConfig(id){
 const snapshot=cryptoBookEntry(id),source=orderBookSource(id);
 if(!source&&!snapshot)return null;
 const venue=snapshot?snapshot.venue:source.venue;
 const pair=snapshot?snapshot.pair:source.pair;
 if(!pair||!pair.endsWith('/USDT'))return null;
 const symbol=pair.replace('/','');
 if(venue==='Binance Spot')return {venue,pair,symbol,kind:'binance',
  url:'wss://data-stream.binance.vision/stream?streams='+symbol.toLowerCase()+
   '@depth20@100ms/'+symbol.toLowerCase()+'@trade'};
 if(venue==='Gate Spot'||venue==='Gate.io Spot')return {venue:'Gate Spot',pair,
  symbol,pairCode:pair.replace('/','_'),kind:'gate',url:'wss://api.gateio.ws/ws/v4/'};
 if(venue==='LBank Spot')return {venue,pair,symbol,pairCode:pair.toLowerCase().replace('/','_'),
  kind:'lbank',url:'wss://api.lbank.info/ws/V2/'};
 if(venue==='MEXC Spot')return {venue,pair,symbol,kind:'poll',
  url:'https://api.mexc.com/api/v3/depth?symbol='+symbol+'&limit=20',
  priceUrl:'https://api.mexc.com/api/v3/ticker/price?symbol='+symbol};
 return null;
}
function normalizeLiveLevels(rawBids,rawAsks){
 const side=(rows,desc)=>Array.isArray(rows)?rows.map(row=>
   Array.isArray(row)&&row.length>1?[Number(row[0]),Number(row[1])]:[NaN,NaN])
  .filter(([price,qty])=>Number.isFinite(price)&&Number.isFinite(qty)&&price>0&&qty>0)
  .sort((a,b)=>desc?b[0]-a[0]:a[0]-b[0]).slice(0,20):[];
 const bids=side(rawBids,true),asks=side(rawAsks,false);
 return bids.length&&asks.length&&bids[0][0]<asks[0][0]?{bids,asks}:null;
}
function scheduleOrderBookLivePaint(){
 if(orderBookLive.paintTimer!==null)return;
 // Cap DOM table refreshes at ~4/sec, even for 100ms market-data streams.
 orderBookLive.paintTimer=setTimeout(()=>{
  orderBookLive.paintTimer=null;
  if(state.page==='orderbook'&&!document.hidden)paintOrderBook();
 },250);
}
function receiveLiveBook(coin,config,rawBids,rawAsks,sequence){
 if(orderBookLive.coin!==coin||state.page!=='orderbook'||document.hidden)return false;
 const validated=normalizeLiveLevels(rawBids,rawAsks);
 if(!validated)return false;
 const id=Number(sequence);
 if(Number.isFinite(id)&&id>0){
  if(orderBookLive.updateId&&id<=orderBookLive.updateId)return false;
  orderBookLive.updateId=id;
 }
 orderBookState.data={...validated,unit:config.pair.split('/')[0]};
 orderBookState.updatedAt=Date.now(); // last RECEIVED genuine Spot book update
 orderBookState.venue=config.venue;orderBookState.pair=config.pair;
 orderBookState.mode=config.kind==='poll'?'poll':'live';
 orderBookState.error=null;orderBookState.busy=false;
 orderBookLive.lastDepthAt=orderBookState.updatedAt;
 orderBookLive.connected=true;orderBookLive.attempt=0;orderBookLive.retryAt=0;
 scheduleOrderBookLivePaint();
 return true;
}
function receiveLiveTrade(coin,config,rawPrice){
 if(coin!==orderBookLive.coin||state.page!=='orderbook'||document.hidden)return;
 const price=Number(rawPrice);
 if(!Number.isFinite(price)||price<=0)return;
 const old=Number(orderBookState.lastTrade);
 if(Number.isFinite(old)&&old>0&&old!==price)orderBookState.previousTrade=old;
 orderBookState.lastTrade=price;orderBookState.lastTradeAt=Date.now();
 scheduleOrderBookLivePaint();
}
function stopOrderBookLive(){
 ++orderBookLive.session;
 if(orderBookLive.paintTimer!==null){
  clearTimeout(orderBookLive.paintTimer);orderBookLive.paintTimer=null;
 }
 if(orderBookLive.pollTimer!==null){
  clearInterval(orderBookLive.pollTimer);orderBookLive.pollTimer=null;
 }
 if(orderBookLive.pollAbort){orderBookLive.pollAbort.abort();orderBookLive.pollAbort=null;}
 const ws=orderBookLive.socket;orderBookLive.socket=null;
 if(ws){ws.onopen=null;ws.onmessage=null;ws.onerror=null;ws.onclose=null;try{ws.close()}catch(_e){}}
 orderBookLive.coin=null;orderBookLive.transport='';orderBookLive.connected=false;
 orderBookLive.startedAt=0;orderBookLive.lastDepthAt=0;orderBookLive.updateId=0;
 orderBookLive.polling=false;
}
async function pollOrderBookOnce(coin,config,session){
 if(orderBookLive.polling||orderBookLive.session!==session||state.page!=='orderbook'||
  document.hidden||!navigator.onLine)return;
 orderBookLive.polling=true;
 const controller=new AbortController();orderBookLive.pollAbort=controller;
 const abortTimer=setTimeout(()=>controller.abort(),4200);
 try{
  const response=await fetch(config.url,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  const payload=await response.json();
  if(orderBookLive.session!==session)return;
  if(!payload||!Array.isArray(payload.bids)||!Array.isArray(payload.asks))
   throw Error('Book non valido');
  if(receiveLiveBook(coin,config,payload.bids,payload.asks,payload.lastUpdateId)){
   // Last trade is queried less frequently than depth; it is not synthesized.
   if(Date.now()-(orderBookLive.lastTradeRequestAt||0)>10000){
    orderBookLive.lastTradeRequestAt=Date.now();
    fetch(config.priceUrl,{cache:'no-store',signal:controller.signal})
     .then(res=>res.ok?res.json():null)
     .then(data=>{if(orderBookLive.session===session&&data)receiveLiveTrade(coin,config,data.price)})
     .catch(()=>{});
   }
  }
 }catch(_e){
  if(orderBookLive.session===session){
   orderBookLive.connected=false;
   scheduleOrderBookLivePaint();
  }
 }finally{
  clearTimeout(abortTimer);
  if(orderBookLive.pollAbort===controller)orderBookLive.pollAbort=null;
  orderBookLive.polling=false;
 }
}
function startOrderBookLive(force=false){
 if(state.page!=='orderbook'||document.hidden||!navigator.onLine)return;
 const coin=orderBookState.id,config=liveBookConfig(coin);
 if(!config)return;
 if(!force&&Date.now()<orderBookLive.retryAt)return;
 if(!force&&orderBookLive.coin===coin&&
   (orderBookLive.transport==='poll'||(orderBookLive.socket&&orderBookLive.socket.readyState<=1)))return;
 stopOrderBookLive();
 const session=orderBookLive.session;
 orderBookLive.coin=coin;orderBookLive.startedAt=Date.now();
 orderBookLive.transport=config.kind==='poll'?'poll':'ws';
 if(config.kind==='poll'){
  pollOrderBookOnce(coin,config,session);
  orderBookLive.pollTimer=setInterval(()=>pollOrderBookOnce(coin,config,session),3000);
  return;
 }
 if(typeof WebSocket!=='function'){
  orderBookLive.retryAt=Date.now()+30000;return;
 }
 try{
  const endpoint=config.kind==='binance'&&orderBookLive.attempt%2===1?
   config.url.replace('wss://data-stream.binance.vision/','wss://stream.binance.com:9443/'):
   config.url;
  const ws=new WebSocket(endpoint);
  orderBookLive.socket=ws;
  ws.onopen=()=>{
   if(orderBookLive.session!==session)return;
   if(config.kind==='gate'){
    const req=(channel,payload)=>ws.send(JSON.stringify({
     time:Math.floor(Date.now()/1000),channel,event:'subscribe',payload
    }));
    req('spot.order_book',[config.pairCode,'20','100ms']);
    req('spot.trades',[config.pairCode]);
   }else if(config.kind==='lbank'){
    ws.send(JSON.stringify({action:'subscribe',subscribe:'depth',depth:'50',pair:config.pairCode}));
    ws.send(JSON.stringify({action:'subscribe',subscribe:'trade',pair:config.pairCode}));
   }
  };
  ws.onmessage=event=>{
   if(orderBookLive.session!==session||orderBookLive.coin!==coin)return;
   let msg;
   try{msg=JSON.parse(event.data)}catch(_e){return}
   if(config.kind==='binance'){
    if(!msg||typeof msg!=='object')return;
    const d=msg.data||msg;
    if(msg.stream&&msg.stream.startsWith(config.symbol.toLowerCase()+'@depth20@')&&
       Array.isArray(d.bids)&&Array.isArray(d.asks))
     receiveLiveBook(coin,config,d.bids,d.asks,d.lastUpdateId);
    else if(d.e==='trade'&&d.s===config.symbol)receiveLiveTrade(coin,config,d.p);
   }else if(config.kind==='gate'){
    if(msg.event!=='update'||!msg.result)return;
    const d=msg.result;
    if(msg.channel==='spot.order_book'&&d.s===config.pairCode)
     receiveLiveBook(coin,config,d.bids,d.asks,d.lastUpdateId);
    else if(msg.channel==='spot.trades'&&d.currency_pair===config.pairCode)
     receiveLiveTrade(coin,config,d.price);
   }else if(config.kind==='lbank'){
    if(msg&&msg.ping&&(msg.action==='ping'||!msg.action)){
     if(ws.readyState===1)ws.send(JSON.stringify({action:'pong',pong:msg.ping}));
     return;
    }
    if(msg.pair!==config.pairCode)return;
    if(msg.type==='depth'&&msg.depth)receiveLiveBook(coin,config,msg.depth.bids,msg.depth.asks);
    else if(msg.type==='trade'&&msg.trade)receiveLiveTrade(coin,config,msg.trade.price);
   }
  };
  ws.onerror=()=>{if(orderBookLive.session===session)orderBookLive.connected=false};
  ws.onclose=()=>{
   if(orderBookLive.session!==session)return;
   orderBookLive.socket=null;orderBookLive.connected=false;
   orderBookLive.attempt+=1;
   orderBookLive.retryAt=Date.now()+Math.min(30000,2000*Math.pow(2,Math.min(4,orderBookLive.attempt)));
   scheduleOrderBookLivePaint();
  };
 }catch(_e){
  orderBookLive.socket=null;orderBookLive.connected=false;
  orderBookLive.retryAt=Date.now()+10000;
 }
}
function keepOrderBookLive(){
 if(state.page!=='orderbook'||document.hidden||!navigator.onLine)return;
 if(orderBookLive.transport==='poll'&&orderBookLive.coin===orderBookState.id)return;
 if(orderBookLive.coin===orderBookState.id&&orderBookLive.socket){
  // A socket may be OPEN but silent (invalid pair/subscription). Recover.
  const noDataFor=Date.now()-(orderBookLive.lastDepthAt||orderBookLive.startedAt);
  if(noDataFor<15000)return;
  stopOrderBookLive();
  orderBookLive.attempt+=1;
  orderBookLive.retryAt=Date.now()+5000;
  scheduleOrderBookLivePaint();
  return;
 }
 if(Date.now()>=orderBookLive.retryAt)startOrderBookLive();
}

function selectOrderBookAsset(id){
 if(!ASSET_BY_ID[id]||ASSET_BY_ID[id].group!=='crypto')return;
 if(id!==orderBookState.id){
  stopOrderBookLive();
  cancelOrderBookFetch();
  orderBookState.id=id;orderBookState.data=null;orderBookState.error=null;
  orderBookState.lastTry=0;orderBookState.updatedAt=0;orderBookState.venue='';orderBookState.mode='';
  orderBookState.lastTrade=null;orderBookState.lastTradeAt=0;orderBookState.previousTrade=null;
  save('orderBookCoin',id);
 }
 if(state.page==='orderbook')render();
}
// GitHub Pages serves the last VERIFIED LBank depth snapshot when browser CORS blocks the API.
// GitHub Actions publishes real ORE/USDT Spot depth. Same-origin works online;
// raw.githubusercontent.com works when index.html is opened as file:// on any OS.
// Validate and display only actual LBank ORE/USDT orders; never invent levels.
// A verified, dated snapshot can survive a temporarily delayed GitHub Action.
function acceptOreBookSnapshot(payload,serial,coin){
 const src=orderBookSource('ore');
 if(!payload||payload.mint!==src.mint||payload.pair!=='ORE/USDT')
  throw Error('Mercato ORE non verificato');
 const updated=Date.parse(payload.capturedAt||'');
 const age=Date.now()-updated;
 if(!Number.isFinite(updated)||age< -60000||age>3*60*60*1000)
  throw Error('Ultimo snapshot oltre 3 ore: non più affidabile');
 const levels=(rows,descending)=>{
  if(!Array.isArray(rows))return [];
  return rows.map(row=>[Number(row[0]),Number(row[1])])
   .filter(([p,q])=>Number.isFinite(p)&&Number.isFinite(q)&&p>0&&q>0)
   .sort((x,y)=>descending?y[0]-x[0]:x[0]-y[0]).slice(0,20);
 };
 const bids=levels(payload.bids,true),asks=levels(payload.asks,false);
 if(!bids.length||!asks.length||bids[0][0]>=asks[0][0])throw Error('Book BID/ASK non valido');
 if(serial!==orderBookState.serial||coin!==orderBookState.id)return false;
 if(orderBookIsStreaming()||orderBookIsFastPolling())return true;
 // Do not overwrite a more recent real snapshot with an older CDN cache.
 if(orderBookState.data&&orderBookState.mode==='snapshot'&&orderBookState.updatedAt>=updated)
  return true;
 orderBookState.data={bids,asks,unit:'ORE'};
 orderBookState.updatedAt=updated;
 orderBookState.venue=payload.venue||'LBank Spot';
 orderBookState.lastTrade=null;orderBookState.lastTradeAt=0;orderBookState.previousTrade=null;
 orderBookState.mode='snapshot';
 orderBookState.error=null;
 paintOrderBook();
 return true;
}
async function loadOreBookSnapshot(serial,coin){
 if(coin!=='ore')return false;
 let hasVerifiedData=false;
 const errors=[];
 // Loaded as a classic script: also works from local file:// on Windows,
 // macOS and Linux, where browsers disallow fetch() of local JSON files.
 try{
  if(window.__VERTEX_ORE_BOOK__)
   hasVerifiedData=acceptOreBookSnapshot(window.__VERTEX_ORE_BOOK__,serial,coin);
 }catch(err){errors.push('File locale: '+(err.message||'non valido'));}
 if(serial!==orderBookState.serial)return false;
 const root='https://raw.githubusercontent.com/alerai1994/Dashboard-/main/ore-orderbook.json';
 const cdn='https://cdn.jsdelivr.net/gh/alerai1994/Dashboard-@main/ore-orderbook.json';
 const urls=location.protocol==='file:'?[root,cdn]:['ore-orderbook.json',root,cdn];
 for(const url of urls){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),3000);
  try{
   const response=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),
    {cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   const payload=await response.json();
   if(acceptOreBookSnapshot(payload,serial,coin))return true;
  }catch(err){errors.push(err&&err.name==='AbortError'?'timeout':(err.message||'connessione'));}
  finally{clearTimeout(timeout);}
  if(serial!==orderBookState.serial)return false;
 }
 if(hasVerifiedData)return true;
 throw Error('Snapshot verificato non raggiungibile: '+errors.join('; '));
}
async function refreshOrderBook(force=false){
 if(state.page!=='orderbook'||document.hidden)return;
 if(!force&&(orderBookIsStreaming()||orderBookIsFastPolling()))return;
 if(orderBookState.busy&&!force)return;
 if(!force&&Date.now()-orderBookState.lastTry<14000)return;
 const src=orderBookSource(orderBookState.id);
 if(!src){orderBookState.error=null;orderBookState.data=null;orderBookState.lastTry=Date.now();paintOrderBook();return;}
 if(orderBookState.busy)cancelOrderBookFetch();
 const serial=++orderBookState.serial,coin=orderBookState.id;
 orderBookState.busy=true;orderBookState.lastTry=Date.now();orderBookState.error=null;
 paintOrderBook();
 // Verified snapshot covers every listed crypto, including local Windows/Mac/Linux.
 let backupFailure='';
 try{
  if(await loadAllCryptoBooks(serial,coin)){
   if(serial===orderBookState.serial){
    orderBookState.lastTry=Date.now();orderBookState.busy=false;paintOrderBook();
   }
   return;
  }
 }catch(err){backupFailure=err&&err.message?err.message:'Snapshot non raggiungibile';}
 if(serial!==orderBookState.serial)return;
 // Preserve existing dedicated ORE backup while the new 42-book feed starts.
 if(coin==='ore'){
  try{
   if(await loadOreBookSnapshot(serial,coin)){
    if(serial===orderBookState.serial){
     orderBookState.lastTry=Date.now();orderBookState.busy=false;paintOrderBook();
    }
    return;
   }
  }catch(err){backupFailure=err&&err.message?err.message:backupFailure;}
  if(serial!==orderBookState.serial)return;
 }
 let success=false,failure=backupFailure||'La fonte non risponde o blocca le richieste dal browser.';
 for(const url of src.urls){
  const controller=new AbortController();
  orderBookState.abort=controller;
  const timeout=setTimeout(()=>controller.abort(),8500);
  try{
   const response=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   // LBank REST wraps authentic levels under data, unlike Binance and MEXC.
   // Reject API errors rather than showing stale or invented BID/ASK levels.
   if(src.format==='lbank'&&(!data||(data.error_code!=null&&Number(data.error_code)!==0)||
      (data.result!=null&&data.result!==true&&data.result!=='true')))
     throw Error('LBank: coppia non disponibile o errore API');
   const depth=src.format==='lbank'?((data&&data.data)||data):data;
   if(!depth||!Array.isArray(depth.bids)||!Array.isArray(depth.asks))throw Error('Risposta book non valida');
   if(src.format==='lbank'){
    const marketTimestamp=Number(depth.timestamp||data.ts);
    if(Number.isFinite(marketTimestamp)&&marketTimestamp>0&&
       Math.abs(Date.now()-marketTimestamp)>180000)
      throw Error('Snapshot LBank non aggiornato');
   }
   const levels=rows=>rows.map(row=>[Number(row[0]),Number(row[1])]).filter(([p,q])=>Number.isFinite(p)&&Number.isFinite(q)&&p>0&&q>0).slice(0,20);
   const bids=levels(depth.bids).sort((a,b)=>b[0]-a[0]),asks=levels(depth.asks).sort((a,b)=>a[0]-b[0]);
   if(!bids.length||!asks.length||bids[0][0]>=asks[0][0])throw Error('Livelli bid/ask non validi');
   if(serial!==orderBookState.serial||coin!==orderBookState.id)return;
   orderBookState.data={bids,asks,unit:ASSET_BY_ID[coin].symbol.replace('-USD','')};
   orderBookState.updatedAt=Date.now();
   orderBookState.venue=src.venue;orderBookState.pair=src.pair;orderBookState.mode='live';
   orderBookState.lastTrade=null;orderBookState.lastTradeAt=0;orderBookState.previousTrade=null;orderBookState.error=null;
   success=true;break;
  }catch(err){
   if(serial!==orderBookState.serial)return;
   failure=err&&err.name==='AbortError'?'Tempo di risposta scaduto.':'Ordini non disponibili ('+(err&&err.message?err.message:'errore di connessione')+').';
  }finally{
   clearTimeout(timeout);
   if(orderBookState.abort===controller)orderBookState.abort=null;
  }
 }
 if(serial===orderBookState.serial&&!success&&coin==='ore'&&(!orderBookState.data||Date.now()-orderBookState.updatedAt>90000)){
  try{success=await loadOreBookSnapshot(serial,coin);}catch(err){failure+=' · '+(err&&err.message?err.message:'backup non disponibile')+'.';}
 }
 if(serial===orderBookState.serial&&!success)orderBookState.error=failure;
 // Old direct books expire in 90s; verified ORE backup in 30m.
 const ttl=orderBookState.mode==='snapshot'?3*60*60*1000:90000;
 if(serial===orderBookState.serial&&orderBookState.data&&Date.now()-orderBookState.updatedAt>ttl)orderBookState.data=null;
 if(serial===orderBookState.serial)orderBookState.lastTry=Date.now();
 if(serial===orderBookState.serial){orderBookState.busy=false;paintOrderBook();}
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
 const choices=[['light','☀','Chiaro','Bianco e azzurro'],['dark','☾','Scuro','Blu notte'],['ocean','◈','Oceano','Blu e turchese'],['emerald','❖','Smeraldo','Verde elegante'],['violet','✦','Viola','Viola moderno']];
 return secHeader('Impostazioni','Personalizza aspetto e suoni della dashboard')+
 '<section class="content-card panel settings-preferences"><h3>Temi della dashboard</h3><p class="subnote">Scegli fra cinque stili. Il tema cambia subito in tutte le sezioni e la tua preferenza rimane salvata.</p>'+
 '<div class="settings-theme-options" role="group" aria-label="Scegli uno dei cinque temi">'+
 choices.map(([mode,icon,label,description])=>'<button type="button" data-theme-mode="'+mode+'" class="settings-theme-option'+(state.themeMode===mode?' is-selected':'')+'" aria-label="'+label+': '+description+'" aria-pressed="'+(state.themeMode===mode)+'"><span class="settings-theme-swatch theme-swatch-'+mode+'" aria-hidden="true"><span>'+icon+'</span></span><span class="settings-theme-caption"><strong>'+label+'</strong><small>'+description+'</small></span></button>').join('')+
 '</div>'+
 '<button type="button" data-theme-mode="auto" class="settings-auto-theme'+(state.themeMode==='auto'?' is-selected':'')+'" aria-pressed="'+(state.themeMode==='auto')+'"><span class="settings-choice-icon" aria-hidden="true">◐</span><span><strong>Automatico</strong><small>Segue il tema chiaro/scuro del dispositivo</small></span><span class="settings-auto-state">'+(state.themeMode==='auto'?'Attivo':'Seleziona')+'</span></button>'+
 '<div class="settings-volume settings-brightness">'+
 '<div class="settings-sound-row settings-adaptive-row"><div><h3>Luminosità adattiva</h3><p class="subnote">Giorno 07:00–18:00: luminosa · Sera 18:00–22:00: attenuata · Notte 22:00–07:00: più soffusa. Cambi graduali automatici, secondo l’ora del dispositivo.</p></div>'+
 '<button type="button" data-adaptive-brightness="1" class="settings-sound-toggle'+(state.adaptiveBrightness?' is-on':'')+'" role="switch" aria-checked="'+state.adaptiveBrightness+'" aria-label="Luminosità adattiva">'+(state.adaptiveBrightness?'Attiva':'Disattiva')+'</button></div>'+
 '<div class="settings-volume-heading"><label for="brightnessSlider">Luminosità della dashboard</label><output id="brightnessValue" for="brightnessSlider">'+brightnessOutput()+'</output></div>'+
 '<input type="range" id="brightnessSlider" min="0" max="100" step="1" value="'+effectiveBrightness()+'" style="--volume-progress:'+effectiveBrightness()+'%" aria-label="Luminosità della dashboard" '+(state.adaptiveBrightness?'disabled':'')+'>'+
 '<div class="settings-volume-scale"><span>0%</span><span>100%</span></div>'+
 '<p class="subnote">'+(state.adaptiveBrightness?'Luminosità adattiva attiva: la pagina cambia automaticamente tra giorno, sera e notte. Disattivala per riprendere il controllo manuale.':'Regola la luminosità della pagina, non quella fisica dello schermo. Al minimo resta leggibile per poterla aumentare di nuovo.')+'</p></div></section>'+
 '<section class="content-card panel settings-preferences"><div class="settings-sound-row"><div><h3>Suono al clic</h3><p class="subnote">Un breve suono quando premi i pulsanti. Puoi disattivarlo quando vuoi.</p></div>'+
 '<button type="button" data-sound-toggle="1" class="settings-sound-toggle'+(state.clickSound?' is-on':'')+'" role="switch" aria-checked="'+state.clickSound+'" aria-label="Suono al clic">'+(state.clickSound?'Attivo':'Disattivo')+'</button></div>'+
 '<div class="settings-volume"><div class="settings-volume-heading"><label for="clickVolumeSlider">Volume dei clic</label><output id="clickVolumeValue" for="clickVolumeSlider">'+state.clickVolume+'%</output></div>'+
 '<input type="range" id="clickVolumeSlider" min="0" max="100" step="1" value="'+state.clickVolume+'" style="--volume-progress:'+state.clickVolume+'%" aria-label="Volume del suono al clic">'+
 '<div class="settings-volume-scale"><span>0%</span><span>100%</span></div></div></section>';
}
const PAGE_RENDERERS={home:homePage,global:globalPage,markets:marketsPage,watchlist:watchlistPage,portfolio:portfolioPage,news:newsPage,analytics:analyticsPage,orderbook:orderBookPage,alerts:alertsPage,settings:settingsPage};
function updateNav(){
 $$('.side-link[data-page]').forEach(b=>{const sel=b.dataset.page===state.page;b.classList.toggle('active',sel);if(sel)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 const count=triggeredAlerts().length;$('#alertCount').hidden=count===0;if(count)$('#alertCount').textContent=String(count);
 $('#notifDot').hidden=count===0;
}
function render(){
 const page=SECTIONS[state.page]||SECTIONS.global;
 $('#pageTitle').textContent=page[0];$('#pageSubtitle').textContent=page[1];
 const hideSearch=['global','settings','analytics','orderbook','news'].includes(state.page);
 const searchWrap=$('.search-wrap');
 if(searchWrap)searchWrap.hidden=hideSearch;
 if(hideSearch){
  const searchMenu=$('#searchMenu');
  if(searchMenu)searchMenu.hidden=true;
  const searchInput=$('#searchInput');
  if(searchInput)searchInput.setAttribute('aria-expanded','false');
 }
 const main=$('#pageContainer');
 main.innerHTML=PAGE_RENDERERS[state.page]();
 updateNav();
 if(state.page==='news'&&!secNewsState.loaded&&!secNewsState.loading)loadSecNews();
 if(state.page==='global'){
  if(!state.land)loadWorldShape();
  updateWorldSunlight(true);
 }
 if(state.page==='orderbook'){
  refreshOrderBook();
  startOrderBookLive();
 }
}
function navigate(page){
 if(!SECTIONS[page])page='global';
 if(state.page==='orderbook'&&page!=='orderbook'){stopOrderBookLive();cancelOrderBookFetch()}
 state.page=page;
 if(location.hash!=='#'+page)history.replaceState(null,'','#'+page);
 $('#sidebar').classList.remove('open');
 render();
 window.scrollTo({top:0,behavior:'auto'});
}
function adaptiveBrightnessPhase(now=new Date()){
 const minute=now.getHours()*60+now.getMinutes();
 return minute>=7*60&&minute<18*60?'Giorno':minute>=18*60&&minute<22*60?'Sera':'Notte';
}
function adaptiveBrightnessLevel(now=new Date()){
 // Browser-local clock, never the camera or light sensor; three clear brightness zones.
 // Blend around the transitions so brightness never jumps suddenly at 07, 18 or 22.
 const minute=now.getHours()*60+now.getMinutes();
 const blend=(value,from,to)=>{const t=Math.max(0,Math.min(1,value));return Math.round(from+(to-from)*t*t*(3-2*t));};
 if(minute<6*60+30)return 62;                        // Notte (00:00-06:30)
 if(minute<7*60+30)return blend((minute-390)/60,62,100); // Alba: 06:30-07:30
 if(minute<17*60+30)return 100;                      // Giorno pieno
 if(minute<18*60+30)return blend((minute-1050)/60,100,82); // Tramonto: 17:30-18:30
 if(minute<21*60+30)return 82;                       // Sera
 if(minute<22*60+30)return blend((minute-1290)/60,82,62); // Sera -> notte
 return 62;                                          // Notte (22:30-24:00)
}
function effectiveBrightness(){
 return state.adaptiveBrightness?adaptiveBrightnessLevel():state.brightness;
}
function brightnessOutput(){
 return effectiveBrightness()+'%'+(state.adaptiveBrightness?' · '+adaptiveBrightnessPhase():'');
}
function applyBrightness(){
 // Dims only the dashboard overlay; the physical device brightness is unchanged.
 const level=effectiveBrightness();
 document.documentElement.style.setProperty('--dashboard-dim-opacity',String((1-level/100)*0.82));
 const slider=$('#brightnessSlider'),output=$('#brightnessValue');
 if(slider){
  slider.value=String(level);
  slider.disabled=state.adaptiveBrightness;
  slider.style.setProperty('--volume-progress',level+'%');
 }
 if(output)output.textContent=brightnessOutput();
}
function applyTheme(){
 state.theme=resolvedTheme(state.themeMode);
 for(const theme of Object.keys(THEME_NAMES))document.body.classList.toggle('theme-'+theme,state.theme===theme);
 if(state.adaptiveBrightness)applyBrightness();
 document.querySelectorAll('.sidebar-theme-button[data-fixed-theme]').forEach(button=>{
  const selected=state.theme===button.dataset.fixedTheme;
  button.classList.toggle('is-selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
}
function setTheme(mode){
 state.themeMode=(mode==='auto'||Object.hasOwn(THEME_NAMES,mode))?mode:'dark';
 applyTheme();
 save('themeMode',state.themeMode);
 save('theme',state.theme);
 if(state.page==='settings')render();
}
let clickAudioContext=null;
function playClickSound(){
 if(!state.clickSound||state.clickVolume===0)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  if(!clickAudioContext)clickAudioContext=new Audio();
  if(clickAudioContext.state==='suspended')clickAudioContext.resume().catch(()=>{});
  const t=clickAudioContext.currentTime;
  const tone=clickAudioContext.createOscillator();
  const volume=clickAudioContext.createGain();
  tone.type='sine';
  tone.frequency.setValueAtTime(680,t);
  tone.frequency.exponentialRampToValueAtTime(490,t+0.05);
  volume.gain.setValueAtTime(0.0001,t);
  volume.gain.exponentialRampToValueAtTime(0.05*state.clickVolume/100,t+0.006);
  volume.gain.exponentialRampToValueAtTime(0.0001,t+0.065);
  tone.connect(volume);
  volume.connect(clickAudioContext.destination);
  tone.start(t);
  tone.stop(t+0.07);
 }catch(e){/* Audio is optional; dashboard remains usable without it. */}
}
function toast(message){
 const el=$('#toast');el.textContent=String(message);el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3400);
}
function updateClock(){
 const now=new Date();
 $('#localDate').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Rome'}).format(now);
 $('#localTime').textContent=new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Rome'}).format(now)+' (Roma)';
}
/* GitHub Pages serves static snapshots. A cheap HEAD check avoids downloading
   the 2MB historic-data file every minute when the snapshot has not changed. */
const snapshotFetch={busy:false,etag:null,age:null};
async function fetchQuotes(isManual=false){
 if(snapshotFetch.busy)return;
 snapshotFetch.busy=true;
 const wasLoading=state.loading,wasError=state.feedError;
 try{
  const url='./market-data.json?v='+Math.floor(Date.now()/30000);
  if(state.feedTime&&!isManual){
   let same=false;
   try{
    const head=await fetch(url,{method:'HEAD',cache:'no-store'});
    if(head.ok){
     const etag=head.headers.get('etag')||head.headers.get('last-modified');
     if(etag&&snapshotFetch.etag&&etag===snapshotFetch.etag)same=true;
    }
   }catch(e){/* Some CDNs do not support HEAD; GET remains the fallback. */}
   if(same){
    state.feedError=false;
    updateLiveBadges();
    return;
   }
  }
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error('Feed HTTP '+response.status);
  const data=await response.json();
  if(!data||!Array.isArray(data.markets)||!Array.isArray(data.crypto))throw new Error('Invalid market snapshot');
  const all=[...(data.markets||[]),...(data.bigtech||[]),...(data.commodities||[]),...(data.forex||[]),...(data.crypto||[])];
  const next=preserveForexQuotes(preserveStreamingQuotes(Object.fromEntries(
   all.filter(x=>x&&x.id&&ASSET_BY_ID[x.id]).map(x=>[x.id,x])
  )));
  const changed=[];
  for(const [id,value] of Object.entries(next)){
   const old=state.quotes[id];
   if(!old||old.value!==value.value||old.change!==value.change||old.time!==value.time||
      old.logo!==value.logo||old.live!==value.live||old.source!==value.source)changed.push(id);
  }
  for(const id of Object.keys(state.quotes)){
   if(!next[id])changed.push(id);
  }
  state.quotes=next;
  state.feedTime=data.generatedAt||state.feedTime;
  state.feedError=false;state.loading=false;
  snapshotFetch.etag=response.headers.get('etag')||response.headers.get('last-modified')||null;
  snapshotFetch.age=Date.now();
  if(wasLoading)render();
  else{
   changed.forEach(id=>streamStatus.dirty.add(id));
   if(changed.length)updatePriceDom();
   else updateLiveBadges();
   // Also refresh the Middle East mini-chart when history changes but
   // price/percentage stays the same between market-data snapshots.
   if(state.page==='global')patchRegions();
   updateMarketsSnapshotCharts();
  }
  if(isManual)toast(changed.length?'Quotazioni aggiornate da tutte le fonti disponibili.':'Feed controllato: nessuna nuova quotazione disponibile.');
 }catch(e){
  state.feedError=true;state.loading=false;
  if(wasLoading)render();
  else updateLiveBadges();
  if(isManual)toast('Feed non raggiungibile. Gli ultimi prezzi verificati restano visibili.');
 }finally{
  snapshotFetch.busy=false;
  if(wasError!==state.feedError)updateLiveBadges();
 }
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
 menu.innerHTML=matches.map(a=>'<button type="button" data-asset="'+a.id+'"><span class="search-asset-label">'+(showAssetLogo(a)?assetLogo(a):'')+'<span><strong>'+esc(a.name)+'</strong><small>'+esc(a.group.toUpperCase()+' · '+a.symbol)+'</small></span></span><span class="'+classArrow(a.id)+'">'+assetValue(a)+'</span></button>').join('');
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
 if(a.group==='crypto' && a.coingeckoId)return 'https://www.coingecko.com/en/coins/'+encodeURIComponent(a.coingeckoId);
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
 if(showAssetLogo(a))$('#dialogTitle').insertAdjacentHTML('afterbegin',assetLogo(a));
 $('#dialogCategory').textContent=a.group.toUpperCase()+' · '+a.symbol;
 $('#dialogSubtitle').textContent=a.where||'Quotazione di mercato';
 $('#dialogWatch').textContent=(isWatch?'★ Rimuovi dalla Watchlist':'☆ Aggiungi alla Watchlist');
 const candleAvailable=q&&Array.isArray(q.candles)&&q.candles.length>=2;
 $('#dialogBody').innerHTML='<div class="dialog-stats"><strong>'+assetValue(a)+'</strong><span class="change '+classArrow(a.id)+'">'+pct(q&&q.change)+'</span><span class="dialog-meta">Ultima quotazione: '+esc(refTime(a.id))+'</span></div>'+
 '<div class="chart-toolbar"><div class="chart-legend"><span><i style="background:#74b2ff"></i>EMA 12</span><span><i style="background:#f1ba55"></i>EMA 26</span><span><i style="background:#b382ee"></i>EMA 50</span><span><i style="background:#ef7192"></i>EMA 200</span></div><span class="badge">'+(candleAvailable?'Candele OHLC · storico':'Candele OHLC non disponibili')+'</span></div>'+
 '<div class="chart-frame"><canvas id="detailChart" width="900" height="470" role="img" aria-label="Grafico di '+esc(a.name)+', medie mobili e indicatori" tabindex="0"></canvas></div>'+
 '<div class="chart-toolbar"><div class="chart-legend"><span>RSI (14)</span><span>Stochastic RSI (14/14/3/3)</span><span>MACD (12/26/9)</span></div>'+
 '<div><button class="btn btn-small" type="button" data-pan="-20">◀ Storico</button> <button class="btn btn-small" type="button" data-pan="20">Recenti ▶</button> <button class="btn btn-small" type="button" data-pan="reset">Oggi</button></div></div>'+
 '<div class="chart-help">Trascina il grafico in orizzontale per scorrere lo storico. Nessuno zoom. Le medie e gli indicatori sono mostrati solo quando le serie contengono dati sufficienti.</div>'+
 '<div class="chart-source"><span>Prezzi: '+(a.group==='crypto'?'CoinGecko o Binance Spot (secondo disponibilità)':'Yahoo Finance')+'. Candele OHLC: '+esc(q&&q.candleSource||'Yahoo Finance, se disponibile')+'. Storico non necessariamente in tempo reale.</span>'+
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
 if(!q||!Array.isArray(q.candles))return [];
 return q.candles.map(x=>({t:Number(x.t),o:Number(x.o),h:Number(x.h),l:Number(x.l),c:Number(x.c)}))
  .filter(x=>[x.o,x.h,x.l,x.c].every(num)&&x.o>0&&x.h>0&&x.l>0&&x.c>0&&
   x.h>=Math.max(x.o,x.c)&&x.l<=Math.min(x.o,x.c));
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
 const candles=getCandles(state.dialogId),ctx=canvas.getContext('2d');if(!ctx)return;
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
 if(!sample.length){text('Candele OHLC non disponibili da fonti dati.',width/2,130,'center',13);return;}
 const ix=i=>left+(i-start+.5)*chartW/sample.length;
 const closes=candles.map(x=>x.c);
 const emaSets=[{values:ema(closes,12),color:'#6fb2ff'},{values:ema(closes,26),color:'#f1b954'},{values:ema(closes,50),color:'#b18aff'},{values:ema(closes,200),color:'#e96798'}];
 const lows=sample.map(x=>x.l),highs=sample.map(x=>x.h);
 emaSets.forEach(a=>a.values.slice(start,end).forEach(v=>{if(num(v)){lows.push(v);highs.push(v)}}));
 const lo=Math.min(...lows),hi=Math.max(...highs),pad=(hi-lo||Math.max(hi*.03,1))*.07;
 const min=lo-pad,max=hi+pad;
 const yPrice=v=>regions[0].bottom-(v-min)/(max-min)*(regions[0].bottom-regions[0].top);
 const step=chartW/sample.length,cw=Math.max(2,Math.min(9,step*.58));
 sample.forEach((c,i)=>{
   const x=ix(start+i),up=c.c>=c.o;
   const colorC=up?'#18df9d':'#f75d72';
   line(x,yPrice(c.h),x,yPrice(c.l),colorC,1);
   ctx.fillStyle=colorC;const top=yPrice(Math.max(c.o,c.c)),bottom=yPrice(Math.min(c.o,c.c));
   ctx.fillRect(x-cw/2,top,cw,Math.max(1,bottom-top));
  });
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
 // A single delegated handler also covers buttons added when pages are rendered.
 document.addEventListener('click',e=>{
  const target=e.target instanceof Element?e.target.closest('button,a[href],tr[data-asset]'):null;
  if(target&&!target.disabled&&target.getAttribute('aria-disabled')!=='true')playClickSound();
 },true);
 if(deviceThemeQuery){
  const updateAutoTheme=()=>{if(state.themeMode==='auto'){applyTheme();if(state.page==='settings')render();}};
  if(deviceThemeQuery.addEventListener)deviceThemeQuery.addEventListener('change',updateAutoTheme);
  else if(deviceThemeQuery.addListener)deviceThemeQuery.addListener(updateAutoTheme);
 }
 document.addEventListener('error',e=>{
  const img=e.target;
  if(img&&img.tagName==='IMG'&&(img.classList.contains('crypto-logo-image')||img.classList.contains('forex-flag-image')||img.classList.contains('bigtech-logo-image')||img.classList.contains('market-index-logo-image')))img.remove();
 },true);
 $$('.side-link[data-page]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.page)));
 $('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
 $$('.sidebar-theme-button[data-fixed-theme]').forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.fixedTheme)));
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
  if(btn.dataset.secCategory){secNewsState.selected=btn.dataset.secCategory;secNewsState.visible=20;render();return;}
  if(btn.dataset.secMore){secNewsState.visible+=20;render();return;}
  if(btn.dataset.secRefresh){loadSecNews(true);return;}
  if(btn.dataset.adaptiveBrightness){
   state.adaptiveBrightness=!state.adaptiveBrightness;
   save('adaptiveBrightness',state.adaptiveBrightness);
   applyBrightness();
   if(state.page==='settings')render();
   return;
  }
  if(btn.dataset.orderBookAsset){selectOrderBookAsset(btn.dataset.orderBookAsset);return;}
  if(btn.dataset.orderBookRefresh){startOrderBookLive(true);refreshOrderBook(true);return;}
  if(btn.dataset.themeMode){setTheme(btn.dataset.themeMode);return;}
  if(btn.dataset.soundToggle){
   const previous=state.clickSound;
   state.clickSound=!state.clickSound;
   save('clickSound',state.clickSound);
   if(!previous&&state.clickSound)playClickSound();
   render();return;
  }
  if(btn.dataset.cryptoExpand){state.cryptoExpanded=!state.cryptoExpanded;render();return;}
  if(btn.dataset.asset){openAsset(btn.dataset.asset);return;}
  if(btn.dataset.region){selectRegion(btn.dataset.region);return;}
  if(btn.dataset.page){if(btn.dataset.category)state.marketFilter=btn.dataset.category;navigate(btn.dataset.page);return;}
  if(btn.dataset.filter){state.marketFilter=btn.dataset.filter;render();return;}
  if(btn.dataset.refresh){fetchQuotes(true);return;}
  if(btn.dataset.toggleTheme){setTheme(state.theme==='light'?'dark':'light');return;}
  if(btn.dataset.portfolioRefresh){fetchQuotes(true);return;}
  if(btn.dataset.portfolioCancel){
   portfolioEditIndex=-1;render();return;
  }
  if(btn.dataset.editHolding!==undefined){
   const idx=Number(btn.dataset.editHolding);
   if(!Number.isInteger(idx)||idx<0||idx>=state.holdings.length)return;
   portfolioEditIndex=idx;render();
   const form=$('#portfolioEditor');
   if(form&&form.scrollIntoView)form.scrollIntoView({behavior:'smooth',block:'start'});
   const input=$('#holdingQty');if(input)input.focus({preventScroll:true});
   return;
  }
  if(btn.dataset.deleteHolding!==undefined){
   const idx=Number(btn.dataset.deleteHolding);
   if(!Number.isInteger(idx)||idx<0||idx>=state.holdings.length)return;
   if(!window.confirm('Vuoi rimuovere questa posizione dal portafoglio?'))return;
   const next=state.holdings.slice();next.splice(idx,1);
   if(!persistPortfolio(next))return;
   portfolioEditIndex=-1;render();toast('Posizione rimossa dal portafoglio.');
   return;
  }
  if(btn.dataset.deleteAlert!=null){state.alerts.splice(Number(btn.dataset.deleteAlert),1);save('alerts',state.alerts);render();return;}
 });
 $('#pageContainer').addEventListener('keydown',e=>{if(e.key==='Enter'){const tr=e.target.closest('tr[data-asset]');if(tr)openAsset(tr.dataset.asset)}});
 $('#pageContainer').addEventListener('change',e=>{
  if(e.target.id==='holdingAsset'){
   const target=$('#holdingAssetLogo'),asset=ASSET_BY_ID[e.target.value];
   if(target&&asset)target.innerHTML=assetLogo(asset);
  }
 });
 $('#pageContainer').addEventListener('input',e=>{
  if(e.target.id==='holdingQty'||e.target.id==='holdingCost'){
   const qty=parsePortfolioNumber($('#holdingQty')?.value);
   const cost=parsePortfolioNumber($('#holdingCost')?.value);
   const output=$('#holdingCostPreview');
   if(output)output.textContent=Number.isFinite(qty)&&qty>0&&Number.isFinite(cost)&&cost>=0&&
    Number.isFinite(qty*cost)?portfolioUsd(qty*cost):'—';
   return;
  }
  if(e.target.id==='orderBookSearch'){
   orderBookState.search=e.target.value;
   const list=$('#orderBookAssetList');if(list)list.innerHTML=orderBookAssetList();
   return;
  }
  if(e.target.id==='brightnessSlider'){
   if(state.adaptiveBrightness)return;
   state.brightness=Math.min(100,Math.max(0,Math.round(Number(e.target.value)||0)));
   const output=$('#brightnessValue');
   if(output)output.textContent=state.brightness+'%';
   e.target.style.setProperty('--volume-progress',state.brightness+'%');
   applyBrightness();
   save('brightness',state.brightness);
   return;
  }
  if(e.target.id==='clickVolumeSlider'){
   state.clickVolume=Math.min(100,Math.max(0,Math.round(Number(e.target.value)||0)));
   const value=$('#clickVolumeValue');
   if(value)value.textContent=state.clickVolume+'%';
   e.target.style.setProperty('--volume-progress',state.clickVolume+'%');
   save('clickVolume',state.clickVolume);
   return;
  }
  if(e.target.id==='marketSearch'){
   const target=e.target,cursor=target.selectionStart;
   state.marketSearch=target.value;
   const rows=$('#marketRows');
   if(rows)rows.innerHTML=marketsCards(ASSETS.filter(a=>marketFilterMatch(a)&&
    (a.name+' '+a.symbol+' '+(a.country||'')).toLowerCase().includes(state.marketSearch.trim().toLowerCase())),'Nessun risultato');
   try{target.setSelectionRange(cursor,cursor)}catch(err){}
  }
 });
 $('#pageContainer').addEventListener('change',e=>{
  if(e.target.id==='clickVolumeSlider')playClickSound();
 });
 $('#pageContainer').addEventListener('submit',e=>{
  if(e.target.id==='portfolioForm'){
   e.preventDefault();
   const form=new FormData(e.target),id=String(form.get('id')||'');
   const qty=parsePortfolioNumber(form.get('qty')),cost=parsePortfolioNumber(form.get('cost'));
   const manualRaw=String(form.get('manualPrice')||'').trim();
   const manualPrice=manualRaw?parsePortfolioNumber(manualRaw):null;
   if(!portfolioEligible(id)){
    toast('Seleziona una criptovaluta o uno strumento valido.');return;
   }
   if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(cost)||cost<0||
      !Number.isFinite(qty*cost)){
    toast('Quantità e prezzo di acquisto devono essere numeri validi.');return;
   }
   if(manualRaw&&(!Number.isFinite(manualPrice)||manualPrice<=0||
      !Number.isFinite(qty*manualPrice))){
    toast('Inserisci un prezzo attuale manuale valido oppure lascia vuoto il campo.');return;
   }
   const idx=portfolioEditIndex;
   const editing=Number.isInteger(idx)&&idx>=0&&idx<state.holdings.length;
   const prev=editing?state.holdings[idx]:null;
   const manualUpdatedAt=manualPrice===null?null:
    prev&&prev.id===id&&Number(prev.manualPrice)===manualPrice&&prev.manualUpdatedAt?
     prev.manualUpdatedAt:new Date().toISOString();
   const holding={...(prev||{}),id,qty,cost,manualPrice,manualUpdatedAt};
   const next=state.holdings.slice();
   if(editing)next[idx]=holding;else next.push(holding);
   if(!persistPortfolio(next))return;
   portfolioEditIndex=-1;
   render();toast(editing?'Posizione aggiornata e salvata.':'Posizione aggiunta e salvata.');
   return;
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
}
function init(){
 setupEvents();applyTheme();applyBrightness();updateClock();
 setInterval(updateClock,30000);
 setInterval(()=>{if(state.adaptiveBrightness&&!document.hidden)applyBrightness()},60000);
 setInterval(updateWorldSunlight,1000);
 setInterval(()=>{
  if(state.page==='orderbook'&&!document.hidden){
   keepOrderBookLive();
   if(!orderBookIsStreaming()&&!orderBookIsFastPolling())refreshOrderBook();
  }
 },5000);
 render();
 fetchQuotes();
 connectCryptoStream();
 connectForexStream();
 setInterval(()=>{if(!document.hidden)fetchQuotes()},30000);
 setInterval(keepStreamAlive,15000);
 setInterval(()=>{if(!document.hidden)connectForexStream();updateLiveBadges()},15000);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){closeStream();disconnectForexStream();stopOrderBookLive()}
  else {
   connectCryptoStream();connectForexStream();fetchQuotes();updateWorldSunlight(true);applyBrightness();
   if(state.page==='orderbook'){startOrderBookLive();refreshOrderBook()}
  }
 });
 window.addEventListener('online',()=>{
  connectCryptoStream();connectForexStream();fetchQuotes();
  if(state.page==='orderbook'){startOrderBookLive(true);refreshOrderBook(true)}
 });
 window.addEventListener('offline',()=>{
  closeStream();disconnectForexStream();stopOrderBookLive();updateLiveBadges();
  if(state.page==='orderbook')paintOrderBook();
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();