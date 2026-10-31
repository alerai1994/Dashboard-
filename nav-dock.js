/* Crypto Terminal Pro V538 — menu rapido a sinistra (Market · A/B · ETF),
   barra Workspace in basso e nuova sezione ETF nel menu a tendina.
   Non modifica i dati di mercato: usa i pulsanti gia presenti nel menu. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  // Elenco indicativo di ETF spot su Bitcoin ed Ethereum quotati negli USA.
  // Non contiene prezzi: il link apre la quotazione aggiornata su Yahoo Finance.
  const ETFS = [
    ['BTC','IBIT','iShares Bitcoin Trust','BlackRock'],
    ['BTC','FBTC','Wise Origin Bitcoin Fund','Fidelity'],
    ['BTC','GBTC','Grayscale Bitcoin Trust','Grayscale'],
    ['BTC','ARKB','ARK 21Shares Bitcoin ETF','ARK / 21Shares'],
    ['BTC','BITB','Bitwise Bitcoin ETF','Bitwise'],
    ['BTC','HODL','VanEck Bitcoin ETF','VanEck'],
    ['BTC','BTCO','Invesco Galaxy Bitcoin ETF','Invesco / Galaxy'],
    ['BTC','EZBC','Franklin Bitcoin ETF','Franklin Templeton'],
    ['ETH','ETHA','iShares Ethereum Trust','BlackRock'],
    ['ETH','FETH','Fidelity Ethereum Fund','Fidelity'],
    ['ETH','ETHE','Grayscale Ethereum Trust','Grayscale'],
    ['ETH','ETHW','Bitwise Ethereum ETF','Bitwise'],
    ['ETH','CETH','21Shares Core Ethereum ETF','21Shares'],
    ['ETH','QETH','Invesco Galaxy Ethereum ETF','Invesco / Galaxy'],
    ['ETH','EZET','Franklin Ethereum ETF','Franklin Templeton']
  ];

  function init() {
    const drawer = $('v442MarketDrawer'), menuBtn = $('v442MenuButton');
    const nav = drawer && drawer.querySelector('.v442-market-nav');
    const marketNav = $('v442MarketNav'), compareNav = $('v490CompareNav'), wsNav = $('v525WorkspaceNav');
    const marketPanel = $('v442MarketMain'), comparePanel = $('v490ComparePanel'), wsPanel = $('v525WorkspacePanel');
    if (!drawer || !menuBtn || !nav || !marketNav || !compareNav || !wsNav || !comparePanel) return;

    // --- Pannello ETF dentro il menu a tendina ---
    const panel = document.createElement('section');
    panel.id = 'v538EtfPanel';
    panel.className = 'v442-market-main v538-etf';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'v538EtfTitle');
    let filter = 'all';
    const rowsHtml = () => ETFS.filter(e => filter === 'all' || e[0] === filter).map(e =>
      '<tr><td><span class="v538-tag v538-tag-' + e[0].toLowerCase() + '">' + e[0] + '</span></td>' +
      '<td><strong>' + e[1] + '</strong></td><td>' + e[2] + '</td><td>' + e[3] + '</td>' +
      '<td><a href="https://finance.yahoo.com/quote/' + e[1] + '" target="_blank" rel="noopener noreferrer">Quotazione ↗</a></td></tr>'
    ).join('');
    panel.innerHTML =
      '<div class="v442-market-titlebar"><div><div class="v442-eyebrow">ETF · MERCATI</div>' +
      '<h2 id="v538EtfTitle">ETF su Bitcoin ed Ethereum</h2>' +
      '<p class="v534-market-subtitle">ETF spot quotati negli Stati Uniti. Elenco indicativo senza prezzi: apri la quotazione aggiornata dal link.</p></div></div>' +
      '<div class="v538-etf-filters" role="group" aria-label="Filtra gli ETF">' +
      '<button type="button" class="v534-filter is-active" data-v538-etf="all" aria-pressed="true">Tutti</button>' +
      '<button type="button" class="v534-filter" data-v538-etf="BTC" aria-pressed="false">Bitcoin</button>' +
      '<button type="button" class="v534-filter" data-v538-etf="ETH" aria-pressed="false">Ethereum</button></div>' +
      '<div class="v442-market-scroll"><table class="v538-etf-table" aria-label="ETF su criptovalute">' +
      '<thead><tr><th scope="col">Asset</th><th scope="col">Ticker</th><th scope="col">Nome</th><th scope="col">Emittente</th><th scope="col">Dati</th></tr></thead>' +
      '<tbody id="v538EtfRows">' + rowsHtml() + '</tbody></table></div>' +
      '<p class="v538-etf-note">Gli ETF possono cambiare nome o essere sostituiti: verifica sempre sul sito dell’emittente. Le performance passate non garantiscono risultati futuri.</p>';
    comparePanel.after(panel);
    panel.querySelectorAll('[data-v538-etf]').forEach(btn => btn.addEventListener('click', () => {
      filter = btn.dataset.v538Etf;
      panel.querySelectorAll('[data-v538-etf]').forEach(b => {
        const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
      });
      $('v538EtfRows').innerHTML = rowsHtml();
    }));

    const etfNav = document.createElement('button');
    etfNav.type = 'button'; etfNav.id = 'v538EtfNav'; etfNav.className = 'v442-nav-button';
    etfNav.innerHTML = '<span aria-hidden="true">◈</span> ETF <small>BITCOIN · ETHEREUM</small>';
    nav.appendChild(etfNav);

    function showEtf() {
      [marketPanel, comparePanel, wsPanel].forEach(p => { if (p) p.hidden = true; });
      panel.hidden = false;
      for (const b of [marketNav, compareNav, wsNav]) { b.classList.remove('is-selected'); b.removeAttribute('aria-current'); }
      etfNav.classList.add('is-selected'); etfNav.setAttribute('aria-current', 'page');
      drawer.setAttribute('aria-labelledby', 'v538EtfTitle');
      document.dispatchEvent(new CustomEvent('v525:workspace-visibility', { detail: { visible: false } }));
    }
    function leaveEtf() {
      panel.hidden = true; etfNav.classList.remove('is-selected'); etfNav.removeAttribute('aria-current');
    }
    etfNav.addEventListener('click', showEtf);
    [marketNav, compareNav, wsNav].forEach(b => b.addEventListener('click', leaveEtf));

    // --- Menu rapido: apre il menu (se chiuso) e sceglie la sezione ---
    function go(target) {
      if (!target) return;
      if (document.body.classList.contains('v442-market-open')) { target.click(); return; }
      menuBtn.click();
      setTimeout(() => target.click(), 140);
    }
    const map = { market: marketNav, compare: compareNav, etf: etfNav, workspace: wsNav };
    const closeMenu = () => {
      if (document.body.classList.contains('v442-market-open')) menuBtn.click();
    };
    document.querySelectorAll('[data-v538-go]').forEach(btn =>
      btn.addEventListener('click', () => {
        if (btn.dataset.v538Go === 'home') closeMenu(); else go(map[btn.dataset.v538Go]);
      }));

    // Evidenzia la sezione attiva nel menu rapido.
    const buttons = [...document.querySelectorAll('[data-v538-go]')];
    function syncActive() {
      const open = document.body.classList.contains('v442-market-open');
      let current = 'home';
      if (open) {
        if (etfNav.classList.contains('is-selected')) current = 'etf';
        else if (compareNav.classList.contains('is-selected')) current = 'compare';
        else if (wsNav.classList.contains('is-selected')) current = 'workspace';
        else if (marketNav.classList.contains('is-selected')) current = 'market';
      }
      buttons.forEach(b => b.classList.toggle('is-active', b.dataset.v538Go === current));
    }
    setInterval(syncActive, 400);
    syncActive();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();


/* V560 — Global Market by region, lazy sections and unobtrusive dock. */
(() => {
  'use strict';
  if (window.__injGlobalMarketV560) return;
  window.__injGlobalMarketV560 = true;
  const $ = id => document.getElementById(id);
  const REGIONS = {
    americas: {
      name:'Americhe', icon:'🌎',
      groups:{
        'Indici':[['S&P 500','^GSPC'],['Nasdaq Composite','^IXIC'],['Dow Jones','^DJI'],['S&P/TSX Composite','^GSPTSE']],
        'Azioni · Tecnologia':[['Apple','AAPL'],['Microsoft','MSFT'],['NVIDIA','NVDA'],['Alphabet','GOOGL']],
        'ETF':[['SPDR S&P 500','SPY'],['Invesco QQQ','QQQ'],['iShares Core S&P 500','IVV']],
        'Settori · ETF':[['Technology Select Sector','XLK'],['Financial Select Sector','XLF'],['Energy Select Sector','XLE']]
      }
    },
    europe: {
      name:'Europa', icon:'🌍',
      groups:{
        'Indici':[['Euro STOXX 50','^STOXX50E'],['DAX','^GDAXI'],['FTSE 100','^FTSE'],['CAC 40','^FCHI']],
        'Azioni':[['ASML','ASML.AS'],['SAP','SAP.DE'],['LVMH','MC.PA'],['Siemens','SIE.DE']],
        'ETF':[['iShares Core MSCI Europe','IMEU.AS'],['iShares STOXX Europe 600','EXSA.DE']],
        'Settori · Esempi':[['ASML · Semiconduttori','ASML.AS'],['Siemens · Industria','SIE.DE'],['LVMH · Consumi','MC.PA']]
      }
    },
    asia: {
      name:'Asia Pacifico', icon:'🌏',
      groups:{
        'Indici':[['Nikkei 225','^N225'],['Hang Seng','^HSI'],['S&P/ASX 200','^AXJO'],['KOSPI','^KS11']],
        'Azioni':[['Toyota','7203.T'],['Sony','6758.T'],['Samsung Electronics','005930.KS'],['TSMC','2330.TW']],
        'ETF · Esempi':[['iShares MSCI Japan','EWJ'],['iShares MSCI Pacific ex Japan','EPP']],
        'Settori · Esempi':[['Toyota · Automotive','7203.T'],['TSMC · Semiconduttori','2330.TW'],['Sony · Tecnologia','6758.T']]
      }
    }
  };
  let active='americas';
  const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function init() {
    const drawer=$('v442MarketDrawer'), menu=$('v442MenuButton'), dock=document.querySelector('.v538-dock');
    const nav=drawer?.querySelector('.v442-market-nav');
    const market=$('v442MarketMain'), ws=$('v525WorkspacePanel'), compare=$('v490ComparePanel'), etf=$('v538EtfPanel');
    if(!drawer||!menu||!dock||!market||!ws||!compare||!etf||!nav)return;
    const panel=document.createElement('section');
    panel.id='v560GlobalMarketPanel';
    panel.className='v442-market-main v560-global';
    panel.hidden=true;
    panel.setAttribute('aria-labelledby','v560GlobalTitle');
    panel.innerHTML='<div class="v442-market-titlebar"><div><div class="v442-eyebrow">WORLD MARKETS</div><h2 id="v560GlobalTitle">Global Market</h2><p class="v534-market-subtitle">Esplora indici, azioni, ETF e settori per area geografica. Quotazioni e disponibilità su fonte esterna.</p></div></div>'+
      '<div class="v560-region-tabs" role="tablist" aria-label="Aree geografiche">'+
      Object.entries(REGIONS).map(([id,r],i)=>'<button type="button" role="tab" id="v560-tab-'+id+'" data-region="'+id+'" aria-selected="'+(i===0)+'" aria-controls="v560-region-content">'+r.icon+' '+r.name+'</button>').join('')+
      '</div><div class="v560-region-content" id="v560-region-content" role="tabpanel" aria-labelledby="v560-tab-americas"></div>'+
      '<p class="v538-etf-note">Selezione indicativa di strumenti: nessun prezzo sintetico. I link aprono la pagina della quotazione esterna. Verifica sempre mercato e ticker prima di operare.</p>';
    etf.after(panel);
    const content=$('v560-region-content');
    const render=()=>{
      const data=REGIONS[active];
      content.setAttribute('aria-labelledby','v560-tab-'+active);
      content.replaceChildren();
      for(const [group,items] of Object.entries(data.groups)){
        const details=document.createElement('details');
        details.className='v560-market-group';
        details.innerHTML='<summary>'+escapeHtml(group)+'<span>'+items.length+' strumenti</span></summary>';
        const list=document.createElement('div'); list.className='v560-instruments';
        for(const [name,symbol] of items){
          const a=document.createElement('a');
          a.href='https://finance.yahoo.com/quote/'+encodeURIComponent(symbol)+'/';
          a.target='_blank';a.rel='noopener noreferrer';
          const n=document.createElement('strong'); n.textContent=name;
          const code=document.createElement('span');code.textContent=symbol+' ↗';
          a.append(n,code);list.append(a);
        }
        details.append(list);content.append(details);
      }
    };
    render();
    panel.querySelectorAll('[data-region]').forEach(button=>button.addEventListener('click',()=>{
      active=button.dataset.region;
      panel.querySelectorAll('[data-region]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===button)));
      render();
    }));
    const globalNav=document.createElement('button');globalNav.type='button';globalNav.className='v442-nav-button';
    globalNav.id='v560GlobalMarketNav';globalNav.textContent='🌐 Global Market';
    nav.append(globalNav);
    const globalDock=document.createElement('button');globalDock.type='button';globalDock.dataset.v538Go='global';
    globalDock.dataset.label='Global Market';globalDock.setAttribute('aria-label','Apri Global Market');
    globalDock.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/></svg><span>Global</span>';
    dock.append(globalDock);
    const otherNav=['v442MarketDashboardNav','v525WorkspaceNav','v442MarketNav','v490CompareNav','v538EtfNav'];
    const leave=()=>{panel.hidden=true;globalNav.classList.remove('is-selected');globalDock.classList.remove('is-active')};
    const show=()=>{
      [market,ws,compare,etf].forEach(p=>p.hidden=true);
      panel.hidden=false;globalNav.classList.add('is-selected');
      drawer.setAttribute('aria-labelledby','v560GlobalTitle');
      document.dispatchEvent(new CustomEvent('v525:workspace-visibility',{detail:{visible:false}}));
      globalDock.classList.add('is-active');
    };
    globalNav.addEventListener('click',show);
    for(const id of otherNav)$(id)?.addEventListener('click',leave);
    dock.querySelectorAll('[data-v538-go]').forEach(b=>{
      if(b!==globalDock)b.addEventListener('click',leave);
    });
    globalDock.addEventListener('click',()=>{
      if(!document.body.classList.contains('v442-market-open'))menu.click();
      show();
    });
    // Navigation remains reachable without wasting vertical space on Home.
    let hideTimer,showTimer;
    const schedule=()=>{
      clearTimeout(hideTimer);clearTimeout(showTimer);
      dock.classList.remove('v560-dock-hidden');
      const isHome=!document.body.classList.contains('v442-market-open');
      if(isHome){
        hideTimer=setTimeout(()=>{
          if(!dock.matches(':hover')&&!dock.contains(document.activeElement)&&!document.hidden)
            dock.classList.add('v560-dock-hidden');
        },6500);
      } else {
        dock.classList.add('v560-dock-pending');
        showTimer=setTimeout(()=>dock.classList.remove('v560-dock-pending'),900);
      }
    };
    const reveal=()=>{
      dock.classList.remove('v560-dock-hidden','v560-dock-pending');
      schedule();
    };
    document.addEventListener('pointermove',e=>{
      if(e.clientY>=window.innerHeight-85&&dock.classList.contains('v560-dock-hidden'))reveal();
    },{passive:true});
    document.addEventListener('keydown',e=>{
      if(e.key==='Tab'&&dock.classList.contains('v560-dock-hidden'))reveal();
    });
    dock.addEventListener('focusin',()=>{clearTimeout(hideTimer);dock.classList.remove('v560-dock-hidden')});
    dock.addEventListener('focusout',()=>setTimeout(schedule,100));
    dock.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
    dock.addEventListener('pointerleave',schedule);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
