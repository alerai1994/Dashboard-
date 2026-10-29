/* Crypto Terminal Pro V534 — enhancements to the original Market.
   Native table controls; never changes the market data/feed algorithms. */
(() => {
  'use strict';

  function initMarketTools() {
    const tbody = document.getElementById('v442MarketRows');
    const market = document.getElementById('v442MarketMain');
    const sortSelect = document.getElementById('v534MarketSort');
    const filters = [...document.querySelectorAll('[data-v534-filter]')];
    const exportBtn = document.getElementById('v534ExportCsv');
    const countLabel = document.getElementById('v534ViewCounter');
    const empty = document.getElementById('v534FilterEmpty');
    if (!tbody || !market || !sortSelect || !filters.length || !exportBtn || !countLabel) return;

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
        exportBtn.disabled = true;
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
        exportBtn.disabled = visibleCount === 0;
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

    function csvEscape(value) {
      let str = String(value ?? '').replace(/\s+/g, ' ').trim();
      // Prevent spreadsheet formula injection from arbitrary coin names/symbols.
      if (/^[=+@]|^-(?!\d)/.test(str)) str = "'" + str;
      return '"' + str.replace(/"/g, '""') + '"';
    }
    exportBtn.addEventListener('click', () => {
      const current = tableRows().filter(row => !row.classList.contains('v534-row-hidden'));
      if (!current.length) return;
      const csvRows = [['Rank','Criptovaluta','Simbolo','Prezzo USD','1h %','24h %','7g %','Market Cap USD','Volume 24h USD','Supply circolante','Sentiment']];
      for (const row of current) {
        const cells = row.cells;
        csvRows.push([
          cells[0]?.textContent, row.querySelector('.v442-market-coin-name')?.textContent || cells[1]?.textContent,
          row.querySelector('.v442-market-coin-symbol')?.textContent || '',
          row.querySelector('.v487-price-value')?.textContent || cells[2]?.textContent,
          cells[3]?.textContent, cells[4]?.textContent, cells[5]?.textContent,
          cells[6]?.textContent, cells[7]?.textContent, cells[8]?.textContent,
          row.querySelector('.v451-sentiment-text')?.textContent || cells[9]?.textContent
        ]);
      }
      const csv = '\uFEFF' + csvRows.map(fields => fields.map(csvEscape).join(';')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'crypto-market-' + new Date().toISOString().slice(0,10) + '.csv';
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    });

    const search = document.getElementById('v442MarketSearch');
    document.addEventListener('keydown', e => {
      if (e.key !== '/' || !market || market.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (target && (target.closest('input,textarea,select,[contenteditable="true"]'))) return;
      if (search) { e.preventDefault(); search.focus(); }
    });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMarketTools, { once:true });
  else initMarketTools();
})();
