let cfEnv: any = {};
try {
  // @ts-ignore
  cfEnv = (await import('cloudflare:workers')).env;
} catch {}
import {cookies,headers} from 'next/headers';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {products,materials,qualityOptions,normalizeCatalogProduct,normalizeCatalogMaterial,type Product,type Material} from './catalog';
export const runtime=new Proxy({} as any, {
  get(_target, prop: string) {
    if (cfEnv && cfEnv[prop]) return cfEnv[prop];
    if (typeof process !== 'undefined' && process.env && process.env[prop]) return process.env[prop];
    return undefined;
  }
}) as {DB:D1Database;BUCKET:R2Bucket;STUDIO_ADMIN_EMAIL?:string;SLICER_URL?:string;SLICER_TOKEN?:string;SLICER_PROFILE_REVISION?:string;LOCAL_ADMIN_EMAIL?:string};
export function db(){if(!runtime.DB)throw new Error('The studio is temporarily unavailable. Please try again.');return runtime.DB}
export function digest(s:string){return createHash('sha256').update(s).digest('hex')}
export function secret(){return randomBytes(32).toString('hex')}
export function equal(a:string,b:string){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b))}
export async function owner(create=true){const jar=await cookies();let key=jar.get('forma-session')?.value;if(!key||!/^[a-f0-9]{64}$/.test(key)){if(!create)return '';key=secret();jar.set('forma-session',key,{httpOnly:true,secure:(await headers()).get('x-forwarded-proto')==='https',sameSite:'lax',path:'/',maxAge:60*60*24*30});}return digest(key)}
export async function isAdmin(){try{const {getCurrentUser}=await import('./auth');const user=await getCurrentUser();if(user&&user.role==='admin')return true;}catch{}const h=await headers();const email=h.get('oai-authenticated-user-email');return !!email&&((!!runtime.STUDIO_ADMIN_EMAIL&&email.toLowerCase()===runtime.STUDIO_ADMIN_EMAIL.toLowerCase())||(!!runtime.LOCAL_ADMIN_EMAIL&&email.toLowerCase()===runtime.LOCAL_ADMIN_EMAIL.toLowerCase()));}
export async function requireAdmin(){if(!await isAdmin())throw new ApiError('Studio access is restricted to the owner.',403)}
export class ApiError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}
export function responseError(error:unknown){const status=error instanceof ApiError?error.status:400;console.error('Forma3D request:',error instanceof Error?error.message:'Unexpected error');return Response.json({error:error instanceof Error?error.message:'Something went wrong. Try again.'},{status})}
export async function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ApiError('Please use the Forma3D website to place your request.',403)}
export async function rateLimit(scope:string,max:number,seconds:number){const h=await headers();const ip=h.get('cf-connecting-ip')??h.get('x-forwarded-for')??'local';const period=Math.floor(Date.now()/1000/seconds);const id=digest(scope+ip)+':'+period;const row=await db().prepare('INSERT INTO limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,(period+1)*seconds).first<{count:number}>();if((row?.count??0)>max)throw new ApiError('A few too many requests. Try again in a minute.',429);if(period%10===0)await db().prepare('DELETE FROM limits WHERE expires < ?').bind(Math.floor(Date.now()/1000)).run()}
export async function getCatalog(){const rows=await db().prepare('SELECT id,data,type FROM catalog').all<{id:string;data:string;type:string}>();const saved=new Map(rows.results.map(r=>[r.id,JSON.parse(r.data)]));const productRows:Product[]=products.map(p=>saved.get('product:'+p.id)??p);for(const r of rows.results)if(r.type==='product'&&!products.some(p=>'product:'+p.id===r.id))productRows.push(JSON.parse(r.data));const materialRows:Material[]=materials.map(m=>saved.get('material:'+m.id)??m);for(const r of rows.results)if(r.type==='material'&&!materials.some(m=>'material:'+m.id===r.id))materialRows.push(JSON.parse(r.data));const categories=saved.get('categories')??['All','Desk setup','Room','Useful','Gifts','Miniatures'];const normalized=productRows.map(normalizeCatalogProduct);const modelIds=[...new Set(normalized.flatMap(p=>p.modelId?[p.modelId]:[]))];const modelDimensions=new Map<string,Product['dimensions']>();for(let offset=0;offset<modelIds.length;offset+=80){const group=modelIds.slice(offset,offset+80);const modelRows=await db().prepare('SELECT id,stats FROM uploads WHERE id IN ('+group.map(()=>'?').join(',')+')').bind(...group).all<{id:string;stats:string}>();for(const row of modelRows.results)modelDimensions.set(row.id,JSON.parse(row.stats).dimensions)}return{products:normalized.map(p=>p.modelId&&modelDimensions.has(p.modelId)?{...p,dimensions:modelDimensions.get(p.modelId)!}:p),materials:materialRows.map(normalizeCatalogMaterial),categories,profiles:(saved.get('profiles')??qualityOptions) as typeof qualityOptions,slicingAvailable:!!runtime.SLICER_URL}}

export async function boundedForm(request:Request,maxBytes:number){const reader=request.body?.getReader();if(!reader)throw new ApiError('Choose a file.');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new ApiError('Choose a model smaller than 15 MB.',413)}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const safe=new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:bytes});return safe.formData();}
