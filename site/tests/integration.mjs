import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
const origin=process.env.FORMA_TEST_URL??'http://127.0.0.1:3001';
// Isolate repeated local QA from the user's upload quota; production uses Cloudflare's trusted IP.
const localTest=/^(127\.0\.0\.1|localhost)$/.test(new URL(origin).hostname);
const testId=randomUUID().replaceAll('-','').slice(0,16);
const testAddress='2001:db8:0:0:'+testId.match(/.{4}/g).join(':');
const testHeaders=localTest?{'x-forwarded-for':testAddress,'cf-connecting-ip':testAddress}:{};
const admin={headers:{'oai-authenticated-user-email':'seedy@sites.test','oai-authenticated-user-id':'local_seedy'}};
class Client{jar=new Map();get cookie(){return [...this.jar].map(([name,value])=>name+'='+value).join('; ')}set cookie(value){for(const pair of value.split('; ')){const index=pair.indexOf('=');if(index>0)this.jar.set(pair.slice(0,index),pair.slice(index+1))}}async send(path,method='GET',body,extra={}){const headers={...testHeaders,...extra.headers};if(this.cookie)headers.cookie=this.cookie;if(body&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body)}if(method!=='GET')headers.Origin=origin;const res=await fetch(origin+path,{method,headers,body});for(const cookie of res.headers.getSetCookie()){this.cookie=cookie.split(';')[0];}const text=await res.text();let data;try{data=JSON.parse(text)}catch{data=text}return{res,data};}}
const one=new Client(),two=new Client(),studio=new Client();
// The local Vinext preview strips injected auth headers and uses its real local sign-in cookie.
// Production-worker verification may still use the trusted local Worker headers above.
if(new URL(origin).hostname==='127.0.0.1'){
 const login=await fetch(origin+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'});
 const cookie=login.headers.get('set-cookie');if(cookie)studio.cookie=cookie.split(';')[0];
}
const conf={size:100,material:'pla',color:'white',quality:'standard',quantity:1,strength:'everyday',supports:'auto',finishing:'none'};
const vertices=[[0,0,0],[20,0,0],[0,20,0],[0,0,20]],faces=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
const stl='solid tetra\n'+faces.map(f=>'facet normal 0 0 0\nouter loop\n'+f.map(i=>'vertex '+vertices[i].join(' ')).join('\n')+'\nendloop\nendfacet').join('\n')+'\nendsolid tetra';
await one.send('/api/catalog');await two.send('/api/catalog');
let result=await two.send('/api/admin');assert.equal(result.res.status,403);
const form=new FormData();form.set('file',new Blob([stl]),'TETRA.STL');result=await one.send('/api/uploads','POST',form);assert.equal(result.res.status,201,JSON.stringify(result.data));const upload=result.data;assert.deepEqual(upload.stats.dimensions,[20,20,20]);
result=await two.send('/api/uploads/'+upload.id);assert.equal(result.res.status,404);
result=await one.send('/api/uploads/'+upload.id);assert.equal(result.res.status,200);assert.equal(result.data,stl);
// Exercise the real multipart framework limit with a valid STL above its 1 MB default.
const largeBytes=readFileSync(new URL('./fixtures/printed-form.stl',import.meta.url));
assert.ok(largeBytes.length>1024*1024&&largeBytes.length<15*1024*1024);
const largeForm=new FormData();largeForm.set('file',new Blob([largeBytes]),'printed-form.stl');
result=await one.send('/api/uploads','POST',largeForm);assert.equal(result.res.status,201,JSON.stringify(result.data));assert.ok(result.data.stats.triangles>1000);
const corrupt=new FormData();corrupt.set('file',new Blob(['solid broken']),'bad.stl');assert.equal((await one.send('/api/uploads','POST',corrupt)).res.status,400);
const threeMF=new FormData();threeMF.set('file',new Blob([readFileSync(new URL('./fixtures/tetrahedron.3mf',import.meta.url))]),'tetrahedron.3mf');
result=await one.send('/api/uploads','POST',threeMF);assert.equal(result.res.status,201,JSON.stringify(result.data));const upload3mf=result.data;assert.deepEqual(upload3mf.stats.dimensions,[40,40,40]);
assert.equal((await two.send('/api/uploads/'+upload3mf.id)).res.status,404);
result=await one.send('/api/quote','POST',{item:{uploadId:upload3mf.id,name:'3MF model',config:conf}});assert.equal(result.res.status,200,JSON.stringify(result.data));assert.ok(result.data.total>0);
const extra=new FormData();extra.set('file',new Blob([stl]),'good.stl');extra.set('unexpected','field');assert.equal((await one.send('/api/uploads','POST',extra)).res.status,400);
const item={uploadId:upload.id,name:'custom model',config:conf};
result=await one.send('/api/quote','POST',{item});assert.equal(result.res.status,200,JSON.stringify(result.data));assert.ok(result.data.total>0);
assert.equal((await two.send('/api/quote','POST',{item})).res.status,404);
assert.equal((await one.send('/api/quote','POST',{item:{...item,productId:'ripple-vase'}})).res.status,400);
assert.equal((await one.send('/api/quote','POST',{item:{...item,config:{...conf,size:300}}})).res.status,200);
assert.equal((await one.send('/api/quote','POST',{item:{productId:'ripple-vase',name:'vase',config:{...conf,size:300}}})).res.status,400);
result=await one.send('/api/quote','POST',{item,analyze:true});assert.equal(result.res.status,503);assert.match(result.data.error,/not connected/);
// Each line fits the 4.5 kg PLA stock; together they require 6.32 kg and must not create an order.
const stockItems=['white','blue'].map(color=>({productId:'arch-stand',name:'stock regression',config:{...conf,color,quantity:20}}));
for(const stockItem of stockItems){result=await one.send('/api/quote','POST',{item:stockItem});assert.equal(result.res.status,200,JSON.stringify(result.data));assert.equal(result.data.grams,3160)}
result=await one.send('/api/orders','POST',{customer:'Stock Regression',phone:'0501234567',fulfillment:'pickup',paymentLocation:'huwaylat',paymentAcknowledged:true,area:'Jubail',notes:'Combined inventory regression',items:stockItems,requestId:randomUUID()});assert.equal(result.res.status,400,JSON.stringify(result.data));assert.match(result.data.error,/filament for this order/);
const invalidDelivery=await one.send('/api/orders','POST',{customer:'QA delivery',phone:'0501234567',fulfillment:'delivery',paymentLocation:'huwaylat',paymentAcknowledged:true,items:[item],requestId:randomUUID()});assert.equal(invalidDelivery.res.status,400);
assert.equal((await one.send('/api/quote','POST',{item,fulfillment:'delivery'})).res.status,400);
const orderBody={customer:'Integration Test',phone:'0501234567',fulfillment:'pickup',paymentLocation:'huwaylat',paymentAcknowledged:true,area:'Jubail',notes:'Local automated integration check',items:[item,{productId:'ripple-vase',name:'wrong client name',config:conf}],requestId:randomUUID(),total:1};
result=await one.send('/api/orders','POST',orderBody);assert.equal(result.res.status,201,JSON.stringify(result.data));const order=result.data;assert.equal(order.status,'awaiting_payment');assert.equal(order.payment.status,'unpaid');assert.ok(order.total>69);assert.match(order.id,/^JBL-/);assert.ok(order.token);
const repeated=await one.send('/api/orders','POST',orderBody);assert.equal(repeated.data.id,order.id);assert.equal(repeated.data.repeated,true);
assert.equal((await two.send('/api/orders/'+order.id)).res.status,404);
result=await two.send('/api/orders/'+order.id+'?token='+order.token);assert.equal(result.res.status,200);assert.equal(result.data.items[1].name,'The Ripple Vase');assert.equal(result.data.status,'awaiting_payment');assert.equal(result.data.payment.status,'unpaid');assert.equal(result.data.customer,undefined);assert.equal(result.data.phone,undefined);
// Authorized tracking may render only the private model in the corresponding order.
assert.equal((await two.send('/api/uploads/'+upload.id+'?order='+order.id+'&token='+order.token)).res.status,200);
assert.equal((await two.send('/api/uploads/'+upload.id+'?order='+order.id+'&phone=0501234567')).res.status,200);
assert.equal((await two.send('/api/uploads/'+upload.id+'?order='+order.id+'&token=wrong')).res.status,404);
assert.equal((await two.send('/api/uploads/'+upload.id+'?order='+order.id+'&phone=0500000000')).res.status,404);
assert.equal((await two.send('/api/uploads/'+upload3mf.id+'?order='+order.id+'&token='+order.token)).res.status,404);
result=await studio.send('/api/admin','GET',undefined,admin);assert.equal(result.res.status,200,JSON.stringify(result.data));const stored=result.data.orders.find(o=>o.id===order.id);assert.ok(stored);assert.equal(stored.items.length,2);
result=await studio.send('/api/admin','PATCH',{id:order.id,version:stored.version,status:'reviewed',total:order.total+7,message:'Accepted for printing. Updated quote confirmed.'},admin);assert.equal(result.res.status,200);
assert.equal((await studio.send('/api/admin','PATCH',{id:order.id,version:stored.version,status:'printing',total:50,message:'Stale update.'},admin)).res.status,409);
result=await two.send('/api/orders/'+order.id+'?phone=0501234567');assert.equal(result.data.status,'reviewed');assert.equal(result.data.total,order.total+7);assert.equal(result.data.history.length,2);assert.match(result.data.history[1].message,/confirmed/i);
assert.equal((await two.send('/api/orders/'+order.id+'?phone=0500000000')).res.status,404);
result=await studio.send('/api/admin','POST',{type:'categories',data:{values:['All','Desk setup','Room','Useful','Gifts','Miniatures']}},admin);assert.equal(result.res.status,200);
// A private product model becomes readable only after an admin attaches it to an available catalog entry.
const catalog=(await studio.send('/api/admin','GET',undefined,admin)).data;
const newProduct={...catalog.products[0],id:'integration-model-'+Date.now(),name:'QA model',nameAr:'QA',modelId:upload.id,dimensions:upload.stats.dimensions,available:true,featured:false};
assert.equal((await studio.send('/api/admin','POST',{type:'product',data:newProduct},admin)).res.status,200);
assert.equal((await two.send('/api/uploads/'+upload.id)).res.status,200);
newProduct.available=false;assert.equal((await studio.send('/api/admin','POST',{type:'product',data:newProduct},admin)).res.status,200);
assert.equal((await two.send('/api/uploads/'+upload.id)).res.status,404);
let reviewed=(await studio.send('/api/admin','GET',undefined,admin)).data.orders.find(o=>o.id===order.id);
// Production cannot be unlocked by customers, partial payments or skipping the queue.
for(const status of ['queued','printing','finishing','ready','completed']){const blocked=await studio.send('/api/admin','PATCH',{id:order.id,version:reviewed.version,status,total:reviewed.total,message:'Try unpaid production.'},admin);assert.equal(blocked.res.status,400,JSON.stringify(blocked.data));assert.match(blocked.data.error,/full payment/)}
assert.equal((await two.send('/api/admin/payments','POST',{id:order.id,version:reviewed.version,amount:reviewed.total,reference:'forged',verified:true})).res.status,403);
assert.equal((await studio.send('/api/admin/payments','POST',{id:order.id,version:reviewed.version,amount:reviewed.total-1,reference:'partial',verified:true},admin)).res.status,400);
assert.equal((await studio.send('/api/admin/payments','POST',{id:order.id,version:reviewed.version-1,amount:reviewed.total,reference:'stale',verified:true},admin)).res.status,409);
assert.equal((await studio.send('/api/admin/payments','POST',{id:order.id,version:reviewed.version,amount:reviewed.total,reference:'QA-receipt-'+testId,verified:true},admin)).res.status,200);
assert.equal((await studio.send('/api/admin/payments','POST',{id:order.id,version:reviewed.version,amount:reviewed.total,reference:'repeat',verified:true},admin)).res.status,409);
reviewed=(await studio.send('/api/admin','GET',undefined,admin)).data.orders.find(o=>o.id===order.id);assert.equal(reviewed.payment.status,'paid');assert.equal(reviewed.payment.paidAmount,reviewed.total);assert.ok(reviewed.payment.paidAt);
assert.equal((await studio.send('/api/admin','PATCH',{id:order.id,version:reviewed.version,status:'printing',total:reviewed.total+1,message:'Quote tampering after payment.'},admin)).res.status,400);
assert.equal((await two.send('/api/orders/'+order.id+'?token='+order.token)).data.payment.status,'paid');
assert.equal((await studio.send('/api/admin','PATCH',{id:order.id,version:reviewed.version,status:'printing',total:reviewed.total,message:'Local test model is printing.'},admin)).res.status,200);
assert.equal((await two.send('/api/orders/'+order.id+'?token='+order.token)).data.status,'printing');
const printing=(await studio.send('/api/admin','GET',undefined,admin)).data.orders.find(o=>o.id===order.id);
assert.equal((await studio.send('/api/admin','PATCH',{id:order.id,version:printing.version,status:'completed',total:printing.total,message:'Integration test complete. This is a local test record.'},admin)).res.status,200);
// The decline path remains available in the professional administration UI.
result=await one.send('/api/orders','POST',{...orderBody,items:[{uploadId:upload3mf.id,name:'3MF decline check',config:conf}],requestId:randomUUID()});assert.equal(result.res.status,201,JSON.stringify(result.data));const declineOrder=result.data;
const pending=(await studio.send('/api/admin','GET',undefined,admin)).data.orders.find(o=>o.id===declineOrder.id);
assert.equal((await studio.send('/api/admin','PATCH',{id:pending.id,version:pending.version,status:'declined',total:pending.total,message:'Local integration decline check.'},admin)).res.status,200);
assert.equal((await two.send('/api/orders/'+pending.id+'?token='+declineOrder.token)).data.status,'declined');
// Simultaneous retries yield exactly one reservation with successful responses.
const replayBody={...orderBody,requestId:randomUUID()};const replay=await Promise.all([one.send('/api/orders','POST',replayBody),one.send('/api/orders','POST',replayBody)]);assert.ok(replay.every(r=>r.res.ok),JSON.stringify(replay.map(r=>r.data)));assert.equal(replay[0].data.id,replay[1].data.id);
// Real account and support routes, including the payment-approval privilege boundary.
const account=new Client();const credentials={name:'QA Customer',email:'forma-qa-'+testId+'@example.invalid',phone:'0501234567',password:'QA-password-912!',role:'admin'};
result=await account.send('/api/auth/register','POST',credentials);assert.equal(result.res.status,201,JSON.stringify(result.data));assert.equal(result.data.user.role,'customer');
assert.equal((await account.send('/api/auth/me')).data.user.email,credentials.email);
assert.deepEqual((await account.send('/api/auth/orders')).data.orders,[]); // An unverified matching phone does not expose another account's orders.
assert.equal((await account.send('/api/admin')).res.status,403);
assert.equal((await account.send('/api/admin/payments','POST',{id:order.id,version:reviewed.version,amount:reviewed.total,reference:'fake-admin',verified:true})).res.status,403);
result=await account.send('/api/orders','POST',{...orderBody,items:[{productId:'ripple-vase',name:'QA account object',config:conf}],requestId:randomUUID(),paymentStatus:'paid',paidAmount:99999,total:1});assert.equal(result.res.status,201,JSON.stringify(result.data));assert.equal(result.data.payment.status,'unpaid');const ownOrder=result.data;
assert.ok((await account.send('/api/auth/orders')).data.orders.some(o=>o.id===ownOrder.id));
result=await account.send('/api/support/tickets','POST',{name:credentials.name,email:credentials.email,phone:credentials.phone,orderId:ownOrder.id,subject:'Arrange local payment',message:'Please confirm the final quote and exact payment meeting time and location.'});assert.equal(result.res.status,201,JSON.stringify(result.data));const ticket=result.data;
assert.ok((await account.send('/api/support/tickets')).data.tickets.some(t=>t.id===ticket.id));
assert.equal((await two.send('/api/support/tickets','PATCH',{id:ticket.id,status:'resolved',response:'Forged response'})).res.status,403);
assert.equal((await studio.send('/api/support/tickets','PATCH',{id:ticket.id,status:'in_progress',response:'QA response saved. This is a local test only.'},admin)).res.status,200);
assert.match((await account.send('/api/support/tickets')).data.tickets.find(t=>t.id===ticket.id).response,/QA response/);
assert.equal((await account.send('/api/auth/logout','POST')).res.status,200);assert.equal((await account.send('/api/auth/me')).data.user,null);
assert.equal((await account.send('/api/auth/login','POST',{email:credentials.email,password:'wrong'})).res.status,401);
assert.equal((await account.send('/api/auth/login','POST',credentials)).res.status,200);
console.log('FORMA_INTEGRATION_PASSED');
