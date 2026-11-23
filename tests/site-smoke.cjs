'use strict';
/* Zero-dependency regression smoke test for Vertex. Run: node tests/site-smoke.cjs */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const source=read('script.js'),html=read('index.html'),css=read('style.css');
assert(source.includes("chartRange=a.group==='crypto'&&['markets','workspace'].includes(state.page)?'MAX':'1D'"), 'Markets crypto details must open MAX while other pages keep 1D');
assert(source.includes("if(a.group==='crypto')observeChartQuote(id,quote(id))"), 'Opening a crypto chart must seed its latest verified quote');
assert(source.includes('function chartLiveObservedPricePoints(id,base)'), 'Verified CoinGecko price lines must update in the open chart');
assert(source.includes("!['coingecko','binance','lbank'].includes(venue)"), 'Fallback chart price lines must use verified crypto market feeds');
assert(source.includes('out.length>=2?out:base'), 'Two genuine observations are required for a fallback line chart');
assert(source.includes('spotMarker?.separate'), 'Separate verified prices must be disclosed beside historical OHLC');
assert(source.includes('fresh,separate:!!(fresh&&separateSpot)'), 'Fresh spot data must remain distinguishable from historical candles');

assert(source.includes("chartSeries.sampled===true&&history.includes('coingecko')"), 'CoinGecko snapshots must never be silently inserted into real OHLC');
assert(source.includes('async function pollFocusedCryptoQuote()'), 'Selected catalog crypto must receive focused updates');
assert(source.includes('const focusedChartStream={socket:null'), 'Detail-only exchange stream must be available for approved crypto pairs');
assert(source.includes("CHART_APPROVED_BINANCE_SPOT[id]"), 'Detail WebSocket must only use verified instrument mappings');
assert(source.includes("new WebSocket('wss://data-stream.binance.vision/ws/'"), 'Approved crypto detail charts need a direct tick stream');
assert(source.includes('closeFocusedCryptoStream();'), 'Closing the detail chart must release the focused WebSocket');
assert(source.includes('period.ms<=86400000'), 'Recent 1D crypto graphs must prioritize genuine exchange OHLC');

assert(source.includes('setInterval(()=>{if(state.dialogId)pollFocusedCryptoQuote()},60000)'), 'Focused crypto updates should continue while a chart is open');
assert(source.includes('if(state.dialogId)pollFocusedCryptoQuote()'), 'Focused updates should resume after reconnect');
assert(html.includes('script.js?v=20261123-orderbook-expanded-v34'), 'Browser script version must change for every operating system');

assert(source.includes("'HTX Spot','BitMart Spot','Bitrue Spot','Crypto.com Spot','Gemini Spot','BingX Spot','CoinEx Spot','Poloniex Spot','Bitstamp Spot,'WEEX Spot','Bitunix Spot','XT Spot'].includes(venue)"),
 'Gemini book must be selectable only as an independently verified live Spot source');
assert(source.includes("format:'gemini'")&&source.includes('api.gemini.com/v1/book/'),
 'Gemini depth must use the official orderbook endpoint');
assert(source.includes('payload.bids.map(row=>[row.price,row.amount])'),
 'Gemini price and amount objects must normalize to genuine numeric levels');
assert(source.includes("format:'cryptocom'")&&source.includes("api.crypto.com/exchange/v1/public/get-book"),
 'Crypto.com orderbook must use actual bids and asks from its public exchange endpoint');
assert(source.includes("!Array.isArray(data[0]?.bids)")&&source.includes("!Array.isArray(data[0]?.asks)"),
 'Crypto.com depth responses need both genuine sides of the book');

assert(source.includes("format:'bitrue'")&&source.includes("openapi.bitrue.com/api/v1/depth"),
 'Bitrue must use public Spot depth, not synthetic order levels');
assert(source.includes("Number.isInteger(payload.lastUpdateId)"),
 'Bitrue snapshots require an exchange sequence identifier');
assert(source.includes("format:'htx'")&&source.includes("format:'bitmart'"), 'New sources must use exchange-specific order-book adapters');
assert(source.includes("freshExchangeMs(payload.tick.ts)")&&source.includes("freshExchangeMs(payload.data.ts)"),
 'HTX and BitMart data must reject stale snapshots');
assert(source.includes("'HTX Spot','BitMart Spot','Bitrue Spot','Crypto.com Spot','Gemini Spot','BingX Spot','CoinEx Spot','Poloniex Spot','Bitstamp Spot,'WEEX Spot','Bitunix Spot','XT Spot'].includes(b.venue)"),
 'Snapshots from every verified new Spot source must be visible in all browsers');
assert(source.includes("format:'bingx'")&&source.includes("format:'coinex'")&&
 source.includes("api.coinex.com/v2/spot/depth")&&source.includes("open-api.bingx.com/openApi/spot/v1/market/depth"),
 'CoinEx and BingX public Spot depth must be decoded from actual exchange levels');
assert(source.includes("data.is_full!==true")&&source.includes("!freshExchangeMs(depth.updated_at)"),
 'CoinEx must never interpret incremental or stale depth as a full book');
assert(source.includes("!freshExchangeMs(payload.data.ts)"),
 'BingX must reject obsolete or future Spot depth');
assert(source.includes("format:'poloniex'")&&source.includes("format:'bitstamp'")&&
 source.includes("api.poloniex.com/markets/")&&source.includes("www.bitstamp.net/api/v2/order_book/"),
 'Poloniex and Bitstamp public Spot books must use actual exchange depth');
assert(source.includes("payload.bids.length%2")&&source.includes("!freshExchangeMs(stamped)"),
 'Invalid Poloniex flattened levels and stale Bitstamp books must be rejected');
assert(source.includes("format:'weex'")&&source.includes("format:'bitunix'")&&
 source.includes("format:'xt'")&&source.includes("api-spot.weex.com/api/v3/market/depth")&&
 source.includes("openapi.bitunix.com/api/spot/v1/market/depth")&&
 source.includes("sapi.xt.com/v4/public/depth"),
 'New venues must use REAL public Spot orderbook APIs, not futures endpoints');
assert(source.includes("book.bids.map(row=>[row.price,row.volume])")&&
 source.includes("!freshExchangeMs(book.timestamp)")&&
 source.includes("!freshExchangeMs(book.ts)"),
 'Bitunix and XT Spot adapters must normalize real levels and reject stale snapshots');
assert(source.includes("orderBookVenueDescriptor({venue,pair,precision:candidate?.precision})"),
 'Bitunix must use exchange-provided price precision for browser Spot polling');
assert(source.includes('function orderBookSpreadText(bid,ask){'),
 'Spread on all tradeable crypto must be derived from observed BID and ASK');
const spreadSource=source.slice(source.indexOf('function orderBookSpreadText(bid,ask){'),
 source.indexOf('function orderBookAssetList(){'));
const computeSpread=new Function(spreadSource+';return orderBookSpreadText;')();
assert.equal(computeSpread(99,101),'2,00%');
assert.equal(computeSpread(101,99),null);
assert.equal(computeSpread(0,101),null);
assert(source.includes("loadAllCryptoBooks(orderBookState.serial,orderBookState.id).catch(()=>{})"),
 'Live streaming must not block background refresh of all 288 crypto cards');
assert(source.includes('function cryptoEtfTrendLine(points,prices)'),
 'ETF must draw only a genuine line chart rather than filled vertical ribbons');
const etfLineSource=source.slice(
 source.indexOf('function cryptoEtfTrendLine(points,prices)'),
 source.indexOf('function cryptoEtfChart(product){'));
const paintTrend=new Function(etfLineSource+';return cryptoEtfTrendLine;')();
const sampleTrend=paintTrend([[25,92],[145,49],[265,104],[385,33],[495,112]],
 [100,110,95,116,90]);
assert(sampleTrend.lines.includes('etf-trend-up')&&sampleTrend.lines.includes('etf-trend-down'),
 'Upward observed-price line segments must be green and downward ones red');
assert.equal((sampleTrend.lines.match(/<path /g)||[]).length,4,
 'Each real price run must be a stroke path without artificial line gaps');
assert.equal(sampleTrend.lastTrend,'down');
assert(!sampleTrend.lines.includes('<rect')&&
 !sampleTrend.lines.includes('linearGradient')&&
 !sampleTrend.lines.includes('etf-trend-area')&&
 !sampleTrend.lines.includes('fill="url('),
 'The ETF price chart must not render vertical stripes or area gradients');
assert(source.includes('trendLine.lines+')&&
 !source.includes('gradient.areas+gradient.lines'),
 'ETF SVG must render only price lines above the unchanged volume chart');
assert(css.includes('.crypto-etf-chart .etf-trend-path.etf-trend-up')&&
 css.includes('.crypto-etf-chart .etf-trend-path.etf-trend-down')&&
 css.includes('fill:none!important'),
 'ETF line-only styling must be cross-platform and fill-free');
assert(source.includes('cryptoEtfVolumeChart(product,period,samples)'),
 'Separate verified ETF traded volume histogram must remain intact');

assert(source.includes('function cryptoEtfSyncedSamples(product,period,rows)'),
 'ETF curves must synchronize with newer verified share-price feed snapshots');
assert(source.includes('if(etfQuotesChanged&&state.page===\'etf\')paintCryptoEtfCharts()'),
 'A verified new ETF quote must redraw its price graph immediately');
assert(source.includes('return [...samples,[Math.floor(ms/1000),price,null]]'),
 'New ETF quote should not fabricate traded volume');
assert(source.includes("if(period==='1D')"), '1D ETF graph must not mix adjacent trading sessions');
assert(source.includes('String(latest.symbol).toUpperCase()!==String(fund.symbol'),
 'ETF graph must never mix prices from different exchanges');
assert(html.includes('script.js?v=20261123-orderbook-expanded-v34'),
 'Updated ETF graph synchronizer must bypass cached browser scripts');

assert(source.includes("setInterval(()=>{if(state.page==='etf'&&!document.hidden)loadCryptoEtfHistory()},60000)"),
 'ETF volume and price history must refresh automatically when the ETF view is open');
assert(source.includes('Date.now()-etfHistory.lastFetch<60000'),
 'ETF graph refresh must be throttled to once per minute');
assert(source.includes('crypto-etf-refresh-state')&&source.includes('Mercato chiuso · ultimo scambio'),
 'ETF quote status must distinguish weekend closure from live market quotes');
assert(source.includes('crypto-etf-chart-refresh'),'ETF charts must expose latest exchange trade time');
assert(css.includes('.crypto-etf-market-note .crypto-etf-refresh-state'), 'ETF auto status must render on desktop and mobile');
assert(html.includes('style.css?v=20261123-orderbook-expanded-v34'), 'ETF status style must bypass device caches');
assert(html.includes('script.js?v=20261123-orderbook-expanded-v34'),'ETF refresh code must bypass mobile/desktop browser caches');
assert(source.includes('function cryptoEtfVolumeChart(product,period,samples)'), 'ETF chart must expose share-volume bars');
assert(source.includes('<rect class="etf-volume-rect"'), 'ETF volume bars must use flat 2D rectangles');
assert(source.includes("return '<g class=\"etf-volume-bar\">'"), 'ETF bar groups must have one neutral class');
assert(!source.includes("class=\"etf-volume-bar '+b.direction"), 'ETF volumes must never be colored by price trend');
assert(css.includes('fill:#ffffff!important;')&&css.includes('fill-opacity:1!important;'),
 'ETF bars must be opaque, solid white in all themes');
assert(!source.includes('etf-volume-side')&&!source.includes('etf-volume-top'), 'ETF chart must never render 3D faces');
assert(css.includes('.etf-volume-bar .etf-volume-rect'), 'Flat ETF bar style must be defined');
assert(!css.includes('.etf-volume-bar .etf-volume-side'), 'Obsolete 3D ETF side styles must be removed');
assert(html.includes('script.js?v=20261123-orderbook-expanded-v34')&&html.includes('style.css?v=20261123-orderbook-expanded-v34'),
 'All platforms must receive the new flat ETF volumes chart assets');
assert(source.includes("p.length>=2"), 'ETF chart must keep backward compatibility with price-only data');
assert(source.includes("p.length>=3"), 'ETF volumes require verified volume rows, not synthetic values');
assert(source.includes('Nessun volume simulato'), 'ETF chart must explicitly report unavailable volume');
assert(source.includes('cryptoEtfVolumeChart(product,period,samples)'), 'ETF volume bars must render with the selected period');
assert(css.includes('.crypto-etf-chart svg.etf-volume-svg'), 'ETF volume chart must resize on mobile');
assert(css.includes('fill:#ffffff!important;')&&!css.includes('.etf-volume-bar.down{'),
 'ETF volume bars must stay solid white with no green/red trend styling');
assert(html.includes('style.css?v=20261123-orderbook-expanded-v34')&&
 html.includes('script.js?v=20261123-orderbook-expanded-v34'),
 'ETF volume resources must be refreshed across operating systems');

assert(source.includes('async function pollCatalogPrices()'), 'Crypto catalog needs direct periodic quotes');
assert(source.includes('include_last_updated_at=true'), 'Provider timestamps are mandatory');
assert(source.includes('stamp<now-15*60000'), 'Stale catalog quotes must never look live');
assert(source.includes('previousTime>=stamp'), 'Catalog poll must not overwrite newer market prices');
assert(source.includes('setInterval(pollCatalogPrices,120000)'), 'Catalog must refresh without manual reload');
assert(html.includes('script.js?v=20261123-orderbook-expanded-v34'),
 'All platforms must load the latest catalog polling script');

assert(source.includes('map-pin')&&source.includes('data-trend='), 'Map pins must carry the regional trend');
assert(source.includes('el.dataset.trend=trend(avg)'), 'Map pins must update with incoming region data');
assert(css.includes('#worldMap .map-stage button.map-pin[data-trend="up"]'), 'Positive map pins must be green');
assert(css.includes('#worldMap .map-stage button.map-pin[data-trend="down"]'), 'Negative map pins must be red');
assert(html.includes('style.css?v=20261123-orderbook-expanded-v34'), 'New map pin colors must bypass cached desktop/mobile CSS');

assert(!source.includes('function cryptoRowAlertMarkup('),
 'Removed crypto arrow badge renderer must never return');
assert(!source.includes("alert.textContent=active||'↑ ↓'"),
 'Live price updates must not reinsert arrow symbols');
assert(source.includes("asset?.group==='crypto'&&(!direction||direction==='neutral')"),
 'All cryptocurrencies without comparable live ticks must derive price colors from verified 24h changes');
assert(source.includes("return 'quote-price-'+(change24h>0?'up':'down')"),
 'Upward crypto price moves show green and downward moves show red');
assert(source.includes("return 'quote-price-'+(direction||'neutral')"),
 'Fresh comparable quote ticks still determine direction where available');
assert(source.includes("const cryptoAlertRow=crypto&&a?.group==='crypto'"),
 'Every Global cryptocurrency must be eligible for price-only threshold flashing');
assert(source.includes("price.classList.toggle('crypto-threshold-flash',ASSET_BY_ID[id]?.group==='crypto'&&!!boundary)"),
 'All crypto prices must flash on verified alerts, with no dependence on listing order');
assert(!source.includes("const lunaStart=group.ids.indexOf('luna')"),
 'Price flashing must no longer be limited to LUNA and subsequent rows');
assert(css.includes('.asset-price.crypto-threshold-flash'),
 'The targeted price blinking style must be available');
assert(html.includes('20261123-orderbook-expanded-v34'),
 'All browsers should load the versioned price blinking assets');
assert(css.includes('cryptoThresholdPriceBlink'),
 'Triggered UPPER/LOW prices must blink on desktop and mobile');
assert(css.includes('.crypto-row-alert{display:none!important}'),
 'Even stale cached rows must hide the arrow badges');
assert(html.includes('20261123-orderbook-expanded-v34'),
 'Updated JavaScript and styles must use fresh cache-busting URLs');
assert(!source.includes("(alertRow?cryptoRowAlertMarkup(id):'')"),
 'Global crypto rows must not show the old up/down monitoring indicator');
assert(!source.includes("crypto-alert-enabled':'"),
 'Global crypto rows must retain their standard layout');
assert(source.includes('cryptoBoundaryFor(id)'),
 'Global UPPER LOW boundary checks must remain functional');
assert(css.includes('crypto-price-upper')&&css.includes('crypto-price-lower'),
 'Price crossing highlights must remain available without the row symbol');

assert(source.includes('CoinGecko · ultima rilevazione verificata (non live)'),
 'Global must disclose delayed catalog quote age rather than erasing price');
assert(source.includes("const delayed=age>2*3600000"),
 'Global must preserve delayed verified quote timestamp and percentage');
assert(!source.includes("age>2*3600000||\n       !Number.isFinite(price)"),
 'Global must not discard all 288 crypto values after two hours');

assert(source.includes('function detailVerifiedPrice(id)'),
 'Crypto detail must resolve a real historical close when market quote is missing');
assert(source.includes('Ultima chiusura storica verificata'),
 'Historical price must be labeled explicitly non-live');
assert(source.includes('syncDetailVerifiedPrice();'),
 'Crypto dialog must update its header after historical candle loading');
assert(source.includes('time*1000>Date.now()+300000'),
 'Historical fallback must reject future candle timestamps');

new Function(source);
new Function(read('price-board.js'));
new Function(read('crypto-extended.js'));
new Function(read('vertex-heatmap.js'));
assert(source.includes('getAlertBoundary:cryptoBoundaryFor'),
 'Global alert engine must expose actual UPPER LOW crossing to the heatmap');
assert(source.includes('window.VertexHeatmap?.paintAlertSignals?.(affected)'),
 'Alert engine must repaint heatmap prices on threshold crossing');
assert(read('vertex-heatmap.js').includes("price.classList.toggle('crypto-price-upper'"),
 'Heatmap must blink its price for UPPER thresholds');
assert(read('vertex-heatmap.js').includes("price.classList.toggle('crypto-price-lower'"),
 'Heatmap must blink its price for LOW thresholds');
assert(read('vertex-heatmap.css').includes('prefers-reduced-motion:reduce'),
 'Threshold flash must respect reduced motion');

const heatmapSource=read('vertex-heatmap.js');
assert(heatmapSource.includes('function observed24hChange(rows)'),
 'Use real 24h timestamped price evidence for missing heatmap percentages');
assert(heatmapSource.includes('Math.abs(before[0]-target)>7200'),
 'Require a real price observation near 24h prior');
assert(heatmapSource.includes('priceObservations:Array.isArray(raw.priceObservations)'),
 'Snapshot must carry authentic source price observations');
assert(heatmapSource.includes('Math.abs(derived)>0.000001'),
 'Do not recolor fixed-price assets using fabricated movement');

assert(heatmapSource.includes('const hasSourcePrice=finite(record.price)&&record.price>0'),
 'Must preserve verified last-known prices when scheduled market snapshot is delayed');
assert(heatmapSource.includes("stale:!Number.isFinite(activeAt)"),
 'Must visibly mark data older than two hours, not call it live');
assert(heatmapSource.includes("ULTIMO DATO DISPONIBILE, NON LIVE"),
 'Footer must disclose stale observations');
assert(read('vertex-heatmap.css').includes('.vh-tile.vh-stale::after'),
 'Delayed crypto prices must show a mobile and desktop stale indicator');

assert(heatmapSource.includes('async function refreshMissingQuotes()'),
 'Full-catalog heatmap must fetch exact-ID quotes missing from top 250');
assert(heatmapSource.includes('exactQuoteRetryAfter=Date.now()+5*60000'),
 'Cross-platform fetch must back off after provider rate limits');
assert(heatmapSource.includes('Math.min(30,candidates.length)'),
 'Keep top-250 fallback requests bounded for mobile networks');
assert(heatmapSource.includes('refreshMissingQuotes();'),
 'Missing quote recovery must resume after navigation or reconnect');

assert(heatmapSource.includes("window.addEventListener('pageshow',resumeHeatmapFeeds)"),
 'Heatmap must refresh when iOS Safari PWA is reopened');
assert(heatmapSource.includes("window.addEventListener('online',resumeHeatmapFeeds)"),
 'Heatmap must recover feeds after Android or desktop network reconnect');
assert(heatmapSource.includes("document.addEventListener('visibilitychange'"),
 'Heatmap must resume when desktop or mobile browser becomes visible');
assert(heatmapSource.includes("requestAnimationFrame(()=>{searchPaintFrame=null;paint()})"),
 'Heatmap search must coalesce expensive mobile repaint events');

assert(heatmapSource.includes('const incomingChange=finite(item.change)'),
 'Heatmap must reconcile fresh 24h change for already loaded crypto tiles');
assert(heatmapSource.includes('change:finite(c.change)?c.change:'),
 'Heatmap direct feed must retain a verified percentage when provider omits it');
assert(heatmapSource.includes("c.change>0?'up':c.change<0?'down':'neutral'"),
 'Heatmap green/red/neutral must follow actual 24h percentage');

const screenshotCatalog=JSON.parse(read('crypto-extended.js').match(/window\.__VERTEX_EXTRA_CRYPTO__\s*=\s*(\[[\s\S]*?\]);/)[1]);
assert.equal(screenshotCatalog.length,280,'Expected 280 extended catalog cryptocurrencies');
assert.equal(new Set(screenshotCatalog.map(c=>c[0])).size,280,'Duplicate extended crypto ticker');
const canonicalCryptoId=symbol=>/^[A-Z0-9_-]+$/.test(symbol)?
 symbol.toLowerCase():'crypto-'+Array.from(symbol).map(c=>c.codePointAt(0).toString(16)).join('-');
const historyPaths=fs.readdirSync('chart-history/crypto').filter(name=>name.endsWith('.json'))
 .map(name=>name.slice(0,-5));
const priceLinePaths=fs.readdirSync('chart-history/crypto/prices').filter(name=>name.endsWith('.json'))
 .map(name=>name.slice(0,-5));
const historicalIds=new Set([...historyPaths,...priceLinePaths,'ore']);
const requestedIds=new Set([
 ...JSON.parse(read('market-quotes.json')).crypto.slice(0,42).map(row=>row.id),
 ...screenshotCatalog.map(row=>canonicalCryptoId(row[0]))
]);
assert.equal(requestedIds.size,288,'Catalog must have exactly 288 unique crypto');
assert(source.includes("const ORDER_BOOK_COINS=ASSETS.filter(a=>a.group==='crypto');"),
 'Order Book must contain all 288 catalog assets, not just the original 42');
const marketCode=source.slice(source.indexOf('function orderBookVerifiedBinanceMarket('),
 source.indexOf('async function orderBookDiscoveryFetch('));
const marketCheck=new Function(marketCode+';return orderBookVerifiedBinanceMarket;')();
const bookAsset={coingeckoId:'uniswap',symbol:'UNI-USD'};
const verifiedTicks={tickers:[{market:{identifier:'binance'},base:'UNI',
 target:'USDT',is_stale:false,is_anomaly:false,trust_score:'green',last:1.5}]};
const verifiedExchange={symbols:[{symbol:'UNIUSDT',baseAsset:'UNI',
 quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true}]};
assert.equal(marketCheck(bookAsset,verifiedTicks,verifiedExchange).pair,'UNI/USDT',
 'Spot market verified against exact token identity');
assert.equal(marketCheck(bookAsset,{tickers:[{...verifiedTicks.tickers[0],base:'OTHERTOKEN'}]},verifiedExchange),null,
 'A token with the wrong symbol must not receive another coin book');
assert.equal(marketCheck(bookAsset,verifiedTicks,{symbols:[{...verifiedExchange.symbols[0],status:'BREAK'}]}),null,
 'Inactive markets must never be presented as trading');
assert(source.includes("'Bybit Spot','OKX Spot','KuCoin Spot'"),
 'The order book must recognize Bybit, OKX and KuCoin as distinct Spot feeds');
const normalizedCode=source.slice(source.indexOf('function decodeOrderBookDepth('),
 source.indexOf('function normalizeLiveLevels('));
const parseNativeDepth=new Function(normalizedCode+';return decodeOrderBookDepth;')();
assert.deepEqual(parseNativeDepth({retCode:0,result:{b:[["1","2"]],
 a:[["3","4"]]}},'bybit').bids,[["1","2"]],
 'Bybit depth must be parsed directly from real Spot API response');
assert.deepEqual(parseNativeDepth({code:"0",data:[{bids:[["1","2","0","1"]],
 asks:[["3","4","0","1"]]}]},'okx').asks,[["3","4","0","1"]],
 'OKX price and quantity must use the first two original values');
assert.deepEqual(parseNativeDepth({code:"200000",data:{bids:[["1","2"]],
 asks:[["3","4"]]}},'kucoin').asks,[["3","4"]],
 'KuCoin Spot depth must preserve authentic exchange levels');
assert.throws(()=>parseNativeDepth({code:"400",data:[]},'okx'),
 'Rejected API responses must never produce BID/ASK levels');
assert(source.includes('if(config.priceUrl&&Date.now()'),
 'Venues without a last-trade endpoint must not fetch a fabricated price');

assert(source.includes('function decodeOrderBookDepth('),
 'All venue-native depth payloads must be validated');
const dCode=source.slice(source.indexOf('function orderBookVenueDescriptor('),
 source.indexOf('const orderBookState={'));
const descriptor=new Function(dCode+';return orderBookVenueDescriptor;')();
assert(descriptor({venue:'Coinbase Exchange Spot',pair:'BTC/USD'}).urls[0]
 .includes('/products/BTC-USD/book?level=2'),
 'Coinbase Exchange must use authentic BTC/USD full depth');
assert(descriptor({venue:'OKX Spot',pair:'USDT/USDC'}).urls[0]
 .includes('instId=USDT-USDC'),
 'OKX alternate quote must not silently request USDT/USDT');
assert(descriptor({venue:'Gate Spot',pair:'BTC/USDC'}).urls[0]
 .includes('currency_pair=BTC_USDC'),
 'Gate must request the correct real USDC pair');
assert(descriptor({venue:'BTSE Spot',pair:'BTSE/USDT'}).urls[0]
 .includes('/public-api/market/v1/orderbook?symbol=BTSE-USDT&depth=50'),
 'BTSE must use the genuine level-two public Spot book, not futures');
assert.equal(descriptor({venue:'BTSE Spot',pair:'BTSE/PERP'}),null,
 'BTSE perpetuals must never be shown as a Spot book');
assert(descriptor({venue:'Coinbase Exchange Spot',pair:'BTC/EUR'}).urls[0]
 .includes('/products/BTC-EUR/book?level=2'),
 'Supported EUR markets must request the exact EUR orderbook');
assert(descriptor({venue:'Binance Spot',pair:'LTC/BTC'}).urls[0].includes('symbol=LTCBTC'),
 'BTC-quoted Spot books must retain the exact exchange instrument');
const discoveryCheckCode=source.slice(source.indexOf('function orderBookDiscoveryMarketUrl('),
 source.indexOf('async function discoverOrderBookSource('));
const verifyDiscovery=new Function(discoveryCheckCode+';return orderBookDiscoveryTradable;')();
assert(verifyDiscovery('Gate Spot',{id:'LTC_BTC',base:'LTC',quote:'BTC',
 trade_status:'tradable'},'LTC','BTC'),
 'On-demand discovery must verify an active Spot pair');
assert(!verifyDiscovery('Gate Spot',{id:'LTC_BTC',base:'OTHER',quote:'BTC',
 trade_status:'tradable'},'LTC','BTC'),
 'Wrong-base markets cannot masquerade as another token');
assert(!verifyDiscovery('OKX Spot',{code:'0',data:[{instId:'LTC-BTC',
 instType:'SWAP',baseCcy:'LTC',quoteCcy:'BTC',state:'live'}]},'LTC','BTC'),
 'Derivative books must be rejected');
assert.equal(descriptor({venue:'Coinbase Exchange Spot',pair:'BTC/XYZ'}),null,
 'Unsupported currencies must never be substituted silently');
const sideCode=source.slice(source.indexOf('function orderBookSide('),
 source.indexOf('function orderBookPressureStats('));
const renderBookSide=new Function('esc','orderBookNumber',sideCode+';return orderBookSide;')(
 x=>String(x),n=>String(n));
const quoteMarkup=renderBookSide([[5,3],[4,2]],'bid','BTC','USD');
assert(quoteMarkup.includes('Prezzo <small>USD</small>')&&
 !quoteMarkup.includes('Prezzo <small>USDT</small>'),
 'The BID/ASK table must label the exact exchange quote currency');
assert(source.includes("if(verified)return verified;"),
 'The displayed source must match the archived verified USD/USDC book');
assert(source.includes('function orderBookVerifiedVenues(id){')&&
 source.includes('function orderBookVenueOptions(id){')&&
 source.includes('function cryptoBookEntry(id,venue){')&&
 source.includes('orderBookState.venueChoice=chosen;'),
 'Source menu must choose identity-verified exchange-specific Spot depth');
assert(source.includes('function cryptoBookEntry(id,venue){')&&
 source.includes('orderBookVenueDescriptor(extra)')&&
 source.includes('if(verified)return verified;'),
 'BID and ASK must use the independently verified primary market from one exchange');
assert(css.includes('#orderBookVenueToolbar{display:flex!important;')&&
 !css.includes('.ob-source-toolbar,#orderBookVenueToolbar{display:none!important}'),
 'Verified source selector must remain visible on mobile and desktop');
assert(source.includes('await discoverOrderBookSource(coin,serial)'),
 'On-demand verification must occur before real book fetching');

// A newly listed coin may not have a verified archive on the first deploy.
// Never populate its chart with invented prices to satisfy a count assertion.
const missingCryptoHistory=[...requestedIds].filter(id=>!historicalIds.has(id));
console.log('Verified historical coverage:',requestedIds.size-missingCryptoHistory.length,
 'of',requestedIds.size,'; awaiting source:',missingCryptoHistory.length);
for(const id of requestedIds){
 if(id==='ore'||!historicalIds.has(id))continue;
 if(historyPaths.includes(id))continue;
 const archive=JSON.parse(read('chart-history/crypto/prices/'+id+'.json'));
 assert(archive.kind==='observed-price-line'&&archive.points?.length>=14,
  'Cannot form meaningful weekly sampled candles for '+id);
}
assert(source.includes("kind:'sampled-price-candles',sampled:true"),
 'The full crypto chart must render visibly labelled sampled candles when exchange OHLC is unavailable');
assert(source.includes("Candele da prezzi osservati (non OHLC intraday)"),
 'Sampled candle display must never claim true intraday OHLC');

assert(screenshotCatalog.every(c=>c.length>=3&&/^[a-z0-9-]{1,100}$/.test(c[2])),
 'Every screenshot token needs its exact CoinGecko identifier');
assert(source.includes('async function chartCoinGeckoCandles('),'Missing verified historical OHLC fallback');
assert(source.includes('async function chartExtendedCryptoHistory('),'Missing full-catalog history loader');
assert(source.includes('function observeMarketCryptoHistoryPreviews('),
 'Markets must lazily observe crypto historical charts');
assert(source.includes("ASSET_BY_ID[card.dataset.asset]?.group==='crypto'"),
 'All crypto assets need Markets historical previews');
assert(source.includes('function loadMarketCryptoHistoryPreview('),
 'Markets must load verified crypto history archives for the new coins');
// Sampled weekly candles use actual observed daily prices. Their extrema
// are extrema of the *samples*, never fictional exchange intraday highs/lows.
for(const method of ['chartReadHistoricalPricePoints(','chartLoadObservedPriceArchive(',
  'chartSampledCandlesFromPrices(']){
 assert(source.includes(method),'Missing observed-price chart capability: '+method);
}
assert(source.includes('candles:sampled,sampled:true'),
 'MAX preview must retain all sampled history without truncation');
assert(source.includes("sampled?'Candele campionate'")||
 source.includes("historical.sampled?'Candele campionate'"),
 'Markets sampled candles must be clearly distinguished from real OHLC');
assert(source.includes("let marketForceBullishPeriod='1D'"),
 'Forza mercato must start on a supported timeframe');
assert(source.includes("MARKET_FORCE_BULLISH_PERIODS=['1H','4H','1D','1W']"),
 'Forza mercato must offer exactly 1H, 4H, 1D, 1W');
assert(source.includes("sampled?'Candele campionate'"),
 'Forza mercato must label real vs sampled candles distinctly');
assert(source.includes('function forceMarketSampledCandles('),
 'Forza mercato needs truthful sampled candles when exchange OHLC is absent');
assert(source.includes('function forceMarketFetchTrueOHLC('),
 'Forza mercato needs verified CoinGecko OHLC on-demand');
assert(source.includes('function forceMarketFetchPublishedOHLC('),
 'Forza mercato needs first-party verified OHLC archives');
assert(!source.includes('function marketForceBullishPricePlot('),
 'Forza mercato must no longer draw price lines');
const forceSampledCode=source.slice(
 source.indexOf('function forceMarketSampledCandles('),
 source.indexOf('async function forceMarketFetchTrueOHLC('));
const forceSampled=new Function(forceSampledCode+';return forceMarketSampledCandles;')();
// 13 real-price observations at 5-minute intervals yield 12 compact
// close-to-close sampled candles. Missing time intervals are not invented.
const forceExamples=Array.from({length:13},(_,i)=>({
 t:1794729600+i*300+6,v:20+Math.sin(i*.7)+i*.04
}));
const sampledForce=forceSampled(forceExamples,'1H');
assert.equal(sampledForce.length,12,
 '1H must retain every observed 5-minute price movement, not 15-minute buckets');
assert.equal(sampledForce[0].o,forceExamples[0].v);
assert.equal(sampledForce[0].c,forceExamples[1].v);
assert(sampledForce.every(row=>row.h===Math.max(row.o,row.c)&&
 row.l===Math.min(row.o,row.c)),
 'Sampled Force candles may not invent highs, lows or wicks');
const forceGap=forceSampled([
 {t:1794729606,v:20},{t:1794729906,v:21},
 {t:1794730806,v:22},{t:1794731106,v:23}
],'1H');
assert.equal(forceGap.length,2,
 'A missing 5-minute interval must remain a real gap instead of a fake candle');
assert(source.includes("period==='1H'?34:period==='4H'?24:14"),
 '1H and 4H bodies must not be limited to old 10px widths');
assert(source.includes('const betterSampled='),
 'Denser real observed prices must take priority over sparse OHLC on 1H and 4H');
assert(source.includes("period==='4H'?16:2"),
 '4H must fetch denser observed history when exchange OHLC is sparse');
assert(source.includes("period==='4H'&&actual.length<16&&sampledCount>=16"),
 '4H must prefer sufficient observed 10-minute candles over sparse hourly candles');
// Four hours of observed 10-minute price points should be dense but truthful.
const fourHourExamples=Array.from({length:25},(_,i)=>({
 t:1794729600+i*600+7,v:50+Math.sin(i/3)+i*.08
}));
const fourHourBars=forceSampled(fourHourExamples,'4H');
assert.equal(fourHourBars.length,24,
 '4H must produce 24 close-to-close candles from 25 genuine 10-minute observations');
assert.equal(fourHourBars[0].o,fourHourExamples[0].v);
assert.equal(fourHourBars.at(-1).c,fourHourExamples.at(-1).v);
assert(fourHourBars.every(b=>b.h===Math.max(b.o,b.c)&&
 b.l===Math.min(b.o,b.c)),
 '4H sampled candles must not invent intraperiod high or low values');
const fourHourGap=forceSampled([
 {t:1794729607,v:20},{t:1794730207,v:21},
 {t:1794732007,v:22},{t:1794732607,v:23}
],'4H');
assert.equal(fourHourGap.length,2,'Missing intervals on 4H must not become fake candles');
const observedCro=JSON.parse(read('chart-history/crypto/intraday/cro.json'));
const croBars=forceSampled(observedCro.periods['4H'].map(
 ([t,v])=>({t,v})),'4H');
assert(croBars.length>=16,
 'Real Cronos 4H archived observations should provide dense sampled candles');
// Markets and Market Force now share same-origin market history with no
// invented OHLC; test five-minute and hourly observations at real timestamps.
/* Every Markets crypto chart exposes the same nineteen historical choices.
   The label must accurately describe the available source granularity. */
const timeframeSegment=source.slice(source.indexOf('const CHART_PERIODS=['),
 source.indexOf('const CHART_PERIOD_BY_ID='));
const chartPeriods=new Function(timeframeSegment+';return CHART_PERIODS;')();
assert.deepEqual(chartPeriods.map(p=>p.id),[
 '1s','5s','15s','30s','1h','2h','3h','4h','5h','12h',
 '1D','2D','3D','1W','2W','1M','2M','3M','MAX'
],'Markets must retain all 19 requested crypto history timeframes');
assert.equal(chartPeriods.find(p=>p.id==='1h').label,'1H');
assert.equal(chartPeriods.find(p=>p.id==='MAX').label,'Tutto');
const approvedMatch=source.match(/const CHART_APPROVED_BINANCE_SPOT=Object\.freeze\((\{[^\n]+\})\);/);
assert(approvedMatch,'Binance pairs must be manually validated, not inferred by ticker');
const approvedPairs=JSON.parse(approvedMatch[1]);
const backendList=read('.github/scripts/market-force-ohlc.py')
 .match(/BINANCE_SPOT\s*=\s*\{([\s\S]*?)\n\}/);
assert(backendList,'Missing backend manually verified market pairing list');
const backendPairs=Object.fromEntries([...backendList[1].matchAll(
 /"([^"]+)":\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));
assert.deepEqual(approvedPairs,backendPairs,
 'Markets must share the exact verified Binance identity allowlist');
assert.equal(approvedPairs.btc,'BTCUSDT');
assert(source.includes('async function chartBinanceSecondOHLC('),
 'Markets 1s-30s must request real 1-second OHLC from an exchange');
assert(source.includes('&interval=1s&startTime='),
 'Binance second candles must be paged by time, not truncated to last 1000 ticks');
assert(source.includes('requests.length>=5'),
 'Limit number of public OHLC requests in each seconds load');
assert(source.includes('resolutionFallback=\'1H\''),
 'Without real seconds, provide a clearly labeled fallback, not fake ticks');
assert(source.includes('const preferExchange='),
 'Verified pairs should prefer detailed exchange OHLC when more dense');
assert(source.includes('period.ms>=1209600000'),
 '2W should prefer full verified hourly exchange history');
assert(source.includes("choice==='2W'?"),
 '2W must use the 14-day archive rather than only 7 days');
const collector=read('.github/scripts/market-force-intraday.py');
assert(collector.includes('"2W": 14 * 86400'),
 'Automated collection must include 14-day real observed price history');
assert(collector.includes('request_group(batch, "1h", 355, now)'),
 'The 2W archive needs more than 336 hours of hourly observations');
assert(source.includes('forceMarketObservedDirect(asset,remotePeriod,now)'),
 'Niche crypto without archives need verified live price history fallback');
assert(source.includes('forceMarketObservedCoinGecko(asset,remotePeriod,now)'),
 'The second fallback must match the exact token identity, never a random ticker');
assert(source.includes('const snapshot=await chartCryptoIntradayResolution('),
 'Months without full OHLC should show a clearly partial historical view');
assert(source.includes('async function chartCryptoIntradayResolution('),
 'Crypto detail charts must use verified OHLC/observed archives before sparse remote responses');
assert(source.includes('await chartCryptoIntradayResolution(asset,period,from,now)'),
 'All crypto, including extended tokens, must try archived short-range history');
assert(source.includes('const rows=monthly.length>=2?monthly:recent;')&&
 source.includes('candles:rows,')&&source.includes('first:rows[0].t'),
 'Markets MAX preview must use the full available OHLC archive');
assert(source.includes('function chartSampledMoves('),
 'Common sampled-price candles must be available without fake OHLC');
assert(source.includes('if(sampled.length>=8&&(bars.length<8||sampled.length>bars.length*1.6))'),
 'Markets must prefer denser price observations over a few distant bars');
assert(source.includes('chartSampledMoves(within,86400)'),
 'Monthly crypto timeframes need observed daily sampled fallback when OHLC is too sparse');
assert(source.includes('Math.min(sample.length<32?26:14,step*.80)'),
 'Markets full chart candle bodies must occupy most of their slots');
assert(source.includes('Math.min(11,step*.82)'),
 'Markets mini candles must no longer have wide gaps around 6-pixel bodies');
assert(source.includes('const slots=Math.max(18,candles.length),lead=slots-candles.length;'),
 'Sparse Markets candles must be grouped at the right instead of spanning the full card');
assert(source.includes('const xInSvg=10+(lead+index+.5)*300/slots;'),
 'Market preview hover must match its adjusted candle positions');
assert(source.includes('let sampledMax=false;'),
 'MAX crypto charts must consider truthful dense partial daily samples');

const movesFn=source.slice(source.indexOf('function chartSampledMoves('),
 source.indexOf('async function chartCryptoIntradayResolution('));
const sampledMoves=new Function(movesFn+';return chartSampledMoves;')();
for(const seconds of [300,600,1800,3600,86400]){
 const prices=Array.from({length:21},(_,i)=>({t:1794729600+i*seconds+3,
  v:80+i*.03+Math.sin(i)*.4}));
 const bars=sampledMoves(prices,seconds);
 assert.equal(bars.length,20,'Historical '+seconds+'s bars must retain every observed movement');
 assert(bars.every(c=>c.sampled===true&&c.h===Math.max(c.o,c.c)&&
  c.l===Math.min(c.o,c.c)),
  'Sampled prices must not invent high/low movements');
 const withGap=sampledMoves([prices[0],prices[1],prices[14],prices[15]],seconds);
 assert.equal(withGap.length,2,'Missing historical time on '+seconds+'s must not be invented');
}
const croArchive=JSON.parse(read('chart-history/crypto/intraday/cro.json'));
const croActual=croArchive.periods['4H'].map(([t,v])=>({t,v}));
assert(sampledMoves(croActual,600).length>=16,
 'Real Cronos 4H observations must supply a dense Market candlestick preview');
assert(source.includes("chartRange=a.group==='crypto'&&['markets','workspace'].includes(state.page)?'MAX':'1D'"),
 'Markets crypto must open its full available history');
// Verify the sampled-candle computation against actual first/high/low/last
// observations within the date bucket. Never assume unknown trade extremes.
const sampledCode=source.slice(
 source.indexOf('function chartSampledCandlesFromPrices('),
 source.indexOf('async function chartLoadObservedPriceArchive('));
assert(sampledCode.startsWith('function chartSampledCandlesFromPrices('));
const toSampledCandles=new Function(sampledCode+
 ';return chartSampledCandlesFromPrices;')();
const weeklyPrices=Array.from({length:14},(_,i)=>({
 t:Date.UTC(2026,0,5+i)/1000,p:[10,12,9,13,14,11,15,15,16,17,14,13,11,12][i]
}));
const sampledCandles=toSampledCandles(weeklyPrices,7);
assert.equal(sampledCandles.length,2,'Expected two fully observed weekly candles');
assert.deepEqual(sampledCandles.map(c=>[c.o,c.h,c.l,c.c,c.observations,c.sampled]),[
 [10,15,9,15,7,true],[15,17,11,12,7,true]
]);
const observedPrices=JSON.parse(read('chart-history/crypto/prices/aero.json'));
assert.equal(observedPrices.id,'aero');
assert.equal(observedPrices.kind,'observed-price-line');
assert(observedPrices.points.length>=2);
assert(observedPrices.points.every(row=>Array.isArray(row)&&row.length===2&&
 Number.isFinite(row[0])&&Number.isFinite(row[1])&&row[1]>0),
 'Only timestamp plus observed price, not synthetic OHLC');

assert(source.includes("chart-history/crypto/'+encodeURIComponent(id)"),
 'Markets previews must fetch the selected crypto history rather than the old 42-coin feed');
assert(source.includes("marketCryptoHistoryPreviews.get(id)"),
 'Markets preview chart must use loaded archived OHLC');
assert(source.includes('const MARKET_PREVIEW_MAX_BARS=100;'),
 'Markets MAX must compact only the SVG rendering, preserving original data');
const segment=source.slice(source.indexOf('const MARKET_PREVIEW_MAX_BARS=100;'),
 source.indexOf('function marketChartPlot(id){'));
const compactFn=new Function('marketPreviewCandleData','ASSET_BY_ID',segment+
 ';return marketPreviewVisibleCandles;')(
 ()=>Array.from({length:235},(_,i)=>({t:1000+i*60,o:100+i,
 h:103+i,l:99+i,c:102+i})),{btc:{group:'crypto'}});
const grouped=compactFn('btc');
assert(grouped.length<=100,'MAX thumbnail must not show subpixel overlapping bars');
assert.equal(grouped[0].t,1000,'MAX must include first available observation');
assert.equal(grouped.at(-1).endT,1000+234*60,'MAX must include last available observation');
assert.deepEqual([grouped[0].o,grouped[0].h,grouped[0].l,grouped[0].c],
 [100,105,99,104],'OHLC compaction must preserve actual first/high/low/last');


assert(source.includes("status:'unavailable'"),
 'Markets must show an honest unavailable state rather than synthetic candles');

assert(source.includes("'4 giorni'")&&source.includes("'4 ore'")&&source.includes("'1 giorno'"),
 'Historical candles must retain real CoinGecko/CryptoCompare source resolution');
assert(source.includes('data.coingeckoId!==asset.coingeckoId'),
 'Historical archive must verify the selected token identity');

assert(html.includes('crypto-extended.js?v='),'Extended catalog must load before the app');
assert(html.indexOf('crypto-extended.js?v=')<html.indexOf('script.js?v='),'Catalog must load first');
new Function(read('vertex-widget-sw.js'));
assert.match(html,/src="price-board\.js\?v=/);
assert.match(html,/href="price-board\.css\?v=/);
assert.match(html,/id="pageContainer"/);
// Topbar Global must put bell and AR before the TOTAL market-cap pills.
const vertexTopbar=html.slice(html.indexOf('<header class="topbar">'),html.indexOf('</header>')+9);
assert(vertexTopbar.includes('id="globalCryptoCaps"'),'Global pills must remain in the header');
assert(vertexTopbar.indexOf('id="profileButton"')<vertexTopbar.indexOf('id="globalCryptoCaps"'),
 'Bell and AR must appear above crypto pills, not below them');
assert(vertexTopbar.indexOf('id="notificationsButton"')<vertexTopbar.indexOf('id="profileButton"'),
 'Notification bell must precede AR');
assert(vertexTopbar.includes('id="headerQuickActions"'),
 'Every Vertex page must share a grouped bell/AR header control');
const quickActionsHtml=vertexTopbar.slice(vertexTopbar.indexOf('id="headerQuickActions"'),
 vertexTopbar.indexOf('</div>',vertexTopbar.indexOf('id="headerQuickActions"'))+6);
assert(quickActionsHtml.includes('id="notificationsButton"')&&quickActionsHtml.includes('id="profileButton"'),
 'Bell and AR must remain siblings within the same no-wrap header group');
assert(vertexTopbar.indexOf('class="live-clock"')<
 vertexTopbar.indexOf('id="headerQuickActions"'),
 'Clock must never separate the notification bell from the rightmost AR profile button');
assert(source.includes("actions.appendChild(quickActions)")&&
 source.includes("quickActions.appendChild(bell)")&&
 source.includes("quickActions.appendChild(profile)"),
 'Every page rerender must keep the two rightmost controls together');
assert(css.includes('.topbar .header-quick-actions')&&
 css.includes('flex-wrap:nowrap'),
 'Header bell/AR layout must be responsive and non-wrapping on all OS');

assert(!vertexTopbar.slice(vertexTopbar.indexOf('class="page-heading"'),vertexTopbar.indexOf('class="top-actions"')).includes('id="globalCryptoCaps"'),
 'Crypto caps should not be nested in the title block');
assert(css.includes('grid-template-areas:"heading" "actions" "caps"'),
 'Mobile Global controls/pills order CSS missing');
assert.match(html,/src="script\.js\?v=/);
assert.match(html,/href="style\.css\?v=/);
assert(!source.includes('biometricSessionUnlocked'),'Removed biometric gate reintroduced');

const themes=['light','dark','ocean','emerald','violet','sand','ice','sunset','graphite','ruby'];
const fonts=['inter','roboto','poppins','montserrat','lora','nunito'];
for(const theme of themes){
 assert(css.includes('body.theme-'+theme+'{'),'Missing palette '+theme);
 assert(css.includes('.theme-swatch-'+theme+'{'),'Missing swatch '+theme);
}
for(const font of fonts){
 assert(css.includes('[data-vertex-font="'+font+'"]'),'Missing font '+font);
 assert(css.includes('.font-preview-'+font+'{'),'Missing preview '+font);
}
for(const icon of ['original','minimal','aurora','pulse']){
 for(const size of [192,512])assert(fs.existsSync('icons/vertex-'+icon+'-'+size+'.png'),'Missing icon '+icon+' '+size);
 assert(fs.existsSync('manifest-vertex-'+icon+'.webmanifest'),'Missing manifest '+icon);
 const manifest=JSON.parse(read('manifest-vertex-'+icon+'.webmanifest'));
 assert.equal(manifest.name,'Vertex · Global Markets');
}
const quotes=JSON.parse(read('market-quotes.json'));
const rows=[...quotes.markets,...quotes.bigtech,...quotes.commodities,...quotes.forex,...quotes.crypto];
assert(quotes.crypto.length>=42,'The 42 original cryptocurrency quotes must remain');
assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'Duplicate asset IDs');
for(const row of rows)assert(row.id&&row.symbol&&
 (row.value===null||Number.isFinite(+row.value)&&+row.value>0),'Invalid quote '+row.id);
// Requested coins outside today's CoinGecko window have unavailable prices,
// not invented screenshot values.
for(const row of quotes.crypto.slice(0,42))
 assert(Number.isFinite(+row.value)&&+row.value>0,'Original crypto quote missing '+row.id);
const books=JSON.parse(read('crypto-orderbooks-data.js').replace(/^window\.__VERTEX_CRYPTO_BOOKS__\s*=\s*/,'').replace(/;\s*$/,''));
assert([42,288].includes(books.totalAssets),'Initial seed or full 288 book snapshot expected');
assert(source.includes('verifiedMarkets')&&source.includes('loadAllCryptoBooks(serial,coin)'),
 'Extended orderbook must use verified server snapshots before browser discovery');
assert(html.includes('crypto-orderbooks-data.js?v=20261123-orderbook-expanded-v34'),
 'Browsers and installed PWAs need a fresh snapshot URL');
assert.equal(Object.keys(books.books).length,books.available);
assert(books.available<=books.totalAssets&&books.available>=0,'Snapshot availability must match actual verified books');
const ore=JSON.parse(read('ore-orderbook-data.js').replace(/^window\.__VERTEX_ORE_BOOK__\s*=\s*/,'').replace(/;\s*$/,''));
assert(ore.bids?.length>0&&ore.asks?.length>0,'ORE orderbook missing bids or asks');

const adapted=source.replace('function render(){','function render(){return;')
 .replace('function toast(message){','function toast(message){return;')
 .replace('(function () {','return (function () {')
 .replace(/\}\)\(\);\s*$/,'return {PAGE_RENDERERS,state,marketForceMood,marketForceDialState,marketForceChooseAsset,marketForceLeadId,marketForceSetBullishPeriod,marketForceBullishMetrics,marketForceBullishFeedState,marketForceBullishPlot,marketForceBullishObserved,forceOREFromSnapshot,FORCE_OHLC_PERIODS,forceOHLCAggregate,streamStatus,fxStatus,chartObservedQuotes,chartObservedVersions,portfolioPage,portfolioRow,edit:i=>portfolioEditIndex=i,unlockVertexAudio,playClickSound,playCryptoAlertSound,workspaceChange,workspacePage,workspaceShown,getWorkspaceLayout:()=>workspaceLayout,getWorkspaceEdit:()=>workspaceEditMode};})();');
assert(adapted.includes('edit:i=>'),'Cannot instrument app for smoke test');
/* Simulated WebAudio: exercise sound scheduling without playing real audio in CI. */
const audioEvents={created:0,resumes:0,notes:[]};
class MockAudioContext{
 constructor(){audioEvents.created++;this.state='suspended';this.currentTime=10;this.destination={};MockAudioContext.last=this}
 resume(){audioEvents.resumes++;this.state='running';return Promise.resolve()}
 createOscillator(){
  const note={type:'sine',frequency:0};
  return {get type(){return note.type},set type(v){note.type=v},
   frequency:{setValueAtTime(v){note.frequency=v},exponentialRampToValueAtTime(){}},
   connect(){},start(){audioEvents.notes.push({...note})},stop(){}};
 }
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
}
const persisted={};
const emptyStorage={getItem:key=>persisted[key]??null,setItem:(key,value)=>{persisted[key]=value},removeItem:key=>{delete persisted[key]}};
const document={readyState:'loading',body:{className:''},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
const appWindow={matchMedia:()=>({matches:true,addEventListener(){}}),addEventListener(){},AudioContext:MockAudioContext,__VERTEX_CRYPTO_BOOKS__:books,__VERTEX_ORE_BOOK__:ore,__VERTEX_EXTRA_CRYPTO__:screenshotCatalog};
const app=new Function('window','document','location','localStorage','sessionStorage','navigator','URLSearchParams',adapted)(
 appWindow,
 document,{hash:'#global',search:'',origin:'https://example.test',hostname:'example.test'},
 emptyStorage,emptyStorage,{onLine:false},URLSearchParams);
const allCrypto=appWindow.__vertexPriceBoardBackend.assets.filter(a=>a.group==='crypto');
for(const [symbol] of screenshotCatalog)
 assert(allCrypto.some(a=>a.symbol===symbol+'-USD'),'Missing screenshot crypto '+symbol);
assert.equal(new Set(allCrypto.map(a=>a.id)).size,allCrypto.length,'Duplicate crypto IDs');
const sourceLabelFunctions=source.slice(
 source.indexOf('function orderBookActiveSource(id){'),
 source.indexOf('function updateOrderBookAssetList(){'));
assert(sourceLabelFunctions.includes('function orderBookSourceLabel(id)'),
 'Order Book heading must follow the actual currently received venue/pair');
const activeSourceState={id:'btc',data:{bids:[[100,1]],asks:[[101,1]]},
 venue:'Coinbase Exchange Spot',pair:'BTC/USD',updatedAt:Date.now()};
const activeLabel=new Function('orderBookState','cryptoBookEntry','orderBookSource',
 sourceLabelFunctions+';return orderBookSourceLabel;')(
 activeSourceState,
 ()=>({venue:'Binance Spot',pair:'BTC/USDT'}),
 ()=>({venue:'Binance Spot',pair:'BTC/USDT'}));
assert.equal(activeLabel('btc'),'Coinbase Exchange Spot · BTC/USD',
 'Display must never mislabel Coinbase BTC/USD liquidity as Binance USDT');
activeSourceState.updatedAt=Date.now()-4*60*60*1000;
assert.equal(activeLabel('btc'),'Binance Spot · BTC/USDT',
 'Expired active depth must not override the verified fallback source');
const workspaceBookCode=source.slice(source.indexOf('function workspaceOrderBookLevels(){'),
 source.indexOf('function workspaceWidgetBody(id){'));
assert(workspaceBookCode.includes("<span>Totale ('+esc(quoteCurrency)+')</span>")&&
 !workspaceBookCode.includes('<span>Totale (USDT)</span>')&&
 workspaceBookCode.includes("'Coppia non verificata'"),
 'Workspace total must use the actual pair quote and never invent USDT for unknown pairs');
const bookHtml=app.PAGE_RENDERERS.orderbook();
assert(bookHtml.includes('id="orderBookVenueSelect"')&&
 bookHtml.includes('id="orderBookVenueToolbar"')&&
 bookHtml.includes('Fonte Spot · Exchange'),
 'Order Book must expose a verified exchange selector on desktop and mobile');
assert(['all','ready','waiting'].every(filter=>bookHtml.includes('data-order-book-filter="'+filter+'"'))&&
 !bookHtml.includes('data-order-book-expand=')&&
 !bookHtml.includes('id="orderBookLevelCount"')&&
 !bookHtml.includes('ob-metrics'),
 '288 crypto Order Book must include functional filters but no fake depth or KPI panels');
assert(bookHtml.includes('data-order-book-asset="figr_heloc"'),
 '288 crypto list must include original new catalog tokens');
assert(bookHtml.includes('id="orderBookSearch"')&&bookHtml.includes('288'),
 'Full 288 list and search must render in Order Book on mobile and desktop');
const marketHtml=app.PAGE_RENDERERS.markets();
for(const symbol of ['FIGR_HELOC','HYPE','ZEC','USDE','XMR','LUNC']){
 const asset=allCrypto.find(a=>a.symbol===symbol+'-USD');
 assert(asset&&marketHtml.includes('data-asset="'+asset.id+'"'),
  'Markets must show a historical preview card for '+symbol);
}

app.state.quotes=Object.fromEntries(rows.map(row=>[row.id,row]));
app.state.feedTime=quotes.generatedAt;
app.state.loading=false;
// Load the actual fullscreen viewer against the instrument catalog and mocked market feed.
new Function('window','document','localStorage',read('price-board.js'))(appWindow,document,emptyStorage);
assert.equal(typeof appWindow.VertexPriceBoard.page,'function');
// The app route is normally served by the viewer loaded through index.html.
app.PAGE_RENDERERS.priceboard=()=>appWindow.VertexPriceBoard.page();
const priceBoardHtml=app.PAGE_RENDERERS.priceboard();
for(const label of ['Indici ed ETF','Azioni','Materie prime','Forex','Criptovalute'])
 assert(priceBoardHtml.includes('label="'+label+'"'),'Price board missing '+label);
assert(priceBoardHtml.includes('id="priceBoardStage"'),'Missing price board fullscreen stage');
assert(priceBoardHtml.includes('id="priceBoardFullscreen"'),'Missing native fullscreen toggle');
assert(priceBoardHtml.includes('aria-label="Schermo intero"'),'Fullscreen icon needs accessible name');
assert(priceBoardHtml.includes('<span aria-hidden="true">⛶</span>'),'Fullscreen toggle must show icon only');
assert(!priceBoardHtml.includes('⛶ Schermo intero'),'Fullscreen toggle must not render a visible label');
const priceBoardSource=read('price-board.js');
assert(priceBoardSource.includes("expanded?'✕':'⛶'"),'Fullscreen exit must show only the exit icon');
assert(!priceBoardSource.includes("'✕ Esci dallo schermo intero'"),'Fullscreen exit must not render visible text');
assert(!html.includes('data-page="liquidations"'),'Liquidation Heatmap menu item must be removed');
assert(!html.includes('vertex-liquidations.js'),'Removed Liquidation Heatmap must not load a script');
assert(!html.includes('vertex-liquidations.css'),'Removed Liquidation Heatmap must not load a stylesheet');
assert(!html.includes('vertex-liquidations-prices.js'),'Removed Liquidation Heatmap price helper must not load');
assert(!Object.prototype.hasOwnProperty.call(app.PAGE_RENDERERS,'liquidations'),
 'Liquidation Heatmap must not remain a navigable route');
assert.equal(Object.keys(app.PAGE_RENDERERS).length,13);
assert.equal(typeof app.PAGE_RENDERERS.workspace,'function','Workspace route missing');
// Regression uses controlled fixture changes so it does not depend on live market direction.
const savedForceQuotes=Object.fromEntries(['btc','inj','sp500'].map(id=>[id,app.state.quotes[id]]));
app.state.quotes.btc={...app.state.quotes.btc,change:-0.8};
app.state.quotes.inj={...app.state.quotes.inj,change:-3.5};
app.state.quotes.sp500={...app.state.quotes.sp500,change:1.3};
app.marketForceChooseAsset('btc');
const btcStrength=app.marketForceMood();
app.marketForceChooseAsset('inj');
const injStrength=app.marketForceMood();
app.marketForceChooseAsset('sp500');
const sp500Strength=app.marketForceMood();
for(const entry of [btcStrength,injStrength,sp500Strength]){
 assert.equal(entry.total,100,'Valid instrument score must have a 100-point scale');
 assert.equal(entry.up+entry.flat+entry.down,100,'Force scores must sum to 100');
}
assert.notDeepEqual([btcStrength.up,btcStrength.flat,btcStrength.down],
 [injStrength.up,injStrength.flat,injStrength.down],
 'Selecting BTC versus INJ did not update bullish/neutral/bearish force');
assert(sp500Strength.up>0&&sp500Strength.down===0,'Positive instrument must have bullish force');
assert(injStrength.down>0&&injStrength.up===0,'Negative instrument must have bearish force');
assert.equal(app.marketForceLeadId(),'sp500','Selected instrument was not persisted');
Object.assign(app.state.quotes,savedForceQuotes);
assert.equal(app.marketForceDialState({valid:true,up:76,flat:24,down:0}).key,'up');
assert.equal(app.marketForceDialState({valid:true,up:20,flat:80,down:0}).key,'flat');
assert.equal(app.marketForceDialState({valid:true,up:0,flat:10,down:90}).key,'down');
assert.equal(app.marketForceDialState({valid:false,up:0,flat:0,down:0}).key,'unavailable');
console.log('PASS reactive dial states (bullish, neutral, bearish, unavailable)');
// The user-selected dashboard replaces the previous Market Force overview entirely.
app.marketForceChooseAsset('btc');
const directForcePanel=app.PAGE_RENDERERS.marketforce();
const globalForcePanel=app.PAGE_RENDERERS.global();
assert(html.includes('data-page="marketforce"'),'Market Force navigation missing');
for(const page of [directForcePanel,globalForcePanel]){
 assert(page.includes('data-force-bullish-panel'),'New bullish panel must render immediately');
 assert(page.includes('id="marketForceTitle"'),'New bullish heading missing');
 assert(page.includes('data-bullish-gauge'),'Large segmented gauge missing');
 assert(!page.includes('data-force-count="up"'),'Previous three-circle overview still rendered');
 assert(!page.includes('data-bullish-open'),'Old drill-down button still rendered');
 assert(!page.includes('data-bullish-close'),'Obsolete close button still rendered');
 for(const id of ['bullishGroup','bullishAsset']){
  assert(page.includes('id="'+id+'"'),'Missing bullish market selector: '+id);
 }
 assert(page.includes('<label for="bullishGroup">'),'Category label must remain');
 assert(page.includes('bullish-detail-instrument-field'),'Aligned instrument selector missing');
 assert(!page.includes('bullish-detail-instrument-spacer'),
  'No fake label/spacer should be used for market selector alignment');
 assert(!page.includes('<label for="bullishAsset">'),'Unwanted Seleziona asset heading must be absent');
 for(const period of ['1H','4H','1D','1W']){
  assert(page.includes('data-bullish-period="'+period+'"'),'Missing timeframe: '+period);
 }
 for(const key of ['up','flat','down']){
  assert(page.includes('data-bullish-stat="'+key+'"'),'Missing market sentiment: '+key);
 }
 assert.equal((page.match(/data-bullish-segment="/g)||[]).length,56,
  'Reference dial must render 56 animated segments');
 assert(page.includes('data-bullish-category-toggle'),'Custom category dropdown not available');
 for(const key of ['crypto','stocks','indices','forex']){
  assert(page.includes('data-bullish-category="'+key+'"'),'Market category unavailable: '+key);
 }
 for(const ticker of ['Bitcoin (BTC)','Injective (INJ)','NVIDIA','Apple','EUR / USD','S&amp;P 500']){
  assert(page.includes(ticker),'Asset not selectable: '+ticker);
 }
}
assert(source.includes('function patchMarketForceBullish()'),'Price updates missing');
assert(!source.includes("const searchIcon='<svg"),'Unwanted instrument search icon still declared');
assert(source.includes('function marketForceChooseAsset('),'Instrument selection missing');
assert(source.includes('marketForceSelectedAssets'),'Saved asset selection missing');
assert(css.includes('.bullish-detail-segment.is-active'),'Animated segments not styled');
assert(css.includes('.bullish-detail-orbit'),'Animated indicator orbit missing');
assert(!source.includes('Loghi di tutti i mercati'),'Removed market logo gallery must stay absent');
assert(!source.includes('function marketForceLogoGallery('),'Legacy gallery function must not return');
assert(source.includes("root?.querySelectorAll(")===false || !source.includes('marketForceLogoTiles('),
 'Legacy market logo grid must be absent');
assert(source.includes('market-force-selected-logo'),'Selected asset badge must remain');
assert(source.includes('async function marketForceLoadOHLC('),'OHLC source loader missing');
assert(source.includes('function forceOHLCAggregate('),'OHLC grouping missing');
assert(source.includes('class="force-ohlc-candle '),'OHLC body and wick drawing missing');
assert(!source.includes('id="bullishPriceFill"'),'Old line/area force graph is still present');
assert(css.includes('.force-ohlc-candle.down rect'),'Red candlesticks missing');
assert(source.includes('panel.dataset.forceTone'),'Live dial colour changes missing');
assert(css.includes('.bullish-detail-category-list'),'Category menu not styled');
assert(css.includes('justify-content:flex-end'),'Market selector must align by bottom edge');
assert(css.includes('margin-top:auto'),'Category dropdown must share instrument bottom edge');
assert(!css.includes('.bullish-detail-instrument-spacer'),'Obsolete spacer CSS must be removed');
// Market Force shows only 1H / 4H / 1D / 1W, even for cryptocurrencies.
assert(!app.PAGE_RENDERERS.marketforce().includes('data-bullish-period="1A"'),
 'Forza mercato must not show 1A for cryptocurrencies');
for(const period of ['1H','4H','1D','1W']){
 assert(app.PAGE_RENDERERS.marketforce().includes('data-bullish-period="'+period+'"'),
  'Forza mercato is missing '+period);
}
app.marketForceSetBullishPeriod('1D');
const dayMetrics=app.marketForceBullishMetrics();
assert(dayMetrics.valid,'1D quote should be valid once selected');
assert.equal(dayMetrics.up+dayMetrics.flat+dayMetrics.down,100,'1D force values must total 100');
app.marketForceSetBullishPeriod('1H');
if(!app.marketForceBullishMetrics().valid){
 assert(app.PAGE_RENDERERS.marketforce().includes('Caricamento candele OHLC'),
  'Insufficient 1H history must not create a fake chart');
}
app.marketForceSetBullishPeriod('1D');
assert(app.PAGE_RENDERERS.marketforce().includes('data-force-bullish-panel'),
 'Switching timeframes must not restore the old panel');
// The first-party ORE OHLC archive must support all four Market Force periods.
const oreSnapshot=JSON.parse(read('ore-chart-history.json'));
assert.equal(oreSnapshot.pair,'ORE/USDT');
const oreNow=oreSnapshot.sets.minute1.candles.at(-1)[0]*1000+60000;
for(const period of ['1H','4H','1D','1W']){
 const cfg=app.FORCE_OHLC_PERIODS[period];
 const picked=app.forceOREFromSnapshot(oreSnapshot,cfg,period,oreNow);
 assert(picked&&picked.bars.length>=2,'No ORE snapshot OHLC for '+period);
 const checked=app.forceOHLCAggregate(picked.bars,cfg.group);
 assert(checked.length>=2&&checked.every(b=>b.h>=Math.max(b.o,b.c)&&b.l<=Math.min(b.o,b.c)),
  'Bad real OHLC candle for '+period);
}
assert(source.includes("fetch('./ore-chart-history.json?v='"),'ORE Market Force snapshot fetch missing');
console.log('PASS genuine ORE candles in 1H / 4H / 1D / 1W');
console.log('PASS direct bullish force view replaces old overview on Global and dedicated page');

// Selected feed health must reflect the actual instrument, not another active stream.
const originalLiveQuotes={btc:app.state.quotes.btc,sp500:app.state.quotes.sp500,eurusd:app.state.quotes.eurusd};
const originalStream={connected:app.streamStatus.connected,last:app.streamStatus.last};
const originalForex={connected:app.fxStatus.connected,last:app.fxStatus.last};
app.marketForceChooseAsset('btc');
app.streamStatus.connected=true;
app.streamStatus.last=Date.now();
app.state.quotes.btc={...app.state.quotes.btc,source:'Binance Spot (USDT)',live:true,polled:false,
 received:Date.now(),time:new Date().toISOString()};
assert.equal(app.marketForceBullishFeedState('btc').label,'LIVE','Fresh connected BTC stream must be LIVE');
let livePanel=app.PAGE_RENDERERS.marketforce();
assert(livePanel.includes('data-feed-kind="live"'),'LIVE badge missing for actual BTC streaming');
assert(livePanel.includes('data-bullish-price'),'Live price number not displayed');
assert(livePanel.includes('data-bullish-delta'),'Live price variation not displayed');
app.marketForceChooseAsset('sp500');
assert.notEqual(app.marketForceBullishFeedState('sp500').label,'LIVE',
 'S&P 500 must not be called LIVE merely because BTC stream is connected');
app.marketForceChooseAsset('btc');
app.state.quotes.btc={...app.state.quotes.btc,live:false,polled:true,received:Date.now()};
assert.equal(app.marketForceBullishFeedState('btc').label,'REST ~15 S',
 'Binance REST price fallback must not be labeled LIVE');
app.state.quotes.btc={...app.state.quotes.btc,live:true,polled:false,received:Date.now()-40000};
assert.notEqual(app.marketForceBullishFeedState('btc').label,'LIVE',
 'Expired BTC stream must not be labeled LIVE');
app.state.quotes.btc={...app.state.quotes.btc,source:'Binance Spot (USDT)',live:true,received:Date.now(),time:new Date().toISOString()};
const now=Date.now();
app.chartObservedQuotes.set('btc',[
 {ts:now-30000,price:97000,venue:'binance'},
 {ts:now-15000,price:97050,venue:'binance'},
 {ts:now,price:97100,venue:'binance'}
]);
app.chartObservedVersions.set('btc',3);
assert.equal(app.marketForceBullishObserved('btc','1H').length,3,
 'Real 1H observed BTC ticks not exposed to bullish chart');
const observedPlot=app.marketForceBullishPlot(app.marketForceBullishMetrics());
assert(observedPlot.includes('Caricamento candele OHLC')||observedPlot.includes('force-ohlc-candle')||observedPlot.includes('Storico OHLC'),
 'Force panel must display verified OHLC or an explicit missing-history status');
assert(css.includes('.bullish-detail-feed[data-feed-kind="live"]'),
 'True LIVE feed badge animation styles missing');
assert(css.includes('.bullish-live-quote'),
 'Realtime price readout styles missing');
app.chartObservedQuotes.delete('btc');
app.chartObservedVersions.delete('btc');
Object.assign(app.state.quotes,originalLiveQuotes);
Object.assign(app.streamStatus,originalStream);
Object.assign(app.fxStatus,originalForex);
console.log('PASS selected-asset LIVE status, REST fallback, tick chart, and no false LIVE badge');

const workspace=app.PAGE_RENDERERS.workspace();
for(const id of ['summary','global','markets','crypto','tech','bigtech','forex','commodities',
 'charts','watchlist','portfolio','analytics','orderbook','etf','news','settings']){
 assert(workspace.includes('data-workspace-widget="'+id+'"'),'Workspace missing '+id);
}
assert(workspace.includes('data-ws-action="edit"'),'Workspace customization controls missing');
assert(workspace.includes('data-ws-action="reset"'),'Workspace reset control missing');
assert(workspace.includes('data-ws-action="size"')===false,
 'Size controls should be hidden until edit mode');
assert(source.includes("save('workspaceLayout',workspaceLayout)"),'Workspace layout persistence absent');
for(const [name,fn] of Object.entries(app.PAGE_RENDERERS)){
 const page=fn();
 assert.equal(typeof page,'string');
 assert(page.length>250,'Empty page: '+name);
 const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ids in '+name);
 console.log('PASS',name);
}
const settings=app.PAGE_RENDERERS.settings();
for(const id of themes)assert(settings.includes('data-theme-mode="'+id+'"'),'Unselectable theme '+id);
for(const id of fonts)assert(settings.includes('data-font-style="'+id+'"'),'Unselectable font '+id);
for(const key of ['themeMode','fontStyle','portfolioSave','orderBookAsset','asset','page','refresh']){
 assert(source.includes('dataset.'+key),'Missing interactive handler '+key);
}
app.state.holdings=[null];app.edit(0);
assert(app.portfolioPage().includes('portfolioForm'),'Corrupt portfolio holding crashes edit');
app.edit(-1);
const newPortfolioForm=app.portfolioPage();
assert(newPortfolioForm.includes('id="holdingAverageBuyPrice"'),
 'Portfolio average purchase input missing');
assert(newPortfolioForm.includes('name="avgBuyPrice"'),
 'Portfolio average purchase field is not submitted');
assert(newPortfolioForm.includes('<th>Prezzo medio acquisto</th>'),
 'Portfolio positions must show average buy price');
const averageHolding={id:'btc',qty:2,avgBuyPrice:125,investedUsd:200};
const averageRow=app.portfolioRow(averageHolding,0);
assert.equal(averageRow.cost,125,'Manual average price must take priority');
assert.equal(averageRow.invested,250,'Invested amount must follow quantity times manual average');
const oldHolding={id:'btc',qty:2,investedUsd:200};
const oldRow=app.portfolioRow(oldHolding,0);
assert.equal(oldRow.cost,100,'Existing holdings must preserve legacy cost calculation');
assert.equal(oldRow.invested,200,'Existing holdings must retain invested amount');
app.state.holdings=[averageHolding];app.edit(0);
const editingPortfolio=app.portfolioPage();
assert(editingPortfolio.includes('id="holdingAverageBuyPrice"'),
 'Editing a position must include average purchase input');
console.log('PASS themes/fonts/feeds/icons/orderbook/portfolio and average buy price');

assert(settings.includes('data-test-click-sound="1"'),'No test for click sound');
assert(settings.includes('data-test-crypto-alert-sound="above"'),'No UPPER audio preview');
assert(settings.includes('data-test-crypto-alert-sound="below"'),'No LOWER audio preview');
const startCount=audioEvents.notes.length;
app.state.alertSound=true;
assert.equal(app.playCryptoAlertSound('above'),false,'Alerts should not queue before user unlock');
assert.equal(audioEvents.notes.length,startCount);
app.unlockVertexAudio(true);
assert.equal(audioEvents.created,1,'Expected a single audio context');
assert.equal(audioEvents.resumes,1,'Audio context should resume on gesture');
assert.equal(audioEvents.notes.length,startCount+1,'Gesture should schedule a silent primer');
assert.equal(app.playClickSound(),true,'Button click sound must schedule');
assert.equal(audioEvents.notes.length,startCount+2);
assert.equal(app.playCryptoAlertSound('above'),true,'UPPER chime must schedule');
assert.deepEqual(audioEvents.notes.slice(-3).map(x=>x.frequency),[660,880,1100]);
assert.equal(app.playCryptoAlertSound('below'),true,'LOWER chime must schedule');
assert.deepEqual(audioEvents.notes.slice(-3).map(x=>x.frequency),[880,660,440]);
app.state.alertSound=false;
assert.equal(app.playCryptoAlertSound('above'),false,'Disabled alerts must remain silent');
assert.equal(app.playCryptoAlertSound('above',0,true),true,'UPPER preview must work even if bell off');
app.state.clickSound=false;
assert.equal(app.playClickSound(),false,'Disabled click feedback must remain silent');
assert.equal(app.playClickSound(true),true,'Click preview must play even if normal feedback off');
MockAudioContext.last.state='interrupted';
app.unlockVertexAudio(true);
assert.equal(audioEvents.resumes,2,'Audio must recover after iOS interruption');
assert.equal(audioEvents.created,1,'Click and alert sounds must share one context');
console.log('PASS gesture-unlocked audio, UPPER/LOWER tones, sound previews, silent mode and recovery');
app.workspaceChange('edit');
assert.equal(app.getWorkspaceEdit(),true,'Workspace edit mode did not activate');
assert(app.workspacePage().includes('data-ws-action="size"'),'Workspace edit controls hidden');
app.workspaceChange('size','summary');
assert(app.getWorkspaceLayout().wide.includes('summary'),'Widget resize failed');
app.workspaceChange('down','summary');
assert.equal(app.getWorkspaceLayout().order[1],'summary','Widget reordering failed');
app.workspaceChange('toggle','forex');
assert.equal(app.workspaceShown('forex'),false,'Widget hiding failed');
assert(!app.workspacePage().includes('data-workspace-widget="forex"'),'Hidden widget still rendered');
assert(Object.keys(persisted).some(key=>key.endsWith('workspaceLayout')),'Workspace layout not saved');
app.workspaceChange('reset');
assert(app.workspaceShown('forex'),'Reset did not restore hidden widgets');
assert(!app.getWorkspaceLayout().wide.includes('summary'),'Reset did not restore module sizes');
assert.equal(app.getWorkspaceLayout().order[0],'summary','Reset did not restore order');
console.log('PASS Workspace 16 modules, edit/resize/reorder/hide/reset and saved layout');

assert(source.includes('class="market-force-realistic-bull"'),'Realistic bullish bull must be rendered inside dial');
assert(source.includes('data:image/webp;base64,UklGR'),'Realistic bull image should be bundled without external fetch');
assert(css.includes('.market-force-realistic-bull'),'Realistic bull responsive sizing is missing');
assert(css.includes('Global: fully opaque dashboard containers'),'Global solid card surface override missing');
assert(css.includes('background:var(--panel)!important'),'Card backgrounds must use opaque theme surfaces');
assert(css.includes('body.page-global :is(.map-callout,.region-insight)'),'Map callouts must be opaque');
assert(css.includes('body.page-global .world-map-panel'),'Map backdrop should remain visible');
assert(css.includes('body .sidebar{'),'Sidebar should have solid theme background');
assert(html.includes('style.css?v='),'Updated styles must bypass browser cache');
assert(css.includes('Market Force: fully opaque, theme-aware surfaces'),'Opaque Force Market override missing');
for(const selector of [
 '.market-force-section.bullish-detail-panel',
 '.bullish-detail-toolbar',
 '.bullish-detail-category-trigger',
 '.bullish-detail-asset-select',
 '.bullish-detail-chart',
 '.bullish-detail-metric',
 '.bullish-detail-state'
]){
 assert(css.includes(selector),'Missing opaque Force Market surface: '+selector);
}
assert(css.includes('background:var(--panel)!important')&&
 css.includes('background:var(--panel-2)!important'),
 'Market Force must use theme-aware solid backgrounds');

/* Sand theme must use readable dark typography on beige cards, including
   live badges, dropdown labels, OHLC axes and all three score colors. */
assert(css.includes('Sabbia accessibility correction'),'Sand accessibility fix missing');
for(const selector of [
 '.bullish-detail-title-group h2',
 '.bullish-detail-category-trigger .bullish-category-name',
 '.bullish-detail-asset-select select',
 '.bullish-detail-metric>div span',
 '.force-ohlc-axis',
 '.bullish-detail-assessment strong'
]){
 assert(css.slice(css.indexOf('Sabbia accessibility correction')).includes(selector),
 'Sand theme contrast missing for '+selector);
}
assert(css.includes('body.theme-sand #pageContainer .market-force-section .bullish-detail-gauge-inner strong'),
 'Gauge white numbers must remain legible on dark dial');
assert(html.includes('style.css?v='),
 'New Sand contrast stylesheet must bypass cache');

/* All Vertex menu variants share the same blurred, readable glass design. */
const dropdownCSS=css.slice(css.indexOf('Vertex frosted dropdown system'));
for(const theme of ["light","dark","ocean","emerald","violet","sand","ice","sunset","graphite","ruby"]){
 assert(dropdownCSS.includes('.theme-'+theme),'Glass menu missing theme '+theme);
}
for(const selector of ['#searchMenu','.bullish-detail-category-list','::picker(select)',':is(.form-field select']){
 assert(dropdownCSS.includes(selector),'Frosted menu selector missing '+selector);
}
assert(dropdownCSS.includes('--vertex-popup-blur:20px'),'Reference-style blur must be 20px');
assert(dropdownCSS.includes('--vertex-popup-opacity:68%')||css.includes('--vertex-popup-opacity:70%'),'Menu tint must be 70% or previous default');
assert(dropdownCSS.includes('opacity:1!important'),'Text and icons must stay fully opaque');
assert(dropdownCSS.includes('-webkit-backdrop-filter:blur(var(--vertex-popup-blur))'),'Safari blur fallback missing');
assert(dropdownCSS.includes('@supports (appearance:base-select)'),'Customizable native-select picker enhancement missing');
assert(dropdownCSS.includes('option:checked'),'Selected native option must be highlighted');
assert(html.includes('style.css?v='),'Updated glass menu stylesheet must bypass cache');

/* In-page native-select replacement actually displays styled popup in every browser. */
const frostJs=read('vertex-frost-selects.js');
new Function(frostJs);
assert(html.includes('vertex-frost-selects.js?v=20261113-vertex-glass-popup-v250'),
 'Browser-independent glass native select script must be loaded');
assert(css.includes('Vertex unified glass popovers'),'Shared frosted popover skin missing');
assert(css.includes('.vertex-frost-select-popover'),'Custom select popup missing styling');
assert(css.includes('backdrop-filter:blur(24px) saturate(135%)!important'),
 'Reference image background blur must be visible');
assert(css.includes('color-mix(in srgb,var(--panel-2) 70%,transparent)'),
 'Keep panel at 30 percent transparent');
assert(frostJs.includes('select.dispatchEvent(new Event(\'change\',{bubbles:true}))'),
 'Glass selection must emit native change event for live asset updates');
assert(frostJs.includes('document.addEventListener(\'pointerdown\''),
 'Native dropdown popup must be intercepted on mobile');
assert(frostJs.includes('select.closest(\'dialog[open]\')||document.fullscreenElement||document.body'),
 'Fullscreen/dialog dropdown must stay in top layer');

assert(css.includes('body:is(.theme-light,.theme-dark,.theme-ocean,.theme-emerald,.theme-violet,.theme-sand,.theme-ice,.theme-sunset,.theme-graphite,.theme-ruby) #pageContainer .market-force-section .bullish-detail-category-list{'),
 'Frosted market dropdown must override earlier theme-specific opaque rules');

/* Global screenshot: frosted TOTAL pills, indices, regions, side panels and map labels. */
const globalGlassRules=css.slice(css.indexOf('Global page — reference-inspired frosted glass'));
assert(globalGlassRules.length>1000,'Global frosted card CSS is missing');
for(const selector of [
 '.global-crypto-cap-pill',
 '.market-index-strip .index-mini',
 '.global-grid .global-regions',
 '.global-grid .aside-stack > .panel',
 '.global-grid .photo-card',
 '.world-map-panel :is(.map-callout,.region-insight)'
]){
 assert(globalGlassRules.includes(selector),'Frosted Global surface missing: '+selector);
}
assert(globalGlassRules.includes('color-mix(in srgb,var(--panel) 70%,transparent)'),
 'Global cards should retain 30% transparency');
assert(globalGlassRules.includes('backdrop-filter:blur(24px) saturate(135%)!important'),
 'Global cards must have the reference-style 24px blur');
assert(globalGlassRules.includes('body.page-global .world-map-panel{\n backdrop-filter:none!important'),
 'The atlas must not itself be blurred');
assert(html.includes('style.css?v='),'Global frosted CSS must bypass cache');

/* Asset menus show clean names with no redundant currency/ticker suffix. */
assert(source.includes("function marketForceSelectLabel(asset){\n return asset.name;"));
assert(read('price-board.js').includes("function dropdownLabel(a){\n return a.name;"));
assert(source.includes("symbol:'BTC-USD'"),'Original market symbol must remain intact');
assert(source.includes("symbol:'EURUSD=X'"),'Forex pair must remain intact');
assert(html.includes('script.js?v='));
assert(source.includes('function forceMarketObservedArchive('),'Forza mercato must read same-origin crypto intraday archives');
assert(source.includes('function forceMarketObservedDirect('),'Forza mercato needs live verified price history fallback');
assert(source.includes('function forceMarketSampledCandles('),
 'Forza mercato must render sampled observed prices as labeled candles, not lines');
assert(source.includes('const fullBars=realBars.length>=2?realBars:observed;'),
 'Forza mercato must render true OHLC first, sampled candles only as a fallback');
assert(html.includes('price-board.js?v=20261115-icon-only-fullscreen-v7'));

/* Swipe control persists across all sections and prioritizes the exposed right strip. */
assert(source.includes('function setupSidebarSwipe()'));
assert(source.includes("zone:outsideRight?'right-strip'"));
assert(source.includes("Bound to document, not #pageContainer"));
assert(source.includes("touch.clientX>=sidebar.getBoundingClientRect().right"));
assert(source.includes("document.addEventListener('touchmove'"));
assert(source.includes("document.fullscreenElement"));
assert(source.includes("if(leftEdge&&target.closest("));
assert(source.includes("if(Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)*1.15)"));

/* Reference-inspired cryptocurrency heatmap in Markets (real data, no fake coins). */
const heatmap=read('vertex-heatmap.js'),heatmapCss=read('vertex-heatmap.css');
new Function(heatmap);
assert(html.includes('vertex-heatmap.css?v='),'Crypto heatmap CSS missing');
assert(html.includes('vertex-heatmap.js?v='),'Crypto heatmap JS missing');
assert(source.includes("window.VertexHeatmap?.page()"),'Markets must render heatmap');
assert(source.includes("window.VertexHeatmap?.activate()"),'Markets must refresh live heatmap');
assert(source.includes('id="vertexMarketsCharts"'),'Existing charts scroll target missing');
assert(!heatmap.includes('<nav class="vh-tabs"'),'Unwanted crypto heatmap navigation bar was reintroduced');
assert(!heatmap.includes('navButton('),'Old market tab builder should be removed');
assert(heatmap.includes('id="vhStats"'),'Market statistics must remain visible');
assert(heatmap.includes('id="vhGrid"'),'Crypto heatmap must remain visible');
assert(heatmap.includes('/api/v3/coins/markets'),'Top CoinGecko markets endpoint missing');
assert(heatmap.includes("coinAssets()"),'Vertex crypto fallback missing');
assert(heatmap.includes('aria-label="Mappa mercato criptovalute"'),'Accessible heatmap missing');
assert(heatmapCss.includes('.vh-down')&&heatmapCss.includes('.vh-up'),'Red and green tile styling missing');
assert(heatmapCss.includes('@media(max-width:520px)'),'Mobile heatmap styling missing');

/* Header should not display a pinned INJ price or percentage anymore. */
assert(!heatmap.includes('id="vhLeader"'),'The removed INJ leader must not be rendered');
assert(!heatmap.includes('const inj=data.all.find('),'No pinned INJ asset in heatmap header');
assert(!heatmap.includes('const leader=document.getElementById('),'Live paint must not recreate the leader');
assert(!heatmapCss.includes('.vh-leader'),'Unused INJ leader styles must be absent');
