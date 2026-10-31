/* Crypto Terminal Pro V534 — enhancements to the original Market.
   Native table controls; never changes the market data/feed algorithms. */
(() => {
  'use strict';

  function initMarketTools() {
    const tbody = document.getElementById('v442MarketRows');
    const market = document.getElementById('v442MarketMain');
    const sortSelect = document.getElementById('v534MarketSort');
    const filters = [...document.querySelectorAll('[data-v534-filter]')];
    const countLabel = document.getElementById('v534ViewCounter');
    const empty = document.getElementById('v534FilterEmpty');
    if (!tbody || !market || !sortSelect || !filters.length || !countLabel) return;

    let activeFilter = 'all';
    let activeSort = 'rank';
    let pending = false;
    let priorDisplay = '';
    const numeric = (str) => {
      const raw = String(str || '').replace(/[−–]/g, '-').replace(/\s/g, '');
      const match = raw.match(/[-+]?\d+(?:[.,]\d+)*/);
      if (!match) return NaN;
      let number = match[0];
      if (number.includes(',') && number.includes('.')) {
        number = number.lastIndexOf('.') > number.lastIndexOf(',')
          ? number.replace(/,/g, '') : number.replace(/\./g, '').replace(',', '.');
      } else if (number.includes(',')) {
        number = /,\d{1,2}$/.test(number) || /^(?:[-+]?0),\d{3,}$/.test(number) || /,\d{4,}$/.test(number)
          ? number.replace(',', '.') : number.replace(/,/g, '');
      }
      return Number.parseFloat(number);
    };
    const humanNumber = (str) => {
      const txt = String(str || '').trim();
      const match = txt.match(/[-+]?\s*\$?\s*([\d.,]+)\s*([KMBT])?/i);
      if (!match) return NaN;
      const n = numeric(match[1]);
      const multi = { K:1e3, M:1e6, B:1e9, T:1e12 }[String(match[2] || '').toUpperCase()] || 1;
      return n * multi;
    };
    const pct = (row, index) => numeric(row.cells[index]?.textContent || '');
    const sortValue = (row) => {
      if (activeSort === 'rank') return numeric(row.cells[0]?.textContent);
      if (activeSort === 'change24') return pct(row, 4);
      if (activeSort === 'change7') return pct(row, 5);
      if (activeSort === 'cap') return humanNumber(row.cells[6]?.textContent);
      if (activeSort === 'volume') return humanNumber(row.cells[7]?.textContent);
      if (activeSort === 'price') return humanNumber(row.querySelector('.v487-price-value')?.textContent || row.cells[2]?.textContent);
      return 0;
    };
    const valid = n => Number.isFinite(n);
    const tableRows = () => Array.from(tbody.querySelectorAll(':scope > tr.v442-market-row'));

    const observer = new MutationObserver(() => schedule());
    function apply() {
      pending = false;
      const rows = tableRows();
      if (!rows.length) {
        if (empty) empty.hidden = true;
        countLabel.textContent = 'Nessuna quotazione disponibile';
        priorDisplay = countLabel.textContent;
        return;
      }
      observer.disconnect();
      try {
        const decorated = rows.map((row, index) => ({ row, index, rank: numeric(row.cells[0]?.textContent), val: sortValue(row) }));
        decorated.sort((a, b) => {
          const ax = activeSort === 'rank' ? a.rank : a.val;
          const bx = activeSort === 'rank' ? b.rank : b.val;
          if (valid(ax) && !valid(bx)) return -1;
          if (!valid(ax) && valid(bx)) return 1;
          if (!valid(ax) && !valid(bx)) return a.index - b.index;
          const difference = activeSort === 'rank' ? ax - bx : bx - ax;
          return difference || a.index - b.index;
        });
        // Moving existing rows keeps listeners/data attributes intact.
        decorated.forEach(({ row }) => tbody.appendChild(row));
        let visibleCount = 0;
        for (const { row } of decorated) {
          const change = pct(row, 4);
          const show = activeFilter === 'all' || (valid(change) && (activeFilter === 'up' ? change > 0 : change < 0));
          row.classList.toggle('v534-row-hidden', !show);
          if (show) visibleCount++;
        }
        if (empty) empty.hidden = visibleCount !== 0;
        const display = `${visibleCount} crypto visualizzate su ${rows.length} disponibili`;
        if (display !== priorDisplay) { countLabel.textContent = display; priorDisplay = display; }
      } finally {
        observer.observe(tbody, { childList:true });
      }
    }
    function schedule() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(apply);
    }
    observer.observe(tbody, { childList:true });

    for (const button of filters) {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.v534Filter;
        for (const b of filters) {
          const selected = b === button;
          b.classList.toggle('is-active', selected);
          b.setAttribute('aria-pressed', String(selected));
        }
        schedule();
      });
    }
    sortSelect.addEventListener('change', () => { activeSort = sortSelect.value; schedule(); });

    const search = document.getElementById('v442MarketSearch');
    document.addEventListener('keydown', e => {
      if (e.key !== '/' || !market || market.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (target && (target.closest('input,textarea,select,[contenteditable="true"]'))) return;
      if (search) { e.preventDefault(); search.focus(); }
    });

    // V535: quanti mini grafici hanno davvero lo storico a 7 giorni.
    const coverage = document.getElementById('v535ChartCoverage');
    function updateCoverage() {
      if (!coverage) return;
      const rows = tableRows();
      if (!rows.length) { coverage.textContent = ''; return; }
      const ready = rows.filter(r => r.querySelector('svg[data-period="7d"]')).length;
      coverage.textContent = ' · Grafici 7G: ' + ready + '/' + rows.length + (ready < rows.length ? ' · storico parziale' : '');
    }
    setInterval(updateCoverage, 2500);
    updateCoverage();
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMarketTools, { once:true });
  else initMarketTools();
})();


/* V542: un solo elemento grafico per ogni contenitore; non reinizializza il feed live. */
(() => {
  'use strict';
  if (window.__v542ChartDedupStarted) return;
  window.__v542ChartDedupStarted = true;
  let scheduled = false;
  function clean() {
    const grid = document.querySelector('.market-grid');
    if (grid) {
      const cardIds = new Set();
      for (const card of Array.from(grid.children)) {
        if (!card.classList?.contains('market-card')) continue;
        if (card.id && cardIds.has(card.id)) { card.remove(); continue; }
        if (card.id) cardIds.add(card.id);
        const wrap = card.querySelector(':scope > .chart-wrap');
        if (wrap) {
          const chartHolders = Array.from(wrap.querySelectorAll(':scope > .chart'));
          for (const surplus of chartHolders.slice(1)) surplus.remove();
        }
        for (const holder of card.querySelectorAll('.chart, .indicator-canvas')) {
          const duplicateRoots = Array.from(holder.querySelectorAll(':scope > .tv-lightweight-charts'));
          // Conserva l'istanza grafica più recente se una libreria ne ha create più di una.
          for (const root of duplicateRoots.slice(0, -1)) root.remove();
        }
      }
    }
    const canvas = document.getElementById('v525WorkspaceCanvas');
    if (canvas) {
      const cardIds = new Set();
      for (const card of canvas.querySelectorAll(':scope > .v525-widget')) {
        const id = card.dataset.cardId;
        if (!id) continue;
        if (cardIds.has(id)) card.remove();
        else cardIds.add(id);
      }
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; clean(); });
  }
  function relevant(mutation) {
    if (mutation.type !== 'childList' || !mutation.addedNodes.length) return false;
    const target = mutation.target;
    if (target?.matches?.('.market-grid, .chart, .indicator-canvas, .chart-wrap, #v525WorkspaceCanvas')) return true;
    return Array.from(mutation.addedNodes).some(node => node.nodeType === 1 && (
      node.matches?.('.market-card, .v525-widget, .tv-lightweight-charts, .chart') ||
      node.querySelector?.('.tv-lightweight-charts, .market-card, .v525-widget')
    ));
  }
  function start() {
    const grid = document.querySelector('.market-grid');
    const workspace = document.getElementById('v525WorkspaceCanvas');
    if (!grid && !workspace) return;
    const observer = new MutationObserver(records => {
      if (records.some(relevant)) schedule();
    });
    if (grid) observer.observe(grid, { childList: true, subtree: true });
    if (workspace) observer.observe(workspace, { childList: true });
    window.addEventListener('pageshow', schedule, { passive: true });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
