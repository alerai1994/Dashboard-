'use strict';
/* Zero-dependency regression smoke test for Vertex. Run: node tests/site-smoke.cjs */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const source=read('script.js'),html=read('index.html'),css=read('style.css');
new Function(source);
new Function(read('vertex-widget-sw.js'));
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

const adapted=source.replace('(function () {','return (function () {')
 .replace(/\}\)\(\);\s*$/,'return {PAGE_RENDERERS,state,portfolioPage,edit:i=>portfolioEditIndex=i};})();');
assert(adapted.includes('edit:i=>'),'Cannot instrument app for smoke test');
const emptyStorage={getItem:()=>null,setItem(){},removeItem(){}};
const document={readyState:'loading',body:{className:''},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
const app=new Function('window','document','location','localStorage','sessionStorage','navigator','URLSearchParams',adapted)(
 {matchMedia:()=>({matches:true,addEventListener(){}}),__VERTEX_CRYPTO_BOOKS__:books,__VERTEX_ORE_BOOK__:ore},
 document,{hash:'#global',search:'',origin:'https://example.test',hostname:'example.test'},
 emptyStorage,emptyStorage,{onLine:false},URLSearchParams);
app.state.quotes=Object.fromEntries(rows.map(row=>[row.id,row]));
app.state.feedTime=quotes.generatedAt;
app.state.loading=false;
assert.equal(Object.keys(app.PAGE_RENDERERS).length,10);
for(const [name,fn] of Object.entries(app.PAGE_RENDERERS)){
 const page=fn();
 assert.equal(typeof page,'string');
 assert(page.length>250,'Empty page: '+name);
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
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
console.log('PASS themes/fonts/feeds/icons/orderbook/portfolio corruption');
