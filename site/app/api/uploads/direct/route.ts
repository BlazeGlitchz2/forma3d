import {handleUpload,type HandleUploadBody} from '@vercel/blob/client';
import {runtime,sameOrigin,rateLimit,responseError,ApiError} from '@/lib/server';
import {MAX_FILE_BYTES} from '@/lib/upload-limits';

const PATHNAME=/^uploads\/[A-Za-z0-9._-]{1,160}\.(stl|3mf)$/i;

export async function GET(){
  return Response.json({available:!!runtime.BLOB_READ_WRITE_TOKEN,limit:MAX_FILE_BYTES});
}

export async function POST(request:Request){
  try{
    await sameOrigin(request);
    const token=runtime.BLOB_READ_WRITE_TOKEN as string|undefined;
    if(!token)throw new ApiError('Direct uploads are not available. Use the standard upload.',501);
    const body=await request.json() as HandleUploadBody;
    // Only token issuance is user-triggered; completion webhooks from the blob
    // service must not consume the same quota.
    if((body as {type?:string}).type==='blob.generate-client-token')await rateLimit('upload_direct',40,3600);
    const result=await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken:async(pathname:string)=>{
        if(!PATHNAME.test(pathname))throw new ApiError('Choose an STL or 3MF file.');
        return {maximumSizeInBytes:MAX_FILE_BYTES,addRandomSuffix:true};
      },
      onUploadCompleted:async()=>{},
    });
    return Response.json(result);
  }catch(e){return responseError(e)}
}
