import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,mocks){const exports={};new Function('require','exports',ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>mocks[id]??require(id),exports);return exports;}
class WmsError extends Error{constructor(status,message){super(message);this.status=status;}}
function fixture(signedIn=true){const calls=[];const client={getReturnPackingSlip:async(...args)=>{calls.push(['slip',...args]);return{filename:'SF-RMA-B3BE74F9-packing-slip.pdf',contentType:'application/pdf',base64:'JVBERg=='};},getOrderAftercare:async access=>{calls.push(['read',access]);return {status:'PENDING'};},cancelOrder:async(...a)=>{calls.push(['cancel',...a]);return {cancelled:true,paymentReview:false};},requestReturn:async(...a)=>{calls.push(['return',...a]);return {id:'r1'};},saveReturnTracking:async(...a)=>{calls.push(['tracking',...a]);return {saved:true};}};const actions=load('app/actions/order-aftercare.ts',{'@/lib/wms/session':{getClient:()=>client,tryGetAuthedClient:async()=>signedIn?client:null},'@/lib/wms/client':{WmsError}});return{actions,client,calls};}
test('guest capability cannot bypass account authentication',async()=>{const t=fixture(false);assert.equal((await t.actions.readOrderAftercare({token:'a'.repeat(64)})).ok,false);assert.equal(t.calls.length,0);});
test('account mutations require a current session, even when called directly',async()=>{const t=fixture(false);const result=await t.actions.cancelStorefrontOrder({orderId:'other'},'Cancel please');assert.equal(result.ok,false);assert.match(result.error,/Sign in/);assert.equal(t.calls.length,0);});
test('return idempotency and consent payload are forwarded; gateway errors are not exposed',async()=>{const t=fixture();const input={idempotencyKey:'key',originalPackaging:true,conditionsAccepted:true,reason:'Damaged',items:[{orderItemId:'i1',quantity:1}]};await t.actions.requestStorefrontReturn({orderId:'o1'},input);assert.deepEqual(t.calls[0],['return',{orderId:'o1'},input]);t.client.getOrderAftercare=async()=>{throw new WmsError(503,'database password should never reach customer');};assert.doesNotMatch((await t.actions.readOrderAftercare({orderId:'o1'})).error,/password/);});


test('return packing slip downloads preserve scoped access and require account authentication',async()=>{
 const access={orderId:'o1'},guest=fixture(true),result=await guest.actions.downloadReturnPackingSlip(access,'r1');
 assert.equal(result.ok,true);assert.deepEqual(guest.calls[0],['slip',access,'r1']);
 const signedOut=fixture(false);assert.equal((await signedOut.actions.downloadReturnPackingSlip({orderId:'o1'},'r1')).ok,false);assert.equal(signedOut.calls.length,0);
});
