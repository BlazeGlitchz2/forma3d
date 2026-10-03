import {defaultConfig,qualityOptions,fitsPrinter,pricingPolicy,type PrintConfig,type Product,type Material} from './catalog.ts';
export type Stats={dimensions:[number,number,number];volume:number;triangles:number};
export type Item={productId?:string;uploadId?:string;name:string;config:PrintConfig};
export type Quote={total:number;grams:number;minutes:number;source:'estimate'|'slicer';breakdown:{setup:number;material:number;machine:number;support:number;finishing:number;delivery:number};config:PrintConfig;dimensions:number[]};
export class InsufficientStockError extends Error{constructor(message='Not enough filament for this quantity. Choose fewer prints or another material.'){super(message);this.name='InsufficientStockError'}}
export function requireMaterialStock(material:Material,totalGrams:number){if(!Number.isFinite(totalGrams)||totalGrams<=0)throw new Error('The print analysis returned invalid results.');if(totalGrams/1000>material.stock)throw new InsufficientStockError()}
/** Quote grams already include the selected quantity and any support allowance. */
export function validateOrderStock(quotes:Quote[],materials:Material[]){const totals=new Map<string,number>();for(const quote of quotes){if(!Number.isFinite(quote.grams)||quote.grams<=0)throw new Error('The print analysis returned invalid results.');totals.set(quote.config.material,(totals.get(quote.config.material)??0)+quote.grams)}for(const [id,grams] of totals){const material=materials.find(m=>m.id===id&&m.available);if(!material)throw new Error('Choose an available material.');try{requireMaterialStock(material,grams)}catch(error){if(error instanceof InsufficientStockError)throw new InsufficientStockError('Not enough '+material.name+' filament for this order. Choose fewer prints or another material.');throw error}}}
export function validateConfig(value:unknown):PrintConfig{
 const o=value as Partial<PrintConfig>;if(!o||typeof o!=='object')throw new Error('Choose your print options.');const c={...defaultConfig,...o};
 if(!Number.isInteger(c.size)||c.size<10||c.size>300)throw new Error('Size must be between 10% and 300%.');
 if(!Number.isInteger(c.quantity)||c.quantity<1||c.quantity>20)throw new Error('Choose between 1 and 20 prints.');
 if(!qualityOptions.some(q=>q.id===c.quality)||!['light','everyday','strong','solid'].includes(c.strength)||!['auto','none'].includes(c.supports)||!['none','sanded'].includes(c.finishing))throw new Error('Choose valid print options.');return c;
}
export function normalizePhone(input:string):string{const digits=input.replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^0-9]/g,'');const national=digits.replace(/^(00966|966)/,'');const normalized=national.startsWith('0')?national.slice(1):national;if(!/^5\d{8}$/.test(normalized))throw new Error('Enter a Saudi mobile number, for example 050 123 4567.');return '+966'+normalized;}
export function calculateQuote(config:PrintConfig,material:Material,stats:Stats,product?:Product,fulfillment='pickup',sliced?:{grams:number;minutes:number},profiles=qualityOptions,options:{checkStock?:boolean}={}):Quote{
 if(fulfillment!=='pickup')throw new Error('Orders are pickup only. Choose a local meeting point.');
 const c=validateConfig(config);if(!material.available||material.id!==c.material||!material.colors.includes(c.color))throw new Error('This material or color is not available.');
 const dimensions=stats.dimensions.map(d=>Math.round(d*c.size/100*10)/10);if(!fitsPrinter(stats.dimensions,c.size))throw new Error('This size exceeds the Ender-3 V3 SE build area (220 × 220 × 250 mm). Scale it down to continue.');
 if(sliced&&(!Number.isFinite(sliced.grams)||!Number.isFinite(sliced.minutes)||sliced.grams<=0||sliced.minutes<=0))throw new Error('The print analysis returned invalid results.');
 const strength={light:.12,everyday:.2,strong:.4,solid:1}[c.strength as 'light'];const quality=profiles.find(q=>q.id===c.quality);if(!quality||quality.layer<.1||quality.layer>.32)throw new Error('Choose a quality profile for the Ender-3 V3 SE 0.4 mm nozzle.');const volume=stats.volume*Math.pow(c.size/100,3);const strengthRatio=Math.pow(strength/.2,.2);
 const baseGrams=sliced?.grams??Math.max(3,product?.estimatedGrams?product.estimatedGrams*Math.pow(c.size/100,3)*strengthRatio:volume/1000*material.density*(.24+strength*.76));
 const supportGrams=!sliced&&!product&&c.supports==='auto'?baseGrams*.1:0;const grams=baseGrams+supportGrams;
 const minutes=sliced?.minutes??(product?.estimatedMinutes?product.estimatedMinutes*Math.pow(c.size/100,3)*quality.multiplier*strengthRatio:Math.max(15,grams*3.4*quality.multiplier));if(!Number.isFinite(grams)||!Number.isFinite(minutes)||grams<=0||minutes<=0||grams>10000||minutes>100000)throw new Error('The print analysis returned invalid results.');
 if(options.checkStock!==false)requireMaterialStock(material,grams*c.quantity);
 const breakdown={setup:0,material:Math.round(baseGrams*pricingPolicy.perGram*100)/100,machine:Math.round(minutes/60*pricingPolicy.perHour*100)/100,support:Math.round(supportGrams*pricingPolicy.perGram*100)/100,finishing:c.finishing==='sanded'?pricingPolicy.finishing:0,delivery:0};
 const custom=Math.max(pricingPolicy.minimum,(breakdown.material+breakdown.machine+breakdown.support)*c.quantity)+breakdown.finishing*c.quantity+breakdown.delivery;
 // Catalog base prices are editable studio prices; generated defaults use the researched selling policy.
 const catalog=product?Math.max(pricingPolicy.minimum,(product.price*Math.pow(c.size/100,3)*(material.id==='petg'?1.18:1)*quality.multiplier*({light:.95,everyday:1,strong:1.15,solid:1.45}[c.strength as 'light']??1))*c.quantity)+breakdown.finishing*c.quantity+breakdown.delivery:custom;
 return{total:Math.round(catalog*100)/100,grams:Math.round(grams*c.quantity*10)/10,minutes:Math.round(minutes*c.quantity),source:sliced?'slicer':'estimate',breakdown,config:c,dimensions};
}
