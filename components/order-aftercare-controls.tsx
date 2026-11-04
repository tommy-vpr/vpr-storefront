'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {downloadReturnPackingSlip,readOrderAftercare,cancelStorefrontOrder,requestStorefrontReturn,saveReturnTracking} from '@/app/actions/order-aftercare';
import type {AftercareAccess,OrderAftercare} from '@/lib/wms/types';

const returnReasons=['Item arrived damaged','Item is defective or does not work','Wrong item received','Item not as described','Changed my mind'];

export function OrderAftercareControls({access}:{access:AftercareAccess}) {
 const router=useRouter();const [data,setData]=useState<OrderAftercare|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [reason,setReason]=useState(''),[mode,setMode]=useState<'cancel'|'return'|null>(null),[quantities,setQuantities]=useState<Record<string,number>>({}),[packaged,setPackaged]=useState(false),[conditions,setConditions]=useState(false);
 const [selectedReason,setSelectedReason]=useState('');
 const effectiveReason=mode==='return'?(selectedReason==='Other'?reason:selectedReason):reason;
 const selectedItems=data?.items.filter(item=>(quantities[item.orderItemId]??0)>0)??[];
 const validQuantities=selectedItems.length>0&&selectedItems.every(item=>Number.isInteger(quantities[item.orderItemId])&&quantities[item.orderItemId]<=item.returnableQuantity);
 const missingRequirements=[...(mode==='return'&&!validQuantities?['Choose a quantity of at least 1 for an item to return.']:[]),...(effectiveReason.trim().length<3?[mode==='return'&&selectedReason!=='Other'?'Select a return reason.':'Enter a reason of at least 3 characters.']:[]),...(mode==='return'&&!packaged?['Confirm the items are in their original packaging.']:[]),...(mode==='return'&&!conditions?['Accept the return conditions.']:[])];
 const key=useRef<string|null>(null),submitting=useRef(false);const accessKey=JSON.stringify(access);
 const reload=useCallback(async()=>{const result=await readOrderAftercare(JSON.parse(accessKey));if(result.ok){setData(result.data);setError('');}else setError(result.error);},[accessKey]);
 useEffect(()=>{let active=true;readOrderAftercare(JSON.parse(accessKey)).then(result=>{if(!active)return;if(result.ok){setData(result.data);setError('');}else setError(result.error);});return()=>{active=false;};},[accessKey]);
 async function submit(){
  if(submitting.current||missingRequirements.length)return;submitting.current=true;setBusy(true);setError('');
  try {
   if(mode==='cancel'){
    const result=await cancelStorefrontOrder(access,reason);if(!result.ok){setError(result.error);return;}
    setMessage(result.data.paymentReview?'Order cancelled. Staff will review the remaining payment authorization.':'Order cancelled. If an authorization was held, its release may take time to appear at your bank.');
   }else{
    key.current??=crypto.randomUUID();
    const items=Object.entries(quantities).filter(([,quantity])=>quantity>0).map(([orderItemId,quantity])=>({orderItemId,quantity}));
    const result=await requestStorefrontReturn(access,{idempotencyKey:key.current,reason:effectiveReason,originalPackaging:packaged,conditionsAccepted:conditions,items});
    if(!result.ok){setError(result.error);return;}
    setMessage('Return request submitted for staff approval. Do not ship anything until it is approved.');key.current=null;
   }
   setMode(null);setReason('');setSelectedReason('');setQuantities({});await reload();router.refresh();
  }finally{submitting.current=false;setBusy(false);}
 }
 return <section className="mt-8 rounded-lg border bg-white p-5 text-gray-900" aria-label="Manage order">
  <h2 className="text-lg font-semibold">Manage your order</h2>
  <p className="mt-2 text-sm text-gray-600">Cancel before warehouse processing starts. {data?.policy ? <>Request returns within {data.policy.returnWindowDays} days of purchase, in original packaging.</> : <>Return eligibility is checked against the current store settings.</>} Staff must approve returns; you pay return shipping. <Link href="/shipping-returns" className="underline">Read the policy</Link>.</p>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error} <button type="button" onClick={()=>void reload()} className="cursor-pointer underline">Refresh</button></p>}
  {message&&<p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
  {!data&&!error&&<p className="mt-3 text-sm text-gray-500">Checking order eligibility…</p>}
  {data&&<>
   <div className="mt-4 flex flex-wrap gap-3">
    {!data.cancellationReason&&<button type="button" disabled={busy} onClick={()=>setMode('cancel')} className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel order</button>}
    {data.canRequestReturn&&<button type="button" disabled={busy} onClick={()=>setMode('return')} className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">Request a return</button>}
   </div>
   {!data.canRequestReturn&&<p className="mt-3 text-sm text-gray-600">Online returns are unavailable for this order. For help with the VPR 90 day buy back guarantee, contact <a href="mailto:info@vprcollection.com" className="underline">info@vprcollection.com</a>.</p>}
   {data.cancellationReason&&data.status!=='CANCELLED'&&<p className="mt-3 text-xs text-gray-600">{data.cancellationReason}</p>}
   <p className="mt-3 text-xs text-gray-600">Return request deadline: {new Date(data.returnDeadline).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})} Pacific. Only shipped quantities not already requested can be selected.</p>
   {mode&&<div className="mt-5 space-y-4 border-t pt-4">
    <h3 className="font-medium">{mode==='cancel'?'Cancel the entire eligible order?':'Choose items to return'}</h3>
    {mode==='return'&&<>
     <p className="text-sm text-gray-600">Set the quantity to at least 1 for each item you want to return. Leave other items at 0.</p>
     {data.items.filter(i=>i.returnableQuantity>0).map(item=><label key={item.orderItemId} className="flex items-center justify-between gap-3 border-b border-gray-200 pb-4 text-sm"><span>{item.name} · {item.variantName || item.sku}<span className="block text-xs text-gray-500">Up to {item.returnableQuantity}</span></span><input aria-label={'Return quantity for '+item.sku} type="number" min={0} max={item.returnableQuantity} step={1} value={quantities[item.orderItemId]??0} onChange={e=>setQuantities({...quantities,[item.orderItemId]:Math.max(0,Math.min(item.returnableQuantity,Number(e.target.value)||0))})} className="w-20 rounded border px-2 py-2" /></label>)}
     <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={packaged} onChange={e=>setPackaged(e.target.checked)}/>The items are in their original packaging.</label>
     <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={conditions} onChange={e=>setConditions(e.target.checked)}/>I accept the return conditions and will pay return shipping.</label>
    </>}
    {mode==='return'&&<label className="block text-sm">Reason<select value={selectedReason} onChange={e=>{setSelectedReason(e.target.value);setReason('');}} required className="mt-1 block w-full rounded border bg-white p-2"><option value="">Select a reason</option>{returnReasons.map(option=><option key={option} value={option}>{option}</option>)}<option value="Other">Other</option></select></label>}
    {(mode==='cancel'||selectedReason==='Other')&&<label className="block text-sm">{mode==='return'?'Please describe your reason':'Reason'}<textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={3} maxLength={1000} required className="mt-1 block min-h-20 w-full rounded border p-2" /></label>}
    {missingRequirements.length>0&&<div id="aftercare-requirements" className="text-sm text-gray-600" aria-live="polite"><p>Before submitting:</p><ul className="mt-1 list-disc space-y-1 pl-5">{missingRequirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul></div>}
    <div className="flex gap-3"><button type="button" onClick={()=>void submit()} disabled={busy||missingRequirements.length>0} aria-describedby={missingRequirements.length?"aftercare-requirements":undefined} className="cursor-pointer rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40">{busy?'Submitting…':mode==='cancel'?'Confirm cancellation':'Submit return request'}</button><button type="button" disabled={busy} onClick={()=>setMode(null)} className="cursor-pointer rounded-md border px-4 py-2 text-sm">Keep order / go back</button></div>
   </div>}
   {!!data.requests.length&&<div className="mt-5 space-y-4 border-t pt-4"><h3 className="font-medium">Your return requests</h3>{data.requests.map(req=><div key={req.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{req.return?.returnNumber || 'Return request'} · {(req.return?.status || req.status).replaceAll('_',' ')}</p><p className="mt-1 text-gray-600">{req.reason}</p>{req.refundDecision&&req.refundDecision!=='PENDING'&&<p className="mt-2">Refund: {req.refundDecision==='APPROVED'?'Approved; payment processing is handled by staff':req.refundDecision==='REFUNDED'?'Refunded':req.refundDecision==='DECLINED'?'Not approved':req.refundDecision}. {req.refundNote}</p>}{req.rejectionReason&&<p className="mt-2 text-red-700">{req.rejectionReason}</p>}{req.status==='PENDING'&&<p className="mt-2 text-gray-600">Awaiting approval. Check this order page for the decision before shipping.</p>}{req.status==='APPROVED'&&req.return&&req.return.status!=='CANCELLED'&&<><ReturnPackingSlipButton access={access} requestId={req.id}/><ul className="mt-3 list-disc space-y-2 pl-5"><li>Include reference <strong>{req.return.returnNumber}</strong>.</li><li>Ship approved items to: <span className="block mt-1">{req.policy?.returnAddress??data.returnAddress}</span></li><li>Use an insured, tracked service at your expense.</li></ul>{req.return.receivedAt&&<p className="mt-2">Received {new Date(req.return.receivedAt).toLocaleDateString()}. Any approved refund is due within {req.policy?.refundDueDays??14} days of receipt, following inspection.</p>}{req.return.trackingNumber?<p className="mt-2">Return tracking: {req.return.trackingNumber}</p>:req.return.status==='APPROVED'?<ReturnTrackingForm access={access} requestId={req.id} onSaved={reload}/>:null}</>}</div>)}</div>}
  </>}
 </section>;
}
function ReturnTrackingForm({access,requestId,onSaved}:{access:AftercareAccess;requestId:string;onSaved:()=>Promise<void>}) {
 const [tracking,setTracking]=useState(''),[carrier,setCarrier]=useState<'ups'|'usps'|'fedex'>('ups'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const r=await saveReturnTracking(access,requestId,tracking,carrier);if(r.ok)await onSaved();else setError(r.error);}finally{setBusy(false);}}}><label>Carrier<select className="mt-1 block rounded border p-2" value={carrier} onChange={e=>setCarrier(e.target.value as typeof carrier)}><option value="ups">UPS</option><option value="usps">USPS</option><option value="fedex">FedEx</option></select></label><label>Tracking number<input required minLength={5} maxLength={100} value={tracking} onChange={e=>setTracking(e.target.value)} className="mt-1 block rounded border p-2"/></label><button disabled={busy} className="cursor-pointer rounded border px-3 py-2 disabled:opacity-50">Save tracking</button>{error&&<p role="alert" className="w-full text-red-700">{error}</p>}</form>;
}

function ReturnPackingSlipButton({access,requestId}:{access:AftercareAccess;requestId:string}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const downloading=useRef(false);
 async function download(){
  if(downloading.current)return;downloading.current=true;setBusy(true);setError('');
  try{
   const result=await downloadReturnPackingSlip(access,requestId);
   if(!result.ok){setError(result.error);return;}
   const bytes=Uint8Array.from(atob(result.data.base64),char=>char.charCodeAt(0));
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   const link=document.createElement('a');link.href=url;link.download=result.data.filename;document.body.appendChild(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30_000);
  }catch{setError('Unable to download your packing slip. Please try again.');}
  finally{downloading.current=false;setBusy(false);}
 }
 return <div className="mt-3"><button type="button" disabled={busy} onClick={()=>void download()} className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">{busy?'Preparing packing slip…':'Download return packing slip'}</button><p className="mt-1 text-xs text-gray-600">Print and place inside your package. Includes your RMA barcode for warehouse intake.</p>{error&&<p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}</div>;
}
