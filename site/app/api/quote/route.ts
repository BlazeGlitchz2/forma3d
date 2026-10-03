import {quoteItem} from '@/lib/quote-server';
import {sameOrigin,rateLimit,responseError} from '@/lib/server';
import type {Item} from '@/lib/pricing';
export async function POST(request:Request){try{await sameOrigin(request);await rateLimit('quote',120,60);const body=await request.json() as {item:Item;fulfillment?:string;analyze?:boolean};return Response.json(await quoteItem(body.item,body.fulfillment,body.analyze))}catch(e){return responseError(e)}}
