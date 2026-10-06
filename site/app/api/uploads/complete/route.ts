import {db,owner,runtime,secret,rateLimit,sameOrigin,responseError,ApiError} from '@/lib/server';
import {validateModel,MAX_FILE_BYTES} from '@/lib/model-validation';
import {MAX_FILE_LABEL} from '@/lib/upload-limits';

const PATHNAME=/^uploads\/[A-Za-z0-9._-]{1,160}\.(stl|3mf)$/i;

export async function POST(request:Request){
  try{
    await sameOrigin(request);
    await rateLimit('upload_finalize',20,3600);
    if(!runtime.BLOB_READ_WRITE_TOKEN)throw new ApiError('Direct uploads are not available.',501);
    const raw=await request.json() as {pathname?:unknown;name?:unknown};
    const pathname=typeof raw.pathname==='string'?raw.pathname.trim():'';
    const requested=typeof raw.name==='string'?raw.name.trim():'';
    if(!pathname||!requested)throw new ApiError('Choose a model file.');
    if(!PATHNAME.test(pathname))throw new ApiError('Choose an STL or 3MF file.');
    const object=await runtime.BUCKET.get(pathname);
    if(!object)throw new ApiError('This upload is unavailable. Try again.');
    const bytes=new Uint8Array(await object.arrayBuffer());
    if(!bytes.length||bytes.length>MAX_FILE_BYTES)throw new ApiError('Choose a model smaller than '+MAX_FILE_LABEL+'.',413);
    const extension=pathname.toLowerCase().endsWith('.3mf')?'.3mf':'.stl';
    const safeName=requested.replace(/\.(stl|3mf)$/i,'').replace(/[^\w. -]/g,'_').slice(0,110)+extension;
    const stats=validateModel(bytes,safeName);
    const id=secret().slice(0,32);
    const who=await owner();
    try{
      await db().prepare('INSERT INTO uploads (id,owner,object_key,name,stats,bytes,created) VALUES (?,?,?,?,?,?,?)').bind(id,who,pathname,safeName,JSON.stringify(stats),bytes.length,Date.now()).run();
    }catch(e){await runtime.BUCKET.delete(pathname);throw e}
    return Response.json({id,name:safeName,stats},{status:201});
  }catch(e){return responseError(e)}
}
