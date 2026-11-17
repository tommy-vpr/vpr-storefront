import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,mocks={},globals={}){
 const testModule={exports:{}};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module:testModule,exports:testModule.exports,require:n=>{if(n in mocks)return mocks[n];throw Error('Unexpected dependency '+n);},Response,Headers,URLSearchParams,AbortSignal,Set,Promise,console:{warn(){},error(){}},...globals});return testModule.exports;
}
const input={idempotencyKey:'vpr-attempt-123',expectedTotalCents:2400,email:'tampered@example.invalid',items:[{variantId:'variant-1',quantity:2}],shippingAddress:{name:'Test',address1:'1 Test',city:'Toronto',state:'Ontario',zip:'M5V 2T6',country:'CA'},opaqueData:{dataDescriptor:'offline',dataValue:'offline'}};
function fixture(mode='success',token='customer-session'){
 const requests=[],mails=[];
 const client=load('../lib/wms/client.ts',{'@/lib/product-content':{withProductListingImages:async x=>x},'@/lib/storefront-visibility':{getLiveCatalogHiddenProductIds:async()=>new Set()}},{process:{env:{WMS_API_URL:'https://offline.invalid',WMS_API_KEY:'offline-only'}},fetch:async(url,options)=>{
  requests.push({url,options});
  if(url.endsWith('/storefront/store')){if(mode==='preflight-down')throw new TypeError('offline');return Response.json({store:{id:mode==='wrong-store'?'other':'vpr-id',mode:mode==='retail'?'RETAIL':'WHOLESALE',shippingRatesSupported:true}});}
  if(url.endsWith('/storefront/me')){if(mode==='expired')return Response.json({error:'expired'},{status:401});return Response.json({customer:{email:'invited@example.invalid',wholesaleAccount:mode!=='non-wholesale'}});}
  assert.ok(url.endsWith('/storefront/orders'));
  if(mode==='lost')throw new TypeError('lost response');
  if(mode==='bad-body')return new Response('bad',{headers:{'Content-Type':'application/json'}});
  if(['pending','conflict','price'].includes(mode))return Response.json({code:{pending:'PAYMENT_PENDING',conflict:'IDEMPOTENCY_CONFLICT',price:'PRICE_CHANGED'}[mode]},{status:409});
  if(mode==='decline')return Response.json({code:'PAYMENT_DECLINED'},{status:402});
  return Response.json({order:{id:'order-test',orderNumber:'SF-VPR-1',guestAccessToken:mode==='mail-fails'?'test-token':null,items:[],totalAmount:24}},{status:201});
 }});
 const action=load('../app/(site)/(shop)/checkout/actions.ts',{'@/lib/wholesale-checkout':load('../lib/wholesale-checkout.ts'),'next/headers':{headers:async()=>new Headers({host:'vpr.example.invalid'})},'@/lib/wms/session':{getSessionToken:async()=>token},'@/lib/wms/client':client,'@/lib/turnstile':{verifyTurnstile:async()=>({ok:true})},'@/lib/email':{sendOrderConfirmationEmail:async data=>{mails.push(data);throw Error('mail unavailable');}}},{process:{env:{WMS_STORE_ID:'vpr-id'}}});
 return{action,requests,mails};
}
test('invited wholesale checkout uses account email, stable attempt key and explicit free international shipping',async()=>{
 const f=fixture();assert.equal((await f.action.placeOrderAction(input)).ok,true);
 const req=f.requests.find(r=>r.options.method==='POST'),body=JSON.parse(req.options.body);
 assert.equal(body.email,'invited@example.invalid');assert.equal(body.idempotencyKey,input.idempotencyKey);
 assert.equal(body.shipping.flatRateCents,0);assert.equal(body.shipping.allowFreeInternational,true);assert.equal(body.shipping.expectedTotalCents,2400);assert.equal(body.shippingAddress.country,'CA');assert.ok(f.requests.every(r=>r.options.signal instanceof AbortSignal));
 assert.equal(f.requests.filter(r=>r.options.method==='POST').length,1);
});
test('guest checkout is denied before WMS access or payment',async()=>{const f=fixture('success',null);assert.equal((await f.action.placeOrderAction(input)).code,'auth');assert.equal(f.requests.length,0);});
for(const mode of ['non-wholesale','expired','retail','wrong-store'])test(mode+' cannot reach payment',async()=>{const f=fixture(mode);assert.equal((await f.action.placeOrderAction(input)).ok,false);assert.equal(f.requests.some(r=>r.options.method==='POST'),false);});
for(const mode of ['pending','conflict','lost','bad-body'])test(mode+' preserves uncertainty rather than inviting another payment',async()=>{const f=fixture(mode),r=await f.action.placeOrderAction(input);assert.equal(r.code,'pending');assert.match(r.message,/Do not submit another payment/);});
test('decline, changed price and preflight outage remain distinct',async()=>{for(const [mode,code]of[['decline','declined'],['price','invalid'],['preflight-down','unavailable']])assert.equal((await fixture(mode).action.placeOrderAction(input)).code,code);});
test('invalid total/key/country does not reach payment',async()=>{for(const override of[{expectedTotalCents:-1},{idempotencyKey:''},{shippingAddress:{...input.shippingAddress,country:'Canada'}}]){const f=fixture();assert.equal((await f.action.placeOrderAction({...input,...override})).code,'invalid');assert.equal(f.requests.length,0);}});
test('receipt failure keeps checkout successful and uses authoritative account email',async()=>{const f=fixture('mail-fails');assert.equal((await f.action.placeOrderAction(input)).ok,true);assert.equal(f.mails[0].to,'invited@example.invalid');});
test('public self-signup action never calls WMS',async()=>{const a=load('../app/(site)/(auth)/signup/actions.ts');assert.match((await a.signupAction({error:null},new FormData())).error,/invitation-only/);});
test('pending references survive reload, isolate VPR from LITTO, and reject another purchase',()=>{
 const a=load('../lib/checkout-attempt.ts'),values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 assert.equal(a.CHECKOUT_ATTEMPT_KEY,'vpr_checkout_pending_v1');a.beginCheckoutAttempt(storage,'attempt-1');
 const remount=load('../lib/checkout-attempt.ts');assert.equal(remount.readCheckoutAttempt(storage),'attempt-1');assert.throws(()=>remount.beginCheckoutAttempt(storage,'attempt-2'),/earlier payment/);
 remount.finishCheckoutAttempt(storage,'other');assert.equal(values.size,1);remount.finishCheckoutAttempt(storage,'attempt-1');assert.equal(values.size,0);
});
test('Turnstile missing secret fails closed except explicit local bypass',async()=>{
 for(const env of[{NODE_ENV:'production'},{NODE_ENV:'development'},{NODE_ENV:'development',VERCEL:'1',TURNSTILE_ALLOW_LOCAL_BYPASS:'true'}])assert.equal((await load('../lib/turnstile.ts',{}, {process:{env}}).verifyTurnstile('token')).ok,false);
 assert.equal((await load('../lib/turnstile.ts',{}, {process:{env:{NODE_ENV:'development',TURNSTILE_ALLOW_LOCAL_BYPASS:'true'}}}).verifyTurnstile(null)).ok,true);
});
test('Turnstile has a deadline and sends no untrusted forwarded IP',async()=>{let request;const t=load('../lib/turnstile.ts',{}, {process:{env:{TURNSTILE_SECRET_KEY:'offline'}},fetch:async(_url,options)=>{request=options;return Response.json({success:true});}});assert.equal((await t.verifyTurnstile('test')).ok,true);assert.ok(request.signal instanceof AbortSignal);assert.equal(request.body.has('remoteip'),false);});

test('VPR session cookie isolates the old shared name and preserves custom names',async()=>{
 for(const [configured,expected]of[[undefined,'vpr_storefront_session'],['storefront_session','vpr_storefront_session'],['vpr_custom','vpr_custom']]){
  const used=[];const s=load('../lib/wms/session.ts',{'next/headers':{cookies:async()=>({get:name=>{used.push(name);return{value:'test-token'};}})},'./client':{wmsClient:token=>({token})}},{process:{env:{SESSION_COOKIE_NAME:configured}}});
  assert.equal(await s.getSessionToken(),'test-token');assert.equal(used[0],expected);
 }
});

test('checkout form guards double clicks and retains pending state with international address fields',async()=>{
 const attempt=load('../lib/checkout-attempt.ts'),storageValues=new Map(),storage={getItem:k=>storageValues.get(k)??null,setItem:(k,v)=>storageValues.set(k,v),removeItem:k=>storageValues.delete(k)};
 let states=[],cursor=0,dirty=true,effects=[],tree,calls=0,resolvePayment;
 const pending=new Promise(resolve=>{resolvePayment=resolve;});
 const changed=(a,b)=>!a||a.length!==b.length||a.some((v,i)=>!Object.is(v,b[i]));
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],value=>{const v=typeof value==='function'?value(states[i]):value;if(!Object.is(v,states[i])){states[i]=v;dirty=true;}}];},useRef(initial){const i=cursor++;if(!(i in states))states[i]={current:initial};return states[i];},useEffect(fn,deps){const i=cursor++;if(!states[i]||changed(states[i].deps,deps)){states[i]={deps};effects.push(fn);}}};
 const jsx=(type,props)=>({type,props});
 const component=load('../app/(site)/(shop)/checkout/CheckoutForm.tsx',{
 react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>({replace(){}})},'next/link':{__esModule:true,default:'a'},'@/components/ui/button':{Button:'button'},'@/components/ui/input':{Input:'input'},'@/components/ui/label':{Label:'label'},'@/components/ui/separator':{Separator:'hr'},
 '@/components/cart-provider':{useCart:()=>({items:[{variantId:'variant-1',quantity:2,name:'Test'}],subtotal:24,isHydrated:true,clear(){}})},'@/components/address-autocomplete':{AddressAutocomplete:'address'},'@/components/turnstile':{Turnstile:'turnstile'},'@/lib/format':{formatPrice:n=>'$'+n},'@/lib/checkout-attempt':attempt,
 './actions':{placeOrderAction:async data=>{calls++;assert.equal(data.expectedTotalCents,2400);assert.equal(data.shippingAddress.country,'CA');return pending;}},'@/lib/use-card-validation':{useCardValidation:()=>({errors:{},firstProblem:null}),formatCardNumber:x=>x},
 },{window:{addEventListener(){},removeEventListener(){},Accept:{dispatchData:(_data,callback)=>callback({messages:{resultCode:'Ok'},opaqueData:{dataDescriptor:'offline',dataValue:'offline'}})}},document:{createElement:()=>({}),body:{appendChild:s=>s.onload()}},localStorage:storage,navigator:{},crypto:{randomUUID:()=> 'vpr-browser-attempt-123'}}).CheckoutForm;
 const props={acceptJsUrl:'https://offline.invalid',clientKey:'test',loginId:'test',turnstileSiteKey:'',initialEmail:'invited@example.invalid',initialAddress:input.shippingAddress};
 const flatten=n=>Array.isArray(n)?n.flatMap(flatten):n&&typeof n==='object'?[n,...flatten(n.props?.children)]:[];
 const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):String(n??'');
 const pay=()=>flatten(tree).find(n=>n.type==='button'&&text(n).includes('Pay '));
 const flush=async()=>{for(let i=0;i<20;i++){if(dirty){dirty=false;cursor=0;tree=component(props);const todo=effects;effects=[];for(const effect of todo)effect();}await Promise.resolve();if(!dirty&&!effects.length)return;}throw Error('Unsettled form');};
 await flush();assert.equal(pay().props.disabled,false);
 assert.ok(flatten(tree).some(n=>n.props?.id==='ship-country'));
 assert.equal(flatten(tree).find(n=>n.props?.id==='ship-state').props.maxLength,undefined);
 const first=pay().props.onClick();await pay().props.onClick();await flush();assert.equal(calls,1);
 resolvePayment({ok:false,code:'pending',message:'Do not pay again'});await first;await flush();assert.equal(pay().props.disabled,true);
 states=[];dirty=true;await flush();assert.equal(pay().props.disabled,true);await pay().props.onClick();assert.equal(calls,1);
});
