import {db,runtime,owner,isAdmin,responseError,ApiError,digest,equal,rateLimit} from '@/lib/server';
import {normalizePhone,type Item} from '@/lib/pricing';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const{id}=await params;
  const row=await db().prepare('SELECT * FROM uploads WHERE id=?').bind(id).first<{owner:string;object_key:string;name:string}>();
  if(!row)throw new ApiError('This model is unavailable.',404);
  const publicObject=await db().prepare("SELECT id FROM catalog WHERE type='product' AND json_extract(data,'$.available')=1 AND (json_extract(data,'$.modelId')=? OR json_extract(data,'$.imageId')=?) LIMIT 1").bind(id,id).first();
  let permitted=!!publicObject||row.owner===await owner(false)||await isAdmin();
  const query=new URL(request.url).searchParams;
  // Tracking credentials grant access only to a model actually in that order.
  if(!permitted&&query.get('order')){
   await rateLimit('track-model',20,60);
   const order=await db().prepare('SELECT secret,phone,items FROM orders WHERE id=?').bind(query.get('order')!.toUpperCase()).first<{secret:string;phone:string;items:string}>();
   if(order&&(JSON.parse(order.items) as Item[]).some(item=>item.uploadId===id)){
    const token=query.get('token'),phone=query.get('phone');
    permitted=!!token&&equal(digest(token),order.secret)||!!phone&&equal(normalizePhone(phone),order.phone);
   }
  }
  if(!permitted)throw new ApiError('This model is unavailable.',404);
  const object=await runtime.BUCKET.get(row.object_key);
  if(!object)throw new ApiError('This model is unavailable.',404);
  return new Response(object.body,{headers:{'Content-Type':row.name.endsWith('.webp')?'image/webp':row.name.endsWith('.png')?'image/png':row.name.endsWith('.jpg')?'image/jpeg':'application/octet-stream','Content-Disposition':`attachment; filename="${row.name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return responseError(e)}
}
