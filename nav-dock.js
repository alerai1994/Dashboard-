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
