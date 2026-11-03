const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function compile(file){return ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/'+file+'.ts'),'utf8'),{compilerOptions:{module:1,target:9}}).outputText;}
function fixture(name='LITTO'){
 const sent=[],out={},confirmation={};new Function('exports',compile('order-confirmation'))(confirmation);
 new Function('require','exports','process',compile('email'))(id=>id==='./order-confirmation'?confirmation:id==='resend'?{Resend:class{emails={send:async(msg,options)=>{sent.push({msg,options});return {error:null};}}}}:(()=>{throw Error(id);})(),out,{env:{RESEND_API_KEY:'fake-no-network',EMAIL_FROM:'HQ WMS <orders@emails.hq.team>',NEXT_PUBLIC_STORE_NAME:name}});
 return {...out,sent};
}
for(const name of ['LITTO','VPR Collection']){
 test(name+' shipped/cancelled mail uses the store in sender, subject and heading',async()=>{
 const t=fixture(name),data={orderId:'id',orderNumber:'SF-1',customerEmail:'buyer@example.test',status:'SHIPPED',reason:'Test'};
 await t.sendOrderShippedEmail('event-ship',data);await t.sendOrderCancelledEmail('event-cancel',data);
 for(const {msg}of t.sent){assert.equal(msg.from,'"'+name+'" <orders@emails.hq.team>');assert.ok(msg.subject.startsWith(name+' — Order SF-1'));assert.ok(msg.html.includes(name+' — Your order'));assert.doesNotMatch(msg.from,/HQ WMS/);}
 assert.equal(t.sent[0].options.idempotencyKey,'event-ship');assert.equal(t.sent[1].options.idempotencyKey,'event-cancel');
 });
 test(name+' confirmation keeps branded receipt and stable order key',async()=>{
 const t=fixture(name);await t.sendOrderConfirmationEmail({orderId:'id',orderNumber:'SF-1',to:'buyer@example.test',totalAmount:5,statusUrl:'https://shop.example/order',items:[]});assert.equal(t.sent[0].msg.from,'"'+name+'" <orders@emails.hq.team>');assert.ok(t.sent[0].msg.subject.includes(name));assert.ok(t.sent[0].msg.html.includes(name));assert.equal(t.sent[0].options.idempotencyKey,'order-confirmation:id');
 });
}
test('bare and formatted mailboxes are normalized safely',()=>{const t=fixture();assert.equal(t.storefrontSender('LITTO','orders@emails.hq.team'),'"LITTO" <orders@emails.hq.team>');assert.throws(()=>t.storefrontSender('LITTO','bad address'),/Invalid/);});
