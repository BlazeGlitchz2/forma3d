import {getCatalog,responseError,owner} from '@/lib/server';
export async function GET(){try{await owner();return Response.json(await getCatalog())}catch(e){return responseError(e)}}
