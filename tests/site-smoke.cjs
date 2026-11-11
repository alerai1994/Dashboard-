'use strict';
/* Zero-dependency regression smoke test for Vertex. Run: node tests/site-smoke.cjs */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const source=read('script.js'),html=read('index.html'),css=read('style.css');
new Function(source);
new Function(read('price-board.js'));
new Function(read('vertex-widget-sw.js'));
assert.match(html,/src="price-board\.js\?v=/);
assert.match(html,/href="price-board\.css\?v=/);
assert.match(html,/id="pageContainer"/);
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
assert.equal(quotes.crypto.length,42,'Expected 42 cryptocurrency quotes');
assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'Duplicate asset IDs');
for(const row of rows)assert(row.id&&row.symbol&&Number.isFinite(+row.value)&&+row.value>0,'Invalid quote '+row.id);
const books=JSON.parse(read('crypto-orderbooks-data.js').replace(/^window\.__VERTEX_CRYPTO_BOOKS__\s*=\s*/,'').replace(/;\s*$/,''));
assert.equal(books.totalAssets,42);
assert.equal(Object.keys(books.books).length,42);
const ore=JSON.parse(read('ore-orderbook-data.js').replace(/^window\.__VERTEX_ORE_BOOK__\s*=\s*/,'').replace(/;\s*$/,''));
assert(ore.bids?.length>0&&ore.asks?.length>0,'ORE orderbook missing bids or asks');

const adapted=source.replace('function render(){','function render(){return;')
 .replace('function toast(message){','function toast(message){return;')
 .replace('(function () {','return (function () {')
 .replace(/\}\)\(\);\s*$/,'return {PAGE_RENDERERS,state,marketForceMood,marketForceChooseAsset,marketForceLeadId,marketForceSetBullishPeriod,marketForceBullishMetrics,portfolioPage,portfolioRow,edit:i=>portfolioEditIndex=i,unlockVertexAudio,playClickSound,playCryptoAlertSound,workspaceChange,workspacePage,workspaceShown,getWorkspaceLayout:()=>workspaceLayout,getWorkspaceEdit:()=>workspaceEditMode};})();');
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
const appWindow={matchMedia:()=>({matches:true,addEventListener(){}}),addEventListener(){},AudioContext:MockAudioContext,__VERTEX_CRYPTO_BOOKS__:books,__VERTEX_ORE_BOOK__:ore};
const app=new Function('window','document','location','localStorage','sessionStorage','navigator','URLSearchParams',adapted)(
 appWindow,
 document,{hash:'#global',search:'',origin:'https://example.test',hostname:'example.test'},
 emptyStorage,emptyStorage,{onLine:false},URLSearchParams);
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
console.log('PASS selection-driven bullish/neutral/bearish scores for BTC, INJ, S&P 500');
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
 for(const ticker of ['BTC-USD','INJ-USD','NVDA','AAPL','EURUSD=X','^GSPC']){
  assert(page.includes(ticker),'Asset not selectable: '+ticker);
 }
}
assert(source.includes('function patchMarketForceBullish()'),'Price updates missing');
assert(source.includes('function marketForceChooseAsset('),'Instrument selection missing');
assert(source.includes('marketForceSelectedAssets'),'Saved asset selection missing');
assert(css.includes('.bullish-detail-segment.is-active'),'Animated segments not styled');
assert(css.includes('.bullish-detail-category-list'),'Category menu not styled');
const dayMetrics=app.marketForceBullishMetrics();
assert(dayMetrics.valid,'Default 1D quote should be valid');
assert.equal(dayMetrics.up+dayMetrics.flat+dayMetrics.down,100,'1D force values must total 100');
app.marketForceSetBullishPeriod('1H');
if(!app.marketForceBullishMetrics().valid){
 assert(app.PAGE_RENDERERS.marketforce().includes('Storico 1H non disponibile'),
  'Insufficient 1H history must not create a fake chart');
}
app.marketForceSetBullishPeriod('1D');
assert(app.PAGE_RENDERERS.marketforce().includes('data-force-bullish-panel'),
 'Switching timeframes must not restore the old panel');
console.log('PASS direct bullish force view replaces old overview on Global and dedicated page');

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
