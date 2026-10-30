from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
js_path = ROOT / "script.js"
html_path = ROOT / "index.html"
css_path = ROOT / "style.css"
js = js_path.read_text(encoding="utf-8")
html = html_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# V546: disable the legacy EMA-cross flashing at the source.
# The previous V148 routine used a 100ms interval for up to 60 seconds.
if "V546 EMA STEADY" not in js:
    begin = js.index("      function blinkEmaCrossLines(symbol, events) {")
    finish = js.index("      function collectLatestCandleEmaCrosses(symbol, emaDataByPeriod) {", begin)
    js = js[:begin] + """      // V546 EMA STEADY: preserve fixed EMA colors and widths, never blink.
      function blinkEmaCrossLines(symbol, events) {
        stopEmaCrossLineBlink(symbol, EMA_CONFIG.map(item => item.period));
      }

""" + js[finish:]
    js_path.write_text(js, encoding="utf-8")
# Ensure users load the updated script rather than a cached previous version.
html_path.write_text(html, encoding="utf-8")

html = re.sub(r'(script\.js\?v=)\d+', lambda m: m.group(1) + '546', html)
html = re.sub(r'(style\.css\?v=)\d+', lambda m: m.group(1) + '546', html)
html = re.sub(r'(workspace\.js\?v=)\d+', lambda m: m.group(1) + '546', html)
html_path.write_text(html, encoding="utf-8")
# V545: final, idempotent display normalization. This runs on every deployment.
V545_CSS = """
/* V545 FINAL CLEAN CHART: stable, single pane for candles and four moving averages. */
.market-card .chart-wrap { position:relative; overflow:hidden !important; isolation:isolate; box-shadow:none !important; }
.market-card .chart { overflow:hidden !important; }
.market-card .trading-zones-layer-v46,
.market-card .trading-zone-v46,
.market-card .ema-cross-live-alert,
.market-card .ema-axis-badge,
.market-card .volume-axis-badge { display:none !important; }
.market-card .v439-indicator-shell { border:0 !important; box-shadow:none !important; background:transparent !important; }
.market-card .v439-indicator-toggle { display:none !important; }
.market-card .v439-indicator-content { display:block !important; max-height:none !important; height:auto !important; opacity:1 !important; visibility:visible !important; overflow:visible !important; padding:0 !important; }
.market-card .v439-indicator-content > .indicator-stack { display:flex !important; flex-direction:column !important; gap:8px !important; }
.market-card .v439-indicator-content .indicator-panel { width:100% !important; max-width:100% !important; min-width:0 !important; flex:none !important; margin:0 !important; box-shadow:none !important; }
.market-card .v439-indicator-content .indicator-panel:nth-child(3) { order:1 !important; }
.market-card .v439-indicator-content .indicator-panel:nth-child(2) { order:2 !important; }
.market-card .v439-indicator-content .indicator-panel:nth-child(1) { order:3 !important; }
.market-card .v439-indicator-content .indicator-panel:nth-child(n+4) { display:none !important; }
.market-card .v439-indicator-content .indicator-canvas { width:100% !important; min-width:0 !important; }
"""
if "/* V545 FINAL CLEAN CHART:" not in css:
    css += "\n" + V545_CSS
    css_path.write_text(css, encoding="utf-8")
# Bust previous CSS/JS caches in all HTML references when the patch runs.
html_path.write_text(html, encoding="utf-8")


# V544: applied to the existing V543 production chart, not the workspace chart.
if "V543 · Pan temporale" in js and "V544 MAIN CHART CLEAN" not in js:
    replacements = [
        ("const markers = buildTopBottomMarkers(candles)\n          .sort((a, b) => Number(a.time) - Number(b.time));",
         "const markers = []; // V544 MAIN CHART CLEAN: remove historical TOP/BOTTOM markers"),
        ("const zonesEnabledV172 = window.__indicatorModelsPrefsV172?.zones !== false;",
         "const zonesEnabledV172 = false; // V544: hide all trading zones"),
        ("const targetsEnabledV172 = window.__indicatorModelsPrefsV172?.targets !== false;",
         "const targetsEnabledV172 = false; // V544: hide all target lines"),
        ("const targetOn = window.__indicatorModelsPrefsV172?.targets !== false;",
         "const targetOn = false; // V544: targets remain disabled"),
        ("""const EMA_CROSS_PAIRS = [
        [15, 20], [15, 50], [15, 200],
        [20, 50], [20, 200], [50, 200]
      ];""",
         """const EMA_CROSS_PAIRS = [
        [12, 26], [12, 50], [12, 200],
        [26, 50], [26, 200], [50, 200]
      ];""")
    ]
    for old, new in replacements:
        count = js.count(old)
        if count != 1:
            raise ValueError(f"V544 main chart replacement count {count}, expected 1: {old[:75]}")
        js = js.replace(old, new)
    # Make existing zones invisible, including those created before preferences change.
    if "/* V544 chart-only cleanup */" not in css:
        css += """
/* V544 chart-only cleanup */
.market-card .trading-zones-layer-v46,
.market-card .trading-zone-v46,
.market-card .ema-cross-live-alert,
.market-card .volume-axis-badge,
.market-card .ema-axis-badge { display:none !important; }
.market-card .chart-wrap { overflow:hidden; }
.v439-indicator-content > .indicator-stack { display:flex !important; flex-direction:column !important; }
.v439-indicator-content .indicator-panel:nth-child(3) { order:1; }
.v439-indicator-content .indicator-panel:nth-child(2) { order:2; }
.v439-indicator-content .indicator-panel:nth-child(1) { order:3; }
.v439-indicator-content .indicator-panel:nth-child(n+4) { display:none !important; }
"""
    html = html.replace('script.js?v=543', 'script.js?v=544')
    html = html.replace('style.css?v=543', 'style.css?v=544')
    html = html.replace('workspace.js?v=543', 'workspace.js?v=544')
    js_path.write_text(js, encoding="utf-8")
    html_path.write_text(html, encoding="utf-8")
    css_path.write_text(css, encoding="utf-8")
    print("V544 primary chart successfully patched: OHLC + EMA 12/26/50/200, 3 lower panels; markers, targets, zones removed")
    raise SystemExit(0)

if "V543 · Pan temporale" in js:
    print("Dashboard chart patch already applied")
    raise SystemExit(0)

def replace_once(text, old, new, name):
    count = text.count(old)
    if count != 1:
        raise ValueError(f"{name}: expected 1 match, got {count}")
    return text.replace(old, new)

js = replace_once(js, """      const EMA_CONFIG = [
        { period: 15, color: '#facc15', width: 1 },
        { period: 20, color: '#38bdf8', width: 1 },
        { period: 50, color: '#f97316', width: 2 },
        { period: 200, color: '#e879f9', width: 2 }
      ];""", """      const EMA_CONFIG = [
        { period: 12, color: '#facc15', width: 2 },
        { period: 26, color: '#38bdf8', width: 2 },
        { period: 50, color: '#f97316', width: 2 },
        { period: 200, color: '#e879f9', width: 2 }
      ];""", "ema")
js = js.replace("[15, 20, 50, 200]", "[12, 26, 50, 200]")
js = js.replace("EMA 15/20/50/200", "EMA 12/26/50/200")
js = js.replace("EMA 15 / EMA 20", "EMA 12 / EMA 26")
js = js.replace("t('stochastic') + ' · 14/3'", "'Stoch RSI · 14/14/3/3'")

stoch_rsi = """      // V543: Stoch RSI (14,14,3,3) calcolato sul RSI, non sui prezzi.
      function calculateStochRSI(rsiValues, lookback = 14, kSmooth = 3, dSmooth = 3) {
        const raw = Array(rsiValues.length).fill(null);
        const k = Array(rsiValues.length).fill(null);
        const d = Array(rsiValues.length).fill(null);
        for (let i = lookback - 1; i < rsiValues.length; i++) {
          const values = rsiValues.slice(i - lookback + 1, i + 1);
          if (!values.every(Number.isFinite)) continue;
          const low = Math.min(...values), high = Math.max(...values);
          raw[i] = high === low ? 50 : Math.max(0, Math.min(100, (rsiValues[i] - low) / (high - low) * 100));
        }
        for (let i = kSmooth - 1; i < raw.length; i++) {
          const values = raw.slice(i - kSmooth + 1, i + 1);
          if (values.every(Number.isFinite)) k[i] = values.reduce((s, v) => s + v, 0) / kSmooth;
        }
        for (let i = dSmooth - 1; i < k.length; i++) {
          const values = k.slice(i - dSmooth + 1, i + 1);
          if (values.every(Number.isFinite)) d[i] = values.reduce((s, v) => s + v, 0) / dSmooth;
        }
        return { k, d };
      }

"""
js = replace_once(js, "      function calculateEmaValues(values, period) {", stoch_rsi + "      function calculateEmaValues(values, period) {", "stoch function")
js = replace_once(js, "const stochastic = calculateStochastic(candles, 14, 3);", "const stochastic = calculateStochRSI(rsi, 14, 3, 3);", "stoch compute")

start_chart = js.index("      function makeChart(symbol) {")
start = js.index("""          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true
          },""", start_chart)
end = js.index("          localization: { locale: currentLocale() }", start)
assert end - start < 1700
js = js[:start] + """          // V543: nessuno zoom nativo, pan storico gestito sotto.
          handleScale: false,
          handleScroll: false,
""" + js[end:]

start = js.index("        /* V138 — trascinamento reale del plot in 4 direzioni,", start_chart)
end = js.index("        const armHistoryLoading = () => {", start)
assert end - start < 35000
pan = """        /* V543 · Pan temporale: cronologia scorrevole senza zoom. */
        (() => {
          let activePointer = null;
          let startClientX = 0;
          let originRange = null;
          let moved = false;
          const timeline = chart.timeScale();
          const readRange = () => {
            try {
              const r = timeline.getVisibleLogicalRange();
              return r && Number.isFinite(r.from) && Number.isFinite(r.to) && r.to > r.from ? r : null;
            } catch (_) { return null; }
          };
          const moveRange = (range, shiftBars) => {
            if (!range || !Number.isFinite(shiftBars)) return;
            const span = range.to - range.from;
            try {
              timeline.setVisibleLogicalRange({ from: range.from + shiftBars, to: range.from + shiftBars + span });
              lockChartView(symbol);
              rememberChartView(symbol);
              maybeLoadOlderHistory(symbol, timeline.getVisibleLogicalRange());
            } catch (_) {}
          };
          const onDown = event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            if (activePointer !== null) return;
            const range = readRange();
            if (!range) return;
            activePointer = event.pointerId;
            startClientX = event.clientX;
            originRange = range;
            moved = false;
            lockChartView(symbol);
            try { container.setPointerCapture(event.pointerId); } catch (_) {}
            container.classList.add('chart-pan-active');
          };
          const onMove = event => {
            if (activePointer !== event.pointerId || !originRange) return;
            const dx = event.clientX - startClientX;
            if (Math.abs(dx) < 2 && !moved) return;
            moved = true;
            if (event.cancelable) event.preventDefault();
            moveRange(originRange, -(dx / Math.max(1, container.clientWidth)) * (originRange.to - originRange.from));
          };
          const onEnd = event => {
            if (event.pointerId !== activePointer) return;
            try { container.releasePointerCapture(event.pointerId); } catch (_) {}
            activePointer = null;
            originRange = null;
            container.classList.remove('chart-pan-active');
          };
          container.addEventListener('pointerdown', onDown, { passive: true });
          container.addEventListener('pointermove', onMove, { passive: false });
          container.addEventListener('pointerup', onEnd, { passive: true });
          container.addEventListener('pointercancel', onEnd, { passive: true });
          container.addEventListener('lostpointercapture', onEnd, { passive: true });
          container.addEventListener('wheel', event => {
            if (event.cancelable) event.preventDefault();
            const r = readRange();
            if (!r) return;
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            const scale = event.deltaMode === 1 ? 18 : (event.deltaMode === 2 ? container.clientWidth : 1);
            moveRange(r, (r.to - r.from) * delta * scale / Math.max(1, container.clientWidth) * 0.75);
          }, { passive: false });
        })();

"""
js = js[:start] + pan + js[end:]

js = replace_once(js, "        charts[symbol] = {\n          chart,", """        // Proteggi tutte le future chiamate a applyOptions, inclusi i watchdog.
        const originalChartApplyOptionsV543 = chart.applyOptions.bind(chart);
        chart.applyOptions = function(opts = {}) {
          return originalChartApplyOptionsV543({ ...opts, handleScale: false, handleScroll: false });
        };

        charts[symbol] = {
          chart,""", "future zoom guard")
js = replace_once(js, "if (symbol === ORE_SYMBOL || symbol === ORAI_SYMBOL) volume.applyOptions({ visible: true });", "volume.applyOptions({ visible: false });", "volume overlay")

html = html.replace('class="v439-indicator-shell"', 'class="v439-indicator-shell is-open"')
html = html.replace('class="v439-indicator-toggle" aria-expanded="false"', 'class="v439-indicator-toggle" aria-expanded="true"')
html = re.sub(r'(class="v439-indicator-content" id="v439-indicators-[a-z]+" aria-hidden=")true', r'\1false', html)
html = html.replace("7 indicatori", "3 indicatori")
html = html.replace("RSI, MACD, Stocastico e altri", "MACD · Stoch RSI · RSI")
html = html.replace("Stocastico · 14/3", "Stoch RSI · 14/14/3/3")
for old, new in [("ema-15","ema-12"),("ema-20","ema-26"),("EMA 15","EMA 12"),("EMA 20","EMA 26")]:
    html = html.replace(old, new)
html = html.replace("?v=542", "?v=543")

css += """

/* ===== V543: prezzo pulito + EMA12/26/50/200, MACD, Stoch RSI, RSI ===== */
.market-card .chart, .market-card .chart canvas, .market-card .chart > div {
  touch-action: pan-y !important;
  overscroll-behavior-x: contain !important;
}
.market-card .chart, .market-card .chart canvas { cursor: grab !important; }
.market-card .chart.chart-pan-active, .market-card .chart.chart-pan-active canvas { cursor: grabbing !important; }
.market-card .chart-wrap { border-radius:12px !important; box-shadow:none !important; }
.market-card .ema-legend { box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important; }
.market-card .ema-axis-badge, .market-card .volume-axis-badge, .market-card .ema-cross-live-alert { display:none !important; }
.v439-indicator-shell { border:0 !important; box-shadow:none !important; background:transparent !important; margin-top:8px !important; }
body.light .v439-indicator-shell { background:transparent !important; box-shadow:none !important; }
.v439-indicator-toggle { display:none !important; }
.v439-indicator-shell .v439-indicator-content {
  max-height:none !important; visibility:visible !important; opacity:1 !important;
  overflow:visible !important; pointer-events:auto !important; padding:0 6px 8px !important;
}
.v439-indicator-content > .indicator-stack {
  display:flex !important; flex-direction:column !important; gap:8px !important;
  padding:0 !important; border-top:0 !important;
}
.v439-indicator-content .indicator-panel:nth-child(3) { order:1; } /* MACD */
.v439-indicator-content .indicator-panel:nth-child(2) { order:2; } /* Stoch RSI */
.v439-indicator-content .indicator-panel:nth-child(1) { order:3; } /* RSI */
.v439-indicator-content .indicator-panel:nth-child(n+4) { display:none !important; }
.v439-indicator-content .indicator-panel.primary {
  width:100% !important; min-width:0 !important;
  border:1px solid color-mix(in srgb, var(--muted) 18%, transparent) !important;
  border-radius:10px !important; box-shadow:none !important;
}
.v439-indicator-content .indicator-head { min-height:30px !important; padding:6px 10px !important; letter-spacing:0 !important; }
.v439-indicator-content .indicator-head span::before { box-shadow:none !important; }
.v439-indicator-content .indicator-canvas { height:104px !important; min-height:104px !important; filter:none !important; }
@media(max-width:700px) {
  .v439-indicator-content .indicator-canvas { height:96px !important; min-height:96px !important; }
}
"""
assert "V543 · Pan temporale" in js
assert "calculateStochRSI(rsi, 14, 3, 3)" in js
assert "ema-12" in html and "ema-26" in html
js_path.write_text(js, encoding="utf-8")
html_path.write_text(html, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
print("Patched chart files:", js_path.name, html_path.name, css_path.name)
