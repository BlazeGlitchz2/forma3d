import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {zipSync,strToU8} from 'fflate';
import {calculateQuote,normalizePhone,validateConfig,validateOrderStock,InsufficientStockError,type Quote,type Stats} from '../lib/pricing.ts';
import * as pricing from '../lib/pricing.ts';
import * as catalogModule from '../lib/catalog.ts';
import {materials,products,defaultConfig,productConfig,productMaterials,colors,maximumPrintScale,fitsPrinter,filamentMarketCosts,normalizeCatalogProduct,normalizeCatalogMaterial} from '../lib/catalog.ts';
import {validateModel,MAX_FILE_BYTES} from '../lib/model-validation.ts';
const vertices=[[0,0,0],[20,0,0],[0,20,0],[0,0,20]];
const faces=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
const stl='solid tetra\n'+faces.map(f=>'facet normal 0 0 0\nouter loop\n'+f.map(i=>'vertex '+vertices[i].join(' ')).join('\n')+'\nendloop\nendfacet').join('\n')+'\nendsolid tetra';
const xml=(extra='')=>`<?xml version="1.0"?><model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${vertices.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${faces.map(f=>`<triangle v1="${f[0]}" v2="${f[1]}" v3="${f[2]}"/>`).join('')}</triangles></mesh></object>${extra}</resources><build><item objectid="1"/></build></model>`;
test('STL geometry produces independently computed volume and bounds',()=>{const s=validateModel(strToU8(stl),'object.stl');assert.deepEqual(s.dimensions,[20,20,20]);assert.equal(s.triangles,4);assert.ok(Math.abs(s.volume-8000/6)<.001)});
test('binary STL and ASCII STL produce the same physical volume',()=>{const bytes=new Uint8Array(84+4*50);const view=new DataView(bytes.buffer);view.setUint32(80,4,true);faces.forEach((f,i)=>f.forEach((v,j)=>vertices[v].forEach((n,k)=>view.setFloat32(84+i*50+12+j*12+k*4,n,true))));assert.deepEqual(validateModel(bytes,'binary.stl'),validateModel(strToU8(stl),'text.stl'))});
test('3MF parses actual model geometry and honors transforms',()=>{const bytes=zipSync({'3D/3dmodel.model':strToU8(xml().replace('<item objectid="1"/>','<item objectid="1" transform="2 0 0 0 2 0 0 0 2 0 0 0"/>'))});const s=validateModel(bytes,'print.3mf');assert.deepEqual(s.dimensions,[40,40,40]);assert.ok(Math.abs(s.volume-64000/6)<.001)});
test('invalid, corrupt, oversized and recursive models fail clearly',()=>{assert.equal(MAX_FILE_BYTES,50*1024*1024);assert.throws(()=>validateModel(strToU8('solid nope'),'bad.stl'));assert.throws(()=>validateModel(new Uint8Array(51*1024*1024),'big.stl'));assert.throws(()=>validateModel(strToU8(stl),'bad.exe'));assert.throws(()=>validateModel(zipSync({'a.model':strToU8(xml()),'b.model':strToU8(xml())}),'parts.3mf'));const recursive=xml('<object id="2"><components><component objectid="2"/></components></object>').replace('<item objectid="1"/>','<item objectid="2"/>');assert.throws(()=>validateModel(zipSync({'a.model':strToU8(recursive)}),'recursive.3mf'),/too complex/)});
test('Saudi numbers normalize English and Arabic digits',()=>{assert.equal(normalizePhone('050 123 4567'),'+966501234567');assert.equal(normalizePhone('+966 50 123 4567'),'+966501234567');assert.equal(normalizePhone('٠٥٠١٢٣٤٥٦٧'),'+966501234567');assert.throws(()=>normalizePhone('12345'))});
test('catalog quotes reflect configuration and reject delivery',()=>{const stats={dimensions:products[0].dimensions,volume:20000,triangles:4};const base=calculateQuote(defaultConfig,materials[0],stats,products[0]);assert.equal(base.total,79);assert.throws(()=>calculateQuote(defaultConfig,materials[0],stats,products[0],'delivery'),/pickup only/);assert.equal(calculateQuote({...defaultConfig,quantity:2},materials[0],stats,products[0]).total,150.1);assert.equal(calculateQuote({...defaultConfig,quality:'smooth'},materials[0],stats,products[0]).total,98.75)});
test('invalid quantity, unavailable color, oversized models and low stock fail',()=>{const stats={dimensions:[20,20,20] as [number,number,number],volume:1000,triangles:4};assert.throws(()=>validateConfig({...defaultConfig,quantity:-1}));assert.throws(()=>calculateQuote({...defaultConfig,color:'sage'},materials[0],stats));assert.throws(()=>calculateQuote({...defaultConfig,size:300},materials[0],{...stats,dimensions:[100,100,100]}));assert.throws(()=>calculateQuote(defaultConfig,{...materials[0],stock:0},stats))});
test('slicer measurements replace estimates and retain provenance',()=>{const stats={dimensions:[20,20,20] as [number,number,number],volume:1000,triangles:4};const q=calculateQuote(defaultConfig,materials[0],stats,undefined,'pickup',{grams:20,minutes:90});assert.equal(q.source,'slicer');assert.equal(q.grams,20);assert.equal(q.minutes,90);assert.throws(()=>calculateQuote(defaultConfig,materials[0],stats,undefined,'pickup',{grams:NaN,minutes:90}))});

test('restricted product defaults choose a usable size, material and color',()=>{const p={...products[0],sizeOptions:[80,120],materialIds:['pla'],colorIds:['black']};const config=productConfig(p,materials);assert.equal(config.size,80);assert.equal(config.material,'pla');assert.equal(config.color,'black');assert.deepEqual(productMaterials(p,materials).map(m=>m.colors),[['black']])});

test('Ender-3 V3 SE enforces each physical axis instead of a cube',()=>{assert.equal(fitsPrinter([220,220,250]),true);assert.equal(fitsPrinter([221,200,100]),false);assert.equal(fitsPrinter([200,221,100]),false);assert.equal(fitsPrinter([200,200,251]),false);assert.equal(maximumPrintScale([500,100,100]),44);assert.equal(maximumPrintScale([100,100,500]),50);const stats={dimensions:[220,220,250] as [number,number,number],volume:1000,triangles:4};assert.ok(calculateQuote(defaultConfig,materials[0],stats).total>0);assert.throws(()=>calculateQuote(defaultConfig,materials[0],{...stats,dimensions:[220.01,100,100]}),/Ender/)});
test('Saudi PLA stock and price arithmetic match primary supplier observations',()=>{assert.deepEqual(colors.map(c=>c.id),['red','blue','grey','black','white','transparent','yellow','green']);assert.deepEqual(materials.filter(m=>m.available).map(m=>m.id),['pla']);assert.equal(filamentMarketCosts.blue/1000,.087);assert.equal(filamentMarketCosts.red/1000,.089);assert.equal(filamentMarketCosts.transparent/1000,.089);assert.equal(filamentMarketCosts.yellow/1000,.087);assert.equal(filamentMarketCosts.green/1000,.087);const stats={dimensions:[20,20,20] as [number,number,number],volume:1000,triangles:4};const q=calculateQuote(defaultConfig,materials[0],stats,undefined,'pickup',{grams:100,minutes:240});assert.equal(q.total,49);assert.equal(q.breakdown.material,35);assert.equal(q.breakdown.machine,14);assert.equal(q.breakdown.support,0);assert.equal(calculateQuote({...defaultConfig,quantity:2},materials[0],stats,undefined,'pickup',{grams:100,minutes:240}).total,93.1);assert.equal(calculateQuote(defaultConfig,materials[0],stats,undefined,'pickup',{grams:2,minutes:10}).total,39)});

test('legacy catalog estimates scale once, strength affects time, and partial slicer data fails',()=>{const stats={dimensions:[100,100,100] as [number,number,number],volume:1000000,triangles:4};const legacy={...products[0],estimatedGrams:undefined,estimatedMinutes:undefined};const a=calculateQuote(defaultConfig,materials[0],stats,legacy);const b=calculateQuote({...defaultConfig,size:150},materials[0],stats,legacy);assert.ok(Math.abs(b.grams/a.grams-3.375)<.01);const strong=calculateQuote({...defaultConfig,strength:'strong'},materials[0],stats,products[0]);const everyday=calculateQuote(defaultConfig,materials[0],stats,products[0]);assert.ok(strong.minutes>everyday.minutes);for(const partial of [{},{grams:20},{minutes:90}])assert.throws(()=>calculateQuote(defaultConfig,materials[0],stats,undefined,'pickup',partial as unknown as {grams:number;minutes:number}),/invalid/);assert.equal(calculateQuote({...defaultConfig,quantity:2},materials[0],stats,undefined,'pickup',{grams:20,minutes:60}).total,39)});

test('finishing is a real add-on and provisional supports count in displayed grams',()=>{const stats={dimensions:[20,20,20] as [number,number,number],volume:1000,triangles:4};const base=calculateQuote(defaultConfig,materials[0],stats,undefined,'pickup',{grams:20,minutes:60});const sanded=calculateQuote({...defaultConfig,finishing:'sanded'},materials[0],stats,undefined,'pickup',{grams:20,minutes:60});assert.equal(sanded.total-base.total,20);const no=calculateQuote({...defaultConfig,supports:'none'},materials[0],stats);const auto=calculateQuote(defaultConfig,materials[0],stats);assert.ok(auto.grams>no.grams);assert.equal(auto.grams,3.3)});

test('volume discounts reward batches without pricing below the minimum floor',()=>{
 const stats={dimensions:[20,20,20] as [number,number,number],volume:1000,triangles:4};
 const at=(quantity:number)=>calculateQuote({...defaultConfig,quantity},materials[0],stats,undefined,'pickup',{grams:100,minutes:240});
 const one=at(1),two=at(2),five=at(5),ten=at(10);
 assert.equal(one.total,49);assert.equal(one.breakdown.discountRate,0);assert.equal(one.breakdown.discount,0);
 assert.equal(two.breakdown.discountRate,.05);assert.equal(two.breakdown.discount,4.9);assert.equal(two.total,93.1);
 assert.equal(five.breakdown.discountRate,.10);assert.equal(five.total,220.5);
 assert.equal(ten.breakdown.discountRate,.15);assert.equal(ten.total,416.5);
 assert.ok(one.total/1>two.total/2&&two.total/2>five.total/5&&five.total/5>ten.total/10);
 const tiny=calculateQuote({...defaultConfig,quantity:2},materials[0],stats,undefined,'pickup',{grams:20,minutes:60});
 assert.equal(tiny.breakdown.discount,0);assert.equal(tiny.total,39);
});

test('saved catalog colour aliases normalize without changing owner prices or uploaded axes',()=>{const old={...products[0],color:'cloud',colorIds:['cloud','sea'],dimensions:[105,160,105] as [number,number,number],price:77};const normalized=normalizeCatalogProduct(old);assert.equal(normalized.price,77);assert.equal(normalized.color,'white');assert.deepEqual(normalized.colorIds,['white','blue']);assert.deepEqual(normalized.dimensions,[105,105,160]);const attached=normalizeCatalogProduct({...old,modelId:'model'});assert.deepEqual(attached.dimensions,[105,160,105]);assert.equal(attached.estimatedGrams,undefined);assert.deepEqual(normalizeCatalogMaterial({...materials[0],colors:['cloud','sea','cloud']}).colors,['white','blue'])});

test('order stock sums line quantities once and keeps materials independent',()=>{
 const stats:Stats={dimensions:[20,20,20],volume:1000,triangles:4};
 const pla={...materials[0],stock:.1};
 const first=calculateQuote({...defaultConfig,quantity:3},pla,stats,undefined,'pickup',{grams:20,minutes:60});
 const second=calculateQuote({...defaultConfig,quantity:2,color:'white'},pla,stats,undefined,'pickup',{grams:20,minutes:60});
 assert.equal(first.grams,60);assert.equal(second.grams,40);
 assert.doesNotThrow(()=>validateOrderStock([first,second],[pla]));
 assert.throws(()=>validateOrderStock([first,first],[pla]),/PLA.*filament for this order/);
 const petg={...pla,id:'petg',name:'PETG'};
 const other=calculateQuote({...defaultConfig,material:'petg',quantity:3},petg,stats,undefined,'pickup',{grams:20,minutes:60});
 assert.doesNotThrow(()=>validateOrderStock([first,other],[pla,petg]));
 assert.throws(()=>validateOrderStock([first],[{...pla,available:false}]),/available material/);
});

test('order stock includes provisional support allowance across lines',()=>{
 const stats:Stats={dimensions:[20,20,20],volume:1000,triangles:4};const material={...materials[0],stock:.006};
 const without=calculateQuote({...defaultConfig,supports:'none'},material,stats);
 const supports=calculateQuote(defaultConfig,material,stats);
 assert.equal(without.grams,3);assert.equal(supports.grams,3.3);
 assert.doesNotThrow(()=>validateOrderStock([without,without],[material]));
 assert.throws(()=>validateOrderStock([supports,supports],[material]),InsufficientStockError);
});

// Execute the real server function with isolated database, bucket and slicer boundaries.
// Cloudflare worker imports cannot be loaded by Node's core-test runner directly.
const compiledQuoteServer=ts.transpileModule(readFileSync(new URL('../lib/quote-server.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function quoteServerFixture({stock=.05,cached,sliced,configured=true,offline=false}:{stock?:number;cached?:Quote;sliced?:{grams:number;minutes:number};configured?:boolean;offline?:boolean}={}){
 const stats:Stats={dimensions:[100,100,10],volume:100000,triangles:4};const material={...materials[0],stock};
 const calls={slices:0,writes:0};
 const db=()=>({prepare(sql:string){return{bind(){return this},async first(){if(sql.includes('FROM uploads'))return{stats:JSON.stringify(stats),owner:'guest',object_key:'models/model.stl'};if(sql.includes('FROM quote_snapshots'))return cached?{data:JSON.stringify(cached)}:null;throw new Error('Unexpected query: '+sql)},async run(){calls.writes++;return{success:true}}}}});
 class FixtureApiError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}
 const server={db,runtime:{SLICER_URL:configured?'https://slicer.example.test':undefined,SLICER_TOKEN:'test',BUCKET:{async get(){return{async arrayBuffer(){return strToU8(stl).buffer}}}}},getCatalog:async()=>({products:[],materials:[material],profiles:catalogModule.qualityOptions}),owner:async()=> 'guest',ApiError:FixtureApiError,digest:(value:string)=>value};
 const boundaryFetch=async()=>{calls.slices++;if(offline)throw new Error('offline');return Response.json(sliced??{grams:49,minutes:200})};
 const fixtureExports:{quoteItem?:typeof import('../lib/quote-server.ts').quoteItem}={};
 const dependency=(id:string)=>{if(id==='./server')return server;if(id==='./pricing')return pricing;if(id==='./catalog')return catalogModule;throw new Error('Unexpected import: '+id)};
 new Function('require','exports','fetch',compiledQuoteServer)(dependency,fixtureExports,boundaryFetch);
 return{quoteItem:fixtureExports.quoteItem!,calls,material,stats,item:{uploadId:'upload',name:'test',config:defaultConfig}};
}

test('cached actual analysis can satisfy stock when the rough estimate cannot',async()=>{
 const stats:Stats={dimensions:[100,100,10],volume:100000,triangles:4};const material={...materials[0],stock:.05};
 assert.throws(()=>calculateQuote(defaultConfig,material,stats),InsufficientStockError);
 const cached=calculateQuote(defaultConfig,material,stats,undefined,'pickup',{grams:49,minutes:200});
 const fixture=quoteServerFixture({cached});const quote=await fixture.quoteItem(fixture.item);
 assert.equal(quote.source,'slicer');assert.equal(quote.grams,49);assert.equal(fixture.calls.slices,0);
});

test('requested analysis precedes rough stock rejection and enforces measured stock',async()=>{
 const fixture=quoteServerFixture();const quote=await fixture.quoteItem(fixture.item,'pickup',true);
 assert.equal(quote.source,'slicer');assert.equal(quote.grams,49);assert.equal(fixture.calls.slices,1);assert.equal(fixture.calls.writes,1);
 const excess=quoteServerFixture({sliced:{grams:60,minutes:200}});
 await assert.rejects(()=>excess.quoteItem(excess.item,'pickup',true),InsufficientStockError);
 assert.equal(excess.calls.slices,1);assert.equal(excess.calls.writes,0);
});

test('cached analysis is checked against current stock and ordinary estimates still check stock',async()=>{
 const stats:Stats={dimensions:[100,100,10],volume:100000,triangles:4};
 const cached=calculateQuote(defaultConfig,materials[0],stats,undefined,'pickup',{grams:60,minutes:200});
 const fixture=quoteServerFixture({cached});await assert.rejects(()=>fixture.quoteItem(fixture.item),InsufficientStockError);
 const estimate=quoteServerFixture();await assert.rejects(()=>estimate.quoteItem(estimate.item),InsufficientStockError);
 assert.equal(estimate.calls.slices,0);
 const valid=quoteServerFixture({stock:1});const quote=await valid.quoteItem(valid.item);
 assert.equal(quote.source,'estimate');assert.ok(quote.grams>50);assert.equal(valid.calls.slices,0);
});

test('analysis retains configuration validation and unavailable-slicer fallback errors',async()=>{
 const fixture=quoteServerFixture();
 await assert.rejects(()=>fixture.quoteItem({...fixture.item,config:{...defaultConfig,size:300}},'pickup',true),/Ender/);
 await assert.rejects(()=>fixture.quoteItem({...fixture.item,config:{...defaultConfig,color:'sage'}},'pickup',true),/not available/);
 assert.equal(fixture.calls.slices,0);
 const missing=quoteServerFixture({configured:false});
 await assert.rejects(()=>missing.quoteItem(missing.item,'pickup',true),(error:unknown)=>error instanceof Error&&'status' in error&&error.status===503&&/not connected/.test(error.message));
 const offline=quoteServerFixture({offline:true});
 await assert.rejects(()=>offline.quoteItem(offline.item,'pickup',true),(error:unknown)=>error instanceof Error&&'status' in error&&error.status===503&&/unavailable/.test(error.message));
 assert.equal(offline.calls.writes,0);
});
