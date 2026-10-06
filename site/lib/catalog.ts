export type ProductKind = 'vase' | 'planter' | 'tray' | 'stand' | 'organizer' | 'lamp';
export type Product = { id: string; name: string; nameAr: string; category: string; kind: ProductKind; price: number; dimensions: [number,number,number]; description: string; descriptionAr: string; color: string; available: boolean; featured: boolean; modelId?:string; imageId?:string; materialIds?:string[]; colorIds?:string[]; sizeOptions?:number[]; tags?:string[]; estimatedMinutes?:number; estimatedGrams?:number };
export type Material = { id: string; name: string; description: string; descriptionAr: string; cost: number; density: number; stock: number; threshold: number; available: boolean; colors: string[]; brand?:string; swatches?:{id:string;name:string;ar:string;hex:string}[] };
export const printer = {name:'Ender-3 V3 SE',buildVolume:[220,220,250] as [number,number,number],nozzle:.4,filament:1.75};
/** Print-only selling policy in SAR. Quantity discounts are applied to the production subtotal before the minimum floor. */
export const pricingPolicy = {perGram:.55,perHour:3.5,minimum:39,finishing:20,quantityDiscounts:[{min:10,rate:.15},{min:5,rate:.10},{min:2,rate:.05}]};
/** Supplier observations, not the owner's purchase invoices; SAR/kg. */
export const filamentMarketCosts = {red:89,blue:87,grey:87,black:87,white:87,transparent:89,yellow:87,green:87};
export const colors = [
 { id:'red',name:'Red',ar:'أحمر',hex:'#c83b38' },
 { id:'blue',name:'Blue',ar:'أزرق',hex:'#326bbb' },
 { id:'grey',name:'Grey',ar:'رمادي',hex:'#96999d' },
 { id:'black',name:'Black',ar:'أسود',hex:'#292d32' },
 { id:'white',name:'White',ar:'أبيض',hex:'#f2f1ea' },
 { id:'transparent',name:'Transparent',ar:'شفاف',hex:'#d3e2e2' },
 { id:'yellow',name:'Yellow',ar:'أصفر',hex:'#eab308' },
 { id:'green',name:'Green',ar:'أخضر',hex:'#2fa44f' },
];
export const products: Product[] = [
 {id:'ripple-vase',name:'The Ripple Vase',nameAr:'مزهرية ريبل',category:'Room',kind:'vase',price:79,dimensions:[105,105,160],estimatedGrams:102,estimatedMinutes:347,description:'A little sculpture for your everyday space. A twisting silhouette with a satisfyingly tactile finish. Designed for dried stems; use a liner for water.',descriptionAr:'قطعة منحوتة لمساحتك اليومية، بشكل ملتف ولمسة ملموسة. مناسبة للزهور المجففة؛ استخدم بطانة للماء.',color:'blue',available:true,featured:true},
 {id:'orbit-planter',name:'Orbit Planter',nameAr:'حوض أوربت',category:'Room',kind:'planter',price:159,dimensions:[110,110,86],estimatedGrams:209,estimatedMinutes:711,description:'A sculptural home for your small plants. Use an inner nursery pot and remove it for watering.',descriptionAr:'منزل منحوت لنباتاتك الصغيرة. استخدم أصيصًا داخليًا وأخرجه عند الري.',color:'grey',available:true,featured:true},
 {id:'wave-tray',name:'Wave Catchall',nameAr:'صينية ويف',category:'Desk setup',kind:'tray',price:39,dimensions:[150,95,17],estimatedGrams:48,estimatedMinutes:163,description:'Give your keys, earbuds and little things a place to land.',descriptionAr:'مكان مرتب للمفاتيح والسماعات وأغراضك الصغيرة.',color:'red',available:true,featured:true},
 {id:'arch-stand',name:'Arch Phone Stand',nameAr:'حامل آرتش',category:'Useful',kind:'stand',price:119,dimensions:[100,105,93],estimatedGrams:158,estimatedMinutes:537,description:'A quiet spot for your screen. Made to keep your desk a little clearer.',descriptionAr:'مكان بسيط لشاشتك يساعدك على ترتيب مكتبك.',color:'blue',available:true,featured:true},
 {id:'desk-organizer',name:'Loop Organizer',nameAr:'منظم لوب',category:'Desk setup',kind:'organizer',price:129,dimensions:[130,62,68],estimatedGrams:167,estimatedMinutes:568,description:'Pens, brushes, cables. Your desk essentials, in one place.',descriptionAr:'أقلام وفرش وأسلاك. أدوات مكتبك في مكان واحد.',color:'white',available:true,featured:false},
 {id:'ripple-shade',name:'Ripple Shade',nameAr:'غطاء ريبل',category:'Room',kind:'lamp',price:159,dimensions:[150,150,164],estimatedGrams:211,estimatedMinutes:717,description:'A sculptural decorative shade. Use with cool LED lighting only; electrical parts are not included.',descriptionAr:'غطاء إضاءة زخرفي منحوت. استخدم إضاءة LED باردة فقط؛ الأجزاء الكهربائية غير مشمولة.',color:'white',available:true,featured:false},
];
export const materials: Material[] = [
 {id:'pla',name:'PLA',description:'Crisp detail. A natural satin finish.',descriptionAr:'تفاصيل واضحة ولمسة ساتان طبيعية.',cost:89,density:1.24,stock:4.5,threshold:1,available:true,colors:colors.map(c=>c.id),brand:'PLA · 1.75 mm'},
];
export const qualityOptions = [{id:'fast',name:'Fast',ar:'سريع',layer:.28,multiplier:.8},{id:'standard',name:'Standard',ar:'قياسي',layer:.2,multiplier:1},{id:'smooth',name:'Smooth',ar:'ناعم',layer:.16,multiplier:1.25},{id:'detail',name:'Detail',ar:'دقيق',layer:.12,multiplier:1.6}];
export const stages = ['awaiting_payment','pending','reviewed','queued','printing','finishing','ready','completed'] as const;
export const defaultConfig = {size:100,material:'pla',color:'blue',quality:'standard',quantity:1,strength:'everyday',supports:'auto',finishing:'none'};
export type PrintConfig = typeof defaultConfig;

export function productMaterials(product:Product|undefined,materials:Material[]){return materials.filter(m=>m.available&&(!product?.materialIds?.length||product.materialIds.includes(m.id))).map(m=>({...m,colors:m.colors.filter(c=>!product?.colorIds?.length||product.colorIds.includes(c))})).filter(m=>m.colors.length>0)}
export function productConfig(product:Product,materials:Material[]):PrintConfig{const allowed=productMaterials(product,materials);const material=allowed.find(m=>m.id==='pla')??allowed[0];const sizes=product.sizeOptions?.length?product.sizeOptions:[75,100,125];return{...defaultConfig,size:sizes.includes(100)?100:sizes[0],material:material?.id??'pla',color:material?.colors.includes(product.color)?product.color:material?.colors[0]??product.color}}

/** Axis-specific fitting: native model coordinates are X/Y/Z; Z is the print height. */
export function maximumPrintScale(dimensions:number[]){return Math.floor(Math.min(...dimensions.map((d,i)=>printer.buildVolume[i]/d))*100)}
export function fitsPrinter(dimensions:number[],scale=100){return dimensions.every((d,i)=>Number.isFinite(d)&&d>0&&d*scale/100<=printer.buildVolume[i]+.001)}
export function productStats(product:Product){return {dimensions:product.dimensions,volume:product.dimensions.reduce((a,b)=>a*b,1)*.19,triangles:0}}

export const legacyColorIds:Record<string,string>={cloud:'white',sea:'blue',sage:'grey',coral:'red',charcoal:'black'};
export function normalizeCatalogProduct(p:Product){const old=!!legacyColorIds[p.color];return {...p,color:legacyColorIds[p.color]??p.color,colorIds:p.colorIds?.map(c=>legacyColorIds[c]??c),dimensions:old&&!p.modelId&&products.some(initial=>initial.id===p.id)?[p.dimensions[0],p.dimensions[2],p.dimensions[1]] as Product['dimensions']:p.dimensions,...(old&&p.modelId?{estimatedGrams:undefined,estimatedMinutes:undefined}:{})}}
export function normalizeCatalogMaterial(m:Material){return {...m,colors:[...new Set(m.colors.map(c=>legacyColorIds[c]??c))],swatches:m.swatches?.map(c=>{const id=legacyColorIds[c.id];return id?(colors.find(stock=>stock.id===id)??{...c,id}):c})}}
