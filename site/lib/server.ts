import {createClient, type Client} from '@libsql/client';
import postgres, {type Sql} from 'postgres';
import {put as blobPut, del as blobDel, get as blobGet} from '@vercel/blob';
type CloudflareBindings = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  STUDIO_ADMIN_EMAIL?: string;
  SLICER_URL?: string;
  SLICER_TOKEN?: string;
  SLICER_PROFILE_REVISION?: string;
  LOCAL_ADMIN_EMAIL?: string;
  [key: string]: unknown;
};
let cfEnv: CloudflareBindings = {};
try {
  // "cloudflare:workers" is only resolvable under workerd / vinext at runtime;
  // @cloudflare/workers-types declares the module, so no ts-ignore is needed.
  cfEnv = (await import('cloudflare:workers')).env as CloudflareBindings;
} catch {}
import {cookies,headers} from 'next/headers';
import {studioOperatorHash} from './studio-operators.ts';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {products,materials,qualityOptions,normalizeCatalogProduct,normalizeCatalogMaterial,type Product,type Material} from './catalog';

// Local row/param shapes shared by the Turso and Postgres D1-compatibility shims.
type SqlParam = string | number | boolean | Date | Uint8Array | null;
type BoundStatement = {
  _q: string;
  _params: SqlParam[];
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{results: T[]}>;
  run(): Promise<{success: boolean; meta: {changes: number}}>;
};

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
  const mkBound = (q: string, params: SqlParam[]): BoundStatement => ({
    _q: q, _params: params,
    async first<T = unknown>(): Promise<T | null> {
      const r = await client.execute({sql: q, args: params});
      return ((r.rows[0] ?? null) as unknown as T);
    },
    async all<T = unknown>(): Promise<{results: T[]}> {
      const r = await client.execute({sql: q, args: params});
      return {results: r.rows as unknown as T[]};
    },
    async run() {
      const r = await client.execute({sql: q, args: params});
      return {success: true, meta: {changes: r.rowsAffected}};
    },
  });
  return {
    prepare(sql: string) {
      const unbound = mkBound(sql, []);
      return {bind: (...params: SqlParam[]) => mkBound(sql, params), first: () => unbound.first(), all: () => unbound.all(), run: () => unbound.run()};
    },
    async batch(list: BoundStatement[]) {
      const out = await client.batch(list.map(s => ({sql: s._q, args: s._params})));
      return out.map(r => ({success: true, meta: {changes: r.rowsAffected}}));
    },
  };
}
let pgSql: Sql | null = null;
let pgLastActivity = 0;
// postgres.js has no per-query deadline. Supabase's pooler can leave a socket
// stalled (or a serverless instance can wake holding a socket the pooler already
// dropped), which previously hung the invocation until Vercel killed it at 300s.
// Bound every statement and recycle the connection on any stall.
const PG_QUERY_TIMEOUT_MS = 10_000;
const PG_PREFLIGHT_TIMEOUT_MS = 4_000;
const PG_STALE_AFTER_MS = 15_000;
class PgTimeoutError extends Error {}
function recyclePg(reason?: unknown) {
  const client = pgSql;
  pgSql = null;
  pgLastActivity = 0;
  if (!client) return;
  if (reason) console.error('Forma3D pg recycle:', reason instanceof Error ? reason.message : reason);
  try {
    // Never wait on a possibly-stuck socket: ending the client rejects anything
    // still queued on it, and the next request dials a fresh connection.
    void client.end({timeout: 1});
  } catch {}
}
function pgClient(): Sql | undefined {
  const url = typeof process !== 'undefined' ? process.env.SUPABASE_DB_URL : undefined;
  if (!url) return undefined;
  if (!pgSql) {
    try {
      // Transaction-pooler friendly: no prepared statements, tiny pool for serverless.
      // max_lifetime/keep_alive cycle sockets so they cannot rot indefinitely.
      pgSql = postgres(url, {prepare: false, max: 1, idle_timeout: 5, max_lifetime: 60 * 10, connect_timeout: 10, keep_alive: 30});
      pgLastActivity = 0;
    } catch { return undefined; }
  }
  return pgSql;
}
function withPgTimeout<T>(pending: PromiseLike<T> & {cancel?: (() => void) | undefined}, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try { pending.cancel?.(); } catch {}
      reject(new PgTimeoutError('The studio database did not answer in time.'));
    }, timeoutMs);
  });
  return Promise.race([pending, expired]).finally(() => { if (timer) clearTimeout(timer); });
}
// Connection-level failures mean the statement never ran, so they are safe to
// report as "try again" instead of surfacing raw driver errors.
function isPgConnectionError(error: unknown): boolean {
  const code = (error as {code?: unknown} | null)?.code;
  if (typeof code === 'string' && /^(08\d{3}|57P0[123]|CONNECT_TIMEOUT|ECONNRESET|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EPIPE|ETIMEDOUT)$/.test(code)) return true;
  const message = error instanceof Error ? error.message : '';
  return /connection (terminated|closed|refused)|socket hang ?up|connection timeout/i.test(message);
}
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
  if (typeof process === 'undefined' || !process.env.SUPABASE_DB_URL) return undefined;
  // postgres.unsafe resolves to the row array; write statements also expose a
  // numeric `count`, which the shim maps onto the D1 `meta.changes` field.
  type PgRows = Array<Record<string, unknown>> & {count?: number};
  const runQuery = async (q: string, params: SqlParam[]): Promise<PgRows> => {
    let client = pgClient();
    if (!client) throw new ApiError('The studio is temporarily unavailable. Please try again.', 503);
    // A frozen serverless instance can wake with a socket the pooler already
    // dropped; probe it first so stale connections are recycled instead of hanging.
    if (pgLastActivity && Date.now() - pgLastActivity > PG_STALE_AFTER_MS) {
      try {
        await withPgTimeout(client.unsafe('SELECT 1'), PG_PREFLIGHT_TIMEOUT_MS);
      } catch (error) {
        recyclePg(error);
        client = pgClient();
        if (!client) throw new ApiError('The studio is temporarily unavailable. Please try again.', 503);
      }
    }
    try {
      const rows = await withPgTimeout(client.unsafe(toPg(q), params), PG_QUERY_TIMEOUT_MS);
      pgLastActivity = Date.now();
      return rows as unknown as PgRows;
    } catch (error) {
      // Keep a poisoned connection out of the cache or every later request
      // queues behind the same dead socket.
      if (error instanceof PgTimeoutError || isPgConnectionError(error)) {
        recyclePg(error);
        throw new ApiError('The studio database is temporarily busy. Please try again in a moment.', 503);
      }
      throw error;
    }
  };
  const mkBound = (q: string, params: SqlParam[]): BoundStatement => ({
    _q: q, _params: params,
    async first<T = unknown>(): Promise<T | null> {
      const rows = await runQuery(q, params);
      return ((rows[0] ?? null) as unknown as T);
    },
    async all<T = unknown>(): Promise<{results: T[]}> {
      const rows = await runQuery(q, params);
      return {results: rows as unknown as T[]};
    },
    async run() {
      const rows = await runQuery(q, params);
      return {success: true, meta: {changes: rows.count ?? 0}};
    },
  });
  return {
    prepare(q: string) {
      const unbound = mkBound(q, []);
      return {bind: (...params: SqlParam[]) => mkBound(q, params), first: () => unbound.first(), all: () => unbound.all(), run: () => unbound.run()};
    },
    async batch(list: BoundStatement[]) {
      const out = [];
      for (const s of list) {
        const rows = await runQuery(s._q, s._params);
        out.push({success: true, meta: {changes: rows.count ?? 0}});
      }
      return out;
    },
  };
}
function blobBucket() {
  const token: string | undefined = (typeof process !== 'undefined' ? process.env.BLOB_READ_WRITE_TOKEN : undefined) ?? (cfEnv?.BLOB_READ_WRITE_TOKEN as string | undefined);
  if (!token) return undefined;
  return {
    // Returns nothing; callers persist the pathname key. Reads go through the
    // token-authenticated server SDK so private stores work (no public URLs).
    async put(key: string, body: Uint8Array, opts?: {httpMetadata?: {contentType?: string}}) {
      // Buffer is a Uint8Array subclass; the cast only satisfies @vercel/blob's PutBody union.
      await blobPut(key, body as unknown as Buffer, {access: 'private', contentType: opts?.httpMetadata?.contentType, addRandomSuffix: false, token});
      return {};
    },
    async get(key: string) {
      if (/^https?:\/\//.test(key)) {
        const res = await fetch(key);
        if (!res.ok) return null;
        return {body: res.body, arrayBuffer: () => res.arrayBuffer()};
      }
      try {
        const b = await blobGet(key, {access: 'private', token});
        if (!b || !b.stream) return null;
        return {body: b.stream as ReadableStream, arrayBuffer: () => new Response(b.stream).arrayBuffer()};
      } catch { return null; }
    },
    async delete(key: string) {
      try { await blobDel(key, {token}); } catch {}
    },
  };
}
export function hasDb(){return !!(cfEnv?.DB || (typeof process !== 'undefined' && (process.env.TURSO_DATABASE_URL || process.env.SUPABASE_DB_URL)))}
export const runtime=new Proxy({} as Record<string, unknown>, {
  get(_target, prop: string) {
    if (prop === 'DB') return cfEnv?.DB ?? tursoDb() ?? pgDb();
    if (prop === 'BUCKET') return cfEnv?.BUCKET ?? blobBucket();
    if (cfEnv && cfEnv[prop]) return cfEnv[prop];
    if (typeof process !== 'undefined' && process.env && process.env[prop]) return process.env[prop];
    return undefined;
  }
}) as {DB:D1Database;BUCKET:R2Bucket;STUDIO_ADMIN_EMAIL?:string;SLICER_URL?:string;SLICER_TOKEN?:string;SLICER_PROFILE_REVISION?:string;LOCAL_ADMIN_EMAIL?:string;BLOB_READ_WRITE_TOKEN?:string};
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
      if(studioOperatorHash(user.email))return true;
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
    return !!email&&((!!studioEmail&&email.toLowerCase()===studioEmail)||(!!localAdmin&&email.toLowerCase()===localAdmin)||!!studioOperatorHash(email));
  }catch{return false;}
}
export async function requireAdmin(){if(!await isAdmin())throw new ApiError('Studio access is restricted to the owner.',403)}
export class ApiError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}
export function responseError(error:unknown){const status=error instanceof ApiError?error.status:400;console.error('Forma3D request:',error instanceof Error?error.message:'Unexpected error');return Response.json({error:error instanceof Error?error.message:'Something went wrong. Try again.'},{status})}
export async function sameOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin)return;
  const reqUrl=new URL(request.url);
  if(origin===reqUrl.origin)return;
  try{
    const h=await headers();
    const host=h.get('x-forwarded-host')??h.get('host')??reqUrl.host;
    const proto=h.get('x-forwarded-proto')??reqUrl.protocol.replace(':','');
    if(origin===`${proto}://${host}`)return;
    const isLocal=(origin.includes('localhost')||origin.includes('127.0.0.1'))&&(reqUrl.hostname==='localhost'||reqUrl.hostname==='127.0.0.1'||host.includes('localhost')||host.includes('127.0.0.1'));
    if(isLocal)return;
  }catch{}
  throw new ApiError('Please use the Forma3D website to place your request.',403);
}
export async function rateLimit(scope:string,max:number,seconds:number){
  if(!hasDb()){
    // Degraded per-instance limiting so read-only features (chat, quotes) stay up with no database.
    // Resets on redeploy/scale; the DB-backed path below is authoritative whenever storage exists.
    const h=await headers();const ip=h.get('x-forwarded-for')??'local';
    const id=digest(scope+ip);const now=Date.now();
    const e=memLimits.get(id);
    if(!e||e.reset<now)memLimits.set(id,{count:1,reset:now+seconds*1000});
    else{e.count++;if(e.count>max)throw new ApiError('Too many attempts. Please wait a little and try again.',429);}
    return;
  }
  const h=await headers();const ip=h.get('cf-connecting-ip')??h.get('x-forwarded-for')??'local';const period=Math.floor(Date.now()/1000/seconds);const id=digest(scope+ip)+':'+period;const row=await db().prepare('INSERT INTO limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING limits.count').bind(id,(period+1)*seconds).first<{count:number}>();if((row?.count??0)>max)throw new ApiError('Too many attempts. Please wait a little and try again.',429);if(period%10===0)await db().prepare('DELETE FROM limits WHERE expires < ?').bind(Math.floor(Date.now()/1000)).run()}
const memLimits=new Map<string,{count:number;reset:number}>();
export async function getCatalog(){try{const rows=await db().prepare('SELECT id,data,type FROM catalog').all<{id:string;data:string;type:string}>();const saved=new Map(rows.results.map(r=>[r.id,JSON.parse(r.data)]));const productRows:Product[]=products.map(p=>saved.get('product:'+p.id)??p);for(const r of rows.results)if(r.type==='product'&&!products.some(p=>'product:'+p.id===r.id))productRows.push(JSON.parse(r.data));const materialRows:Material[]=materials.map(m=>{const s=saved.get('material:'+m.id)??m;if(m.id==='pla'){for(const c of ['transparent','yellow','green'])if(!s.colors.includes(c))s.colors=[...s.colors,c];}return s;});for(const r of rows.results)if(r.type==='material'&&!materials.some(m=>'material:'+m.id===r.id))materialRows.push(JSON.parse(r.data));const categories=saved.get('categories')??['All','Desk setup','Room','Useful','Gifts','Miniatures'];const normalized=productRows.map(normalizeCatalogProduct);const modelIds=[...new Set(normalized.flatMap(p=>p.modelId?[p.modelId]:[]))];const modelDimensions=new Map<string,Product['dimensions']>();for(let offset=0;offset<modelIds.length;offset+=80){const group=modelIds.slice(offset,offset+80);const modelRows=await db().prepare('SELECT id,stats FROM uploads WHERE id IN ('+group.map(()=>'?').join(',')+')').bind(...group).all<{id:string;stats:string}>();for(const row of modelRows.results)modelDimensions.set(row.id,JSON.parse(row.stats).dimensions)}return{products:normalized.map(p=>p.modelId&&modelDimensions.has(p.modelId)?{...p,dimensions:modelDimensions.get(p.modelId)!}:p),materials:materialRows.map(normalizeCatalogMaterial),categories,profiles:(saved.get('profiles')??qualityOptions) as typeof qualityOptions,slicingAvailable:!!runtime.SLICER_URL};
  }catch(e){
    // No database configured yet: serve the built-in catalog so the storefront works.
    // Admin overrides, uploaded-model dimensions and saved snapshots need storage (see SUPABASE_DB_URL).
    if(hasDb())throw e;
    return{products:products.map(normalizeCatalogProduct),materials:materials.map(normalizeCatalogMaterial),categories:['All','Desk setup','Room','Useful','Gifts','Miniatures'],profiles:qualityOptions,slicingAvailable:!!runtime.SLICER_URL};
  }
}

export async function boundedForm(request:Request,maxBytes:number){const reader=request.body?.getReader();if(!reader)throw new ApiError('Choose a file.');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new ApiError('Choose a file smaller than '+Math.max(1,Math.floor(maxBytes/(1024*1024)))+' MB.',413)}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const safe=new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:bytes});return safe.formData();}
