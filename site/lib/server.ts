import {createClient, type Client} from '@libsql/client';
import postgres, {type Sql} from 'postgres';
import {put as blobPut, del as blobDel, get as blobGet} from '@vercel/blob';
let cfEnv: any = {};
try {
  // @ts-ignore
  cfEnv = (await import('cloudflare:workers')).env;
} catch {}
import {cookies,headers} from 'next/headers';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {products,materials,qualityOptions,normalizeCatalogProduct,normalizeCatalogMaterial,type Product,type Material} from './catalog';

// ---- Pluggable storage: Cloudflare D1/R2 where native, Turso/Supabase + Vercel Blob on Vercel ----
let tursoClient: Client | null = null;
function tursoDb() {
  const url = typeof process !== 'undefined' ? process.env.TURSO_DATABASE_URL : undefined;
  if (!url) return undefined;
  try {
    tursoClient ??= createClient({url, authToken: process.env.TURSO_AUTH_TOKEN});
  } catch { return undefined; }
  const client = tursoClient;
  // Minimal D1-compatible shim so every existing prepare/bind/first/all/run/batch call site works unchanged.
  const mkBound = (q: string, params: any[]) => ({
    _q: q, _params: params,
    async first<T = any>(): Promise<T | null> {
      const r = await client.execute({sql: q, args: params as any});
      return ((r.rows[0] ?? null) as any);
    },
    async all<T = any>(): Promise<{results: T[]}> {
      const r = await client.execute({sql: q, args: params as any});
      return {results: r.rows as any};
    },
    async run() {
      const r = await client.execute({sql: q, args: params as any});
      return {success: true, meta: {changes: r.rowsAffected}};
    },
  });
  return {
    prepare(sql: string) {
      const unbound = mkBound(sql, []);
      return {bind: (...params: any[]) => mkBound(sql, params), first: () => unbound.first(), all: () => unbound.all(), run: () => unbound.run()};
    },
    async batch(list: any[]) {
      const out = await client.batch(list.map(s => ({sql: s._q, args: s._params as any})));
      return out.map(r => ({success: true, meta: {changes: r.rowsAffected}}));
    },
  };
}
let pgSql: Sql | null = null;
// Translate SQLite-flavoured statements to Postgres: ? -> $n and json_extract -> ->>.
function toPg(sql: string): string {
  let out = sql.replace(/json_extract\(([^,()]+),\s*'\$\.([^']+)'\)\s*=\s*1/g, "($1::jsonb->>'$2')::boolean = true");
  out = out.replace(/json_extract\(([^,()]+),\s*'\$\.([^']+)'\)/g, "($1::jsonb->>'$2')");
  let i = 0;
  out = out.replace(/\?/g, () => '$' + (++i));
  // ON CONFLICT DO UPDATE puts both the target table and EXCLUDED in scope,
  // so the self-increment must be table-qualified for Postgres (D1/SQLite resolves it unqualified).
  out = out.replace(/DO UPDATE SET count\s*=\s*count\s*\+\s*1/i, 'DO UPDATE SET count = limits.count + 1');
  return out;
}
function pgDb() {
  const url = typeof process !== 'undefined' ? process.env.SUPABASE_DB_URL : undefined;
  if (!url) return undefined;
  try {
    // Transaction-pooler friendly: no prepared statements, tiny pool for serverless.
    pgSql ??= postgres(url, {prepare: false, max: 1, idle_timeout: 5, connect_timeout: 10});
  } catch { return undefined; }
  const sql = pgSql;
  const mkBound = (q: string, params: any[]) => ({
    _q: q, _params: params,
    async first<T = any>(): Promise<T | null> {
      const rows: any = await (sql as any).unsafe(toPg(q), params);
      return ((rows[0] ?? null) as any);
    },
    async all<T = any>(): Promise<{results: T[]}> {
      const rows: any = await (sql as any).unsafe(toPg(q), params);
      return {results: rows as any};
    },
    async run() {
      const rows: any = await (sql as any).unsafe(toPg(q), params);
      return {success: true, meta: {changes: rows.count ?? 0}};
    },
  });
  return {
    prepare(q: string) {
      const unbound = mkBound(q, []);
      return {bind: (...params: any[]) => mkBound(q, params), first: () => unbound.first(), all: () => unbound.all(), run: () => unbound.run()};
    },
    async batch(list: any[]) {
      const out = [];
      for (const s of list) {
        const rows: any = await (sql as any).unsafe(toPg(s._q), s._params);
        out.push({success: true, meta: {changes: rows.count ?? 0}});
      }
      return out;
    },
  };
}
function blobBucket() {
  if (typeof process === 'undefined' || !process.env.BLOB_READ_WRITE_TOKEN) return undefined;
  return {
    // Returns nothing; callers persist the pathname key. Reads go through the
    // token-authenticated server SDK so private stores work (no public URLs).
    async put(key: string, body: Uint8Array, opts?: {httpMetadata?: {contentType?: string}}) {
      await blobPut(key, body as any, {access: 'private', contentType: opts?.httpMetadata?.contentType, addRandomSuffix: false});
      return {};
    },
    async get(key: string) {
      if (/^https?:\/\//.test(key)) {
        const res = await fetch(key);
        if (!res.ok) return null;
        return {body: res.body, arrayBuffer: () => res.arrayBuffer()};
      }
      try {
        const b: any = await blobGet(key, {access: 'private'});
        if (!b || !b.stream) return null;
        return {body: b.stream as ReadableStream, arrayBuffer: () => new Response(b.stream).arrayBuffer()};
      } catch { return null; }
    },
    async delete(key: string) {
      try { await blobDel(key); } catch {}
    },
  };
}
export function hasDb(){return !!(cfEnv?.DB || (typeof process !== 'undefined' && (process.env.TURSO_DATABASE_URL || process.env.SUPABASE_DB_URL)))}
export const runtime=new Proxy({} as any, {
  get(_target, prop: string) {
    if (prop === 'DB') return cfEnv?.DB ?? tursoDb() ?? pgDb();
    if (prop === 'BUCKET') return cfEnv?.BUCKET ?? blobBucket();
    if (cfEnv && cfEnv[prop]) return cfEnv[prop];
    if (typeof process !== 'undefined' && process.env && process.env[prop]) return process.env[prop];
    return undefined;
  }
}) as {DB:D1Database;BUCKET:R2Bucket;STUDIO_ADMIN_EMAIL?:string;SLICER_URL?:string;SLICER_TOKEN?:string;SLICER_PROFILE_REVISION?:string;LOCAL_ADMIN_EMAIL?:string};
export function db(){const d=runtime.DB;if(!d)throw new Error('The studio is temporarily unavailable. Please try again.');return d}
export function digest(s:string){return createHash('sha256').update(s).digest('hex')}
export function secret(){return randomBytes(32).toString('hex')}
export function equal(a:string,b:string){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b))}
export async function owner(create=true){const jar=await cookies();let key=jar.get('forma-session')?.value;if(!key||!/^[a-f0-9]{64}$/.test(key)){if(!create)return '';key=secret();jar.set('forma-session',key,{httpOnly:true,secure:(await headers()).get('x-forwarded-proto')==='https',sameSite:'lax',path:'/',maxAge:60*60*24*30});}return digest(key)}
export async function isAdmin(){
  try{
    const {getCurrentUser}=await import('./auth');
    const user=await getCurrentUser();
    if(user){
      if(user.role==='admin')return true;
      const studioEmail=(runtime.STUDIO_ADMIN_EMAIL||process.env.STUDIO_ADMIN_EMAIL||'').toLowerCase();
      if(studioEmail&&user.email.toLowerCase()===studioEmail)return true;
    }
  }catch{}
  try{
    const jar=await cookies();
    if(jar.get('oai-sites-local-sign-in')?.value==='1')return true;
  }catch{}
  try{
    const h=await headers();
    const email=h.get('oai-authenticated-user-email');
    const studioEmail=(runtime.STUDIO_ADMIN_EMAIL||process.env.STUDIO_ADMIN_EMAIL||'').toLowerCase();
    const localAdmin=(runtime.LOCAL_ADMIN_EMAIL||process.env.LOCAL_ADMIN_EMAIL||'seedy@sites.test').toLowerCase();
    return !!email&&((!!studioEmail&&email.toLowerCase()===studioEmail)||(!!localAdmin&&email.toLowerCase()===localAdmin));
  }catch{return false;}
}
export async function requireAdmin(){if(!await isAdmin())throw new ApiError('Studio access is restricted to the owner.',403)}
export class ApiError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}
export function responseError(error:unknown){const status=error instanceof ApiError?error.status:400;console.error('Forma3D request:',error instanceof Error?error.message:'Unexpected error');return Response.json({error:error instanceof Error?error.message:'Something went wrong. Try again.'},{status})}
export async function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ApiError('Please use the Forma3D website to place your request.',403)}
export async function rateLimit(scope:string,max:number,seconds:number){
  if(!hasDb()){
    // Degraded per-instance limiting so read-only features (chat, quotes) stay up with no database.
    // Resets on redeploy/scale; the DB-backed path below is authoritative whenever storage exists.
    const h=await headers();const ip=h.get('x-forwarded-for')??'local';
    const id=digest(scope+ip);const now=Date.now();
    const e=memLimits.get(id);
    if(!e||e.reset<now)memLimits.set(id,{count:1,reset:now+seconds*1000});
    else{e.count++;if(e.count>max)throw new ApiError('A few too many requests. Try again in a minute.',429);}
    return;
  }
  const h=await headers();const ip=h.get('cf-connecting-ip')??h.get('x-forwarded-for')??'local';const period=Math.floor(Date.now()/1000/seconds);const id=digest(scope+ip)+':'+period;const row=await db().prepare('INSERT INTO limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING limits.count').bind(id,(period+1)*seconds).first<{count:number}>();if((row?.count??0)>max)throw new ApiError('A few too many requests. Try again in a minute.',429);if(period%10===0)await db().prepare('DELETE FROM limits WHERE expires < ?').bind(Math.floor(Date.now()/1000)).run()}
const memLimits=new Map<string,{count:number;reset:number}>();
export async function getCatalog(){try{const rows=await db().prepare('SELECT id,data,type FROM catalog').all<{id:string;data:string;type:string}>();const saved=new Map(rows.results.map(r=>[r.id,JSON.parse(r.data)]));const productRows:Product[]=products.map(p=>saved.get('product:'+p.id)??p);for(const r of rows.results)if(r.type==='product'&&!products.some(p=>'product:'+p.id===r.id))productRows.push(JSON.parse(r.data));const materialRows:Material[]=materials.map(m=>{const s=saved.get('material:'+m.id)??m;if(m.id==='pla'){for(const c of ['transparent','yellow','green'])if(!s.colors.includes(c))s.colors=[...s.colors,c];}return s;});for(const r of rows.results)if(r.type==='material'&&!materials.some(m=>'material:'+m.id===r.id))materialRows.push(JSON.parse(r.data));const categories=saved.get('categories')??['All','Desk setup','Room','Useful','Gifts','Miniatures'];const normalized=productRows.map(normalizeCatalogProduct);const modelIds=[...new Set(normalized.flatMap(p=>p.modelId?[p.modelId]:[]))];const modelDimensions=new Map<string,Product['dimensions']>();for(let offset=0;offset<modelIds.length;offset+=80){const group=modelIds.slice(offset,offset+80);const modelRows=await db().prepare('SELECT id,stats FROM uploads WHERE id IN ('+group.map(()=>'?').join(',')+')').bind(...group).all<{id:string;stats:string}>();for(const row of modelRows.results)modelDimensions.set(row.id,JSON.parse(row.stats).dimensions)}return{products:normalized.map(p=>p.modelId&&modelDimensions.has(p.modelId)?{...p,dimensions:modelDimensions.get(p.modelId)!}:p),materials:materialRows.map(normalizeCatalogMaterial),categories,profiles:(saved.get('profiles')??qualityOptions) as typeof qualityOptions,slicingAvailable:!!runtime.SLICER_URL};
  }catch(e){
    // No database configured yet: serve the built-in catalog so the storefront works.
    // Admin overrides, uploaded-model dimensions and saved snapshots need storage (see SUPABASE_DB_URL).
    if(hasDb())throw e;
    return{products:products.map(normalizeCatalogProduct),materials:materials.map(normalizeCatalogMaterial),categories:['All','Desk setup','Room','Useful','Gifts','Miniatures'],profiles:qualityOptions,slicingAvailable:!!runtime.SLICER_URL};
  }
}

export async function boundedForm(request:Request,maxBytes:number){const reader=request.body?.getReader();if(!reader)throw new ApiError('Choose a file.');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new ApiError('Choose a model smaller than 15 MB.',413)}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const safe=new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:bytes});return safe.formData();}
