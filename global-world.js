/* Global World Markets V564. Live quotes are loaded from the GitHub Actions data snapshot.
   No synthetic prices or direction indicators are displayed. */
(() => {
  'use strict';
  if (window.__globalWorldV564) return;
  window.__globalWorldV564 = true;
  const MARKETS = [
    {id:'sp500', name:'S&P 500', place:'New York · USA', zone:'America del Nord', lat:40.71,lon:-74.00},
    {id:'nasdaq',name:'Nasdaq', place:'New York · USA',zone:'America del Nord',lat:41.8,lon:-72.4},
    {id:'tsx',name:'S&P/TSX',place:'Toronto · Canada',zone:'America del Nord',lat:43.65,lon:-79.38},
    {id:'ibov',name:'Ibovespa',place:'San Paolo · Brasile',zone:'America del Sud',lat:-23.55,lon:-46.63},
    {id:'ftse',name:'FTSE 100',place:'Londra · Regno Unito',zone:'Europa',lat:51.51,lon:-0.13},
    {id:'dax',name:'DAX',place:'Francoforte · Germania',zone:'Europa',lat:50.11,lon:8.68},
    {id:'cac',name:'CAC 40',place:'Parigi · Francia',zone:'Europa',lat:48.86,lon:2.35},
    {id:'jse',name:'FTSE/JSE Top 40',place:'Johannesburg · Sudafrica',zone:'Africa',lat:-26.2,lon:28.04},
    {id:'nikkei',name:'Nikkei 225',place:'Tokyo · Giappone',zone:'Asia',lat:35.68,lon:139.69},
    {id:'hsi',name:'Hang Seng',place:'Hong Kong',zone:'Asia',lat:22.32,lon:114.17},
    {id:'nifty',name:'Nifty 50',place:'Mumbai · India',zone:'Asia',lat:19.08,lon:72.88},
    {id:'kospi',name:'KOSPI',place:'Seul · Corea del Sud',zone:'Asia',lat:37.56,lon:126.98},
    {id:'asx',name:'ASX 200',place:'Sydney · Australia',zone:'Oceania',lat:-33.87,lon:151.21}
  ];
  const GROUPS = [
    {id:'commodities',title:'Materie prime',items:[['gold','Oro'],['silver','Argento'],['brent','Petrolio Brent'],['wti','Petrolio WTI'],['naturalgas','Gas naturale']]},
    {id:'forex',title:'Forex',items:[['eurusd','EUR/USD'],['gbpusd','GBP/USD'],['usdjpy','USD/JPY'],['usdchf','USD/CHF'],['audusd','AUD/USD']]},
    {id:'crypto',title:'Criptovalute',items:[['btc','Bitcoin'],['eth','Ethereum'],['sol','Solana'],['inj','Injective'],['bnb','BNB']]}
  ];
  const HOME = MARKETS[0].id;
  const fallbackLand = [
    'M82 100L131 58L194 54L230 82L252 112L227 141L205 166L218 202L193 219L181 194L165 178L143 173L133 152L103 153L86 130Z',
    'M190 202L225 212L243 251L228 281L237 311L217 357L205 411L190 385L183 339L167 293L174 248Z',
    'M256 36L308 24L327 45L308 71L269 70Z',
    'M455 139L482 116L512 115L525 136L505 153L482 148L468 162L451 153Z',
    'M471 171L519 162L554 184L563 225L548 273L519 335L491 321L469 282L454 242L457 201Z',
    'M517 137L547 111L594 105L622 80L678 85L721 74L781 98L847 131L882 149L862 183L831 186L803 207L774 186L751 205L714 198L685 227L657 208L620 222L603 192L573 177L542 177Z',
    'M679 231L708 235L727 265L718 298L700 285Z',
    'M796 331L841 311L881 331L898 370L869 397L823 386L798 362Z',
    'M901 391L926 395L932 421L910 428Z'
  ];
  const state={data:null,selected:HOME,refreshing:false};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  function pct(n) {return finite(n)?(n>0?'+':'')+n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'n.d.';}
  function fmt(n,currency) {
    if(!finite(n))return '—';
    if(currency==='RATIO')return n.toLocaleString('it-IT',{minimumFractionDigits:Math.abs(n)>10?2:4,maximumFractionDigits:Math.abs(n)>10?3:5});
    const digits=Math.abs(n)<1?4:Math.abs(n)<10?3:2;
    const s=n.toLocaleString('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits});
    return currency==='USD'?'$'+s:currency==='EUR'?'€'+s:currency==='GBP'?'£'+s:currency==='JPY'?'¥'+s:s+(currency&&currency!=='RATIO'?' '+currency:'');
  }
  const direction=q=>!q||!finite(q.change)?'unknown':q.change>0?'up':q.change<0?'down':'flat';
  const item=(group,id)=>state.data&&Array.isArray(state.data[group])?state.data[group].find(q=>q.id===id):null;
  const mark=id=>item('markets',id);
  const point=(lon,lat)=>({x:(lon+180)/360*1000,y:(90-lat)/180*520});
  const skeleton=()=>'<div class="v564-no-data">—</div>';
  const spark=q=>{
    const a=q&&Array.isArray(q.history)?q.history.filter(finite):[];
    if(a.length<2)return '';
    const mn=Math.min(...a),mx=Math.max(...a),d=(mx-mn)||1;
    const path=a.map((v,i)=>(i?'L':'M')+(i/(a.length-1)*100).toFixed(1)+' '+(28-(v-mn)/d*24).toFixed(1)).join(' ');
    return '<svg class="v564-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  function miniCard(m){
    const q=mark(m.id),d=direction(q);
    return '<button type="button" class="v564-index-card" data-market="'+m.id+'" data-dir="'+d+'" aria-label="Apri '+esc(m.name)+'">'+
      '<span class="v564-index-title">'+esc(m.name)+'</span><span class="v564-index-place">'+esc(m.place)+'</span>'+
      '<strong class="v564-index-value">'+fmt(q&&q.value,q&&q.currency)+'</strong><b class="v564-delta">'+pct(q&&q.change)+'</b>'+spark(q)+'</button>';
  }
  function panelList(group){
    return '<section class="v564-side-card"><div class="v564-side-head"><h3>'+esc(group.title)+'</h3><span>Var. 24 h / ultima seduta</span></div>'+
      group.items.map(([id,label])=>{
        const q=item(group.id,id),d=direction(q);
        return '<div class="v564-quote-row" data-dir="'+d+'"><span class="v564-symbol">'+esc(label)+'</span><span class="v564-price">'+fmt(q&&q.value,q&&q.currency)+'</span><b class="v564-delta">'+pct(q&&q.change)+'</b></div>';
      }).join('')+'</section>';
  }
  function drawPins(){
    return MARKETS.map(m=>{
      const p=point(m.lon,m.lat),q=mark(m.id),d=direction(q);
      return '<button class="v564-map-pin'+(state.selected===m.id?' is-selected':'')+'" type="button" data-market="'+m.id+'" data-dir="'+d+
        '" style="left:'+p.x/10+'%;top:'+p.y/5.2+'%" aria-label="'+esc(m.place)+' · '+esc(m.name)+' · '+pct(q&&q.change)+'">'+
        '<span class="v564-pin-dot"></span><span class="v564-pin-tooltip"><strong>'+esc(m.name)+'</strong><small>'+esc(m.place)+'</small><b>'+pct(q&&q.change)+'</b></span></button>';
    }).join('');
  }
  function selectedCard(){
    const m=MARKETS.find(m=>m.id===state.selected)||MARKETS[0],q=mark(m.id);
    const u='https://finance.yahoo.com/quote/'+encodeURIComponent(q&&q.symbol||'')+'/';
    return '<div class="v564-focus" data-dir="'+direction(q)+'"><div><small>MERCATO SELEZIONATO</small><h3>'+esc(m.name)+'</h3><p>'+esc(m.place)+'</p></div>'+
      '<div class="v564-focus-price"><strong>'+fmt(q&&q.value,q&&q.currency)+'</strong><b class="v564-delta">'+pct(q&&q.change)+'</b></div>'+
      (q&&q.symbol?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" aria-label="Apri quotazione di '+esc(m.name)+'">Fonte ↗</a>':'')+'</div>';
  }
  function buildMap(){
    return '<div class="v564-map-wrap"><div class="v564-map-view" id="v564MapView">'+
      '<svg class="v564-map-svg" viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mappa del mondo con le principali borse in verde, rosso o grigio secondo la variazione disponibile">'+
      '<defs><radialGradient id="v564MapBg"><stop stop-color="#11304a" stop-opacity=".9"/><stop offset="1" stop-color="#06111e" stop-opacity=".28"/></radialGradient></defs>'+
      '<rect width="1000" height="520" fill="url(#v564MapBg)"/><g class="v564-map-grid">'+
      [130,260,390].map(y=>'<path d="M0 '+y+' H1000"/>').join('')+
      [125,250,375,500,625,750,875].map(x=>'<path d="M'+x+' 0 V520"/>').join('')+'</g>'+
      '<g id="v564Land" class="v564-land">'+fallbackLand.map(d=>'<path d="'+d+'"/>').join('')+'</g></svg>'+
      '<div class="v564-map-pins" id="v564MapPins">'+drawPins()+'</div>'+
      '<span class="v564-map-credit">Geografia: Natural Earth / world-atlas</span></div>'+
      '<div class="v564-map-legend"><span><i class="v564-key-up"></i>Rialzo</span><span><i class="v564-key-down"></i>Ribasso</span><span><i class="v564-key-unknown"></i>Non disponibile</span></div></div>';
  }
  function render() {
    const root=document.getElementById('v564WorldDashboard');if(!root)return;
    const head=root.querySelector('#v564Indices');
    if(head)head.innerHTML=['sp500','nasdaq','ftse','dax','nikkei','hsi'].map(id=>miniCard(MARKETS.find(m=>m.id===id))).join('');
    const pins=root.querySelector('#v564MapPins');if(pins)pins.innerHTML=drawPins();
    const focus=root.querySelector('#v564Focus');if(focus)focus.innerHTML=selectedCard();
    const summary=root.querySelector('#v564Markets');
    if(summary)summary.innerHTML=MARKETS.map(m=>'<button type="button" class="v564-region-row" data-market="'+m.id+'" data-dir="'+direction(mark(m.id))+'"><span>'+esc(m.name)+'<small>'+esc(m.place)+'</small></span><strong>'+pct(mark(m.id)&&mark(m.id).change)+'</strong></button>').join('');
    const aside=root.querySelector('#v564Aside');if(aside)aside.innerHTML=GROUPS.map(panelList).join('');
    const status=root.querySelector('#v564Status');
    if(status){
      const t=state.data&&state.data.generatedAt?new Date(state.data.generatedAt):null;
      const okay=t&&!Number.isNaN(t.getTime());
      const count=state.data&&Array.isArray(state.data.markets)?state.data.markets.filter(q=>finite(q.value)).length:0;
      status.textContent=okay?'Aggiornamento '+t.toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})+' · '+count+'/'+MARKETS.length+' mercati disponibili':'In attesa delle prime quotazioni verificabili';
      status.title='Quotazioni indicative, anche ritardate. I mercati chiusi mostrano l’ultima seduta disponibile.';
    }
  }
  function showFailure(message){
    const x=document.getElementById('v564Error');
    if(x){x.textContent=message||'';x.hidden=!message;}
  }
  async function load(){
    if(state.refreshing)return;
    state.refreshing=true;
    const refresh=document.getElementById('v564Refresh');if(refresh)refresh.disabled=true;
    try{
      const response=await fetch('global-quotes.json?ts='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const body=await response.json();
      if(!body||!Array.isArray(body.markets))throw Error('Formato dati non valido');
      state.data=body;
      render();
      const available=body.markets.some(q=>finite(q.value));
      showFailure(available?'':'Il feed è in preparazione o non è riuscito a ottenere quotazioni: i valori non disponibili restano grigi.');
    }catch(err){
      showFailure('Feed momentaneamente non disponibile. La mappa non mostra variazioni non verificate.');
      render();
    }finally{state.refreshing=false;if(refresh)refresh.disabled=false;}
  }
  async function loadLand(){
    const land=document.getElementById('v564Land');if(!land)return;
    try{
      const r=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json',{cache:'force-cache'});
      if(!r.ok)throw Error('mappa non disponibile');
      const topo=await r.json();
      if(!topo.arcs||!topo.objects||!topo.objects.land)return;
      const tf=topo.transform;
      const arc=i=>{
        const idx=i<0?~i:i,raw=topo.arcs[idx];if(!raw)return [];
        let x=0,y=0;
        const points=raw.map(a=>{x+=a[0];y+=a[1];return [x*tf.scale[0]+tf.translate[0],y*tf.scale[1]+tf.translate[1]];});
        return i<0?points.reverse():points;
      };
      const paths=[];
      const ring=ids=>{
        const pts=ids.flatMap((id,i)=>{const a=arc(id);return i?a.slice(1):a;});
        if(pts.length<3)return '';
        return pts.map(([lon,lat],i)=>{const p=point(lon,lat);return (i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1);}).join(' ')+' Z';
      };
      const polygon=poly=>poly.map(ring).join(' ');
      const geometry=g=>{
        if(g.type==='Polygon')paths.push(polygon(g.arcs));
        if(g.type==='MultiPolygon')g.arcs.forEach(poly=>paths.push(polygon(poly)));
        if(g.type==='GeometryCollection')g.geometries.forEach(geometry);
      };
      geometry(topo.objects.land);
      if(paths.length&&document.getElementById('v564Land')){
        const NS='http://www.w3.org/2000/svg';
        const fragment=document.createDocumentFragment();
        paths.forEach(d=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',d);fragment.append(p);});
        land.replaceChildren(fragment);
      }
    }catch(err){/* Keep local geographic fallback if CDN is blocked. */}
  }
  function init(){
    const panel=document.getElementById('v560GlobalMarketPanel');
    if(!panel||document.getElementById('v564WorldDashboard'))return;
    panel.classList.add('v564-world-ready');
    const heading=panel.querySelector('.v442-market-titlebar');if(!heading)return;
    const title=panel.querySelector('#v560GlobalTitle');
    if(title)title.textContent='Global';
    const subtitle=heading.querySelector('p');
    if(subtitle)subtitle.textContent='Mercati mondiali, variazioni reali e principali asset su una mappa interattiva.';
    const root=document.createElement('section');
    root.id='v564WorldDashboard';
    root.className='v564-dashboard';
    root.setAttribute('aria-label','Mappa e quotazioni globali');
    root.innerHTML='<div class="v564-data-bar"><div><span class="v564-live-indicator"></span><span id="v564Status" aria-live="polite">Caricamento quotazioni…</span></div><button type="button" id="v564Refresh" aria-label="Aggiorna le quotazioni">↻ Aggiorna</button></div>'+
      '<div class="v564-index-cards" id="v564Indices"></div>'+
      '<div class="v564-layout"><section class="v564-main"><div class="v564-map-title"><div><span>WORLD MARKET MAP</span><h3>Mercati nel mondo</h3></div><small>Seleziona un punto per i dettagli</small></div>'+
      buildMap()+'<div id="v564Focus"></div><h3 class="v564-list-title">Indici per paese</h3><div class="v564-region-list" id="v564Markets"></div></section>'+
      '<aside class="v564-aside" id="v564Aside" aria-label="Materie prime, valute e criptovalute"></aside></div>'+
      '<p class="v564-disclaimer">Fonte: Yahoo Finance (indici, Forex e futures) e CoinGecko (crypto). Variazioni dell’ultima seduta o 24h crypto, anche ritardate. Nessun prezzo simulato.</p>'+
      '<p class="v564-error" id="v564Error" role="status" hidden></p>';
    heading.after(root);
    const explorer=document.createElement('details');explorer.className='v564-explorer';
    explorer.innerHTML='<summary>Esplora altri indici, azioni, ETF e settori</summary>';
    ['.v562-region-map','.v560-region-tabs','.v560-region-content','.v538-etf-note'].forEach(selector=>{
      const el=panel.querySelector(selector);if(el)explorer.append(el);
    });
    root.after(explorer);
    root.addEventListener('click',e=>{
      const b=e.target.closest('[data-market]');
      if(b){state.selected=b.dataset.market;render();}
      if(e.target.closest('#v564Refresh'))load();
    });
    render();load();loadLand();
    window.setInterval(()=>{if(!document.hidden)load();},300000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();