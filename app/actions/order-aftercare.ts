'use server';
import {tryGetAuthedClient} from '@/lib/wms/session';
import {WmsError} from '@/lib/wms/client';
import type {AftercareAccess,ReturnRequestInput} from '@/lib/wms/types';
async function client(access:AftercareAccess){if(!access||typeof access.orderId!=='string'||!access.orderId.trim()||'token' in access)throw new Error('Sign in again to manage this order.');const c=await tryGetAuthedClient();if(!c)throw new Error('Sign in again to manage this order.');return c;}
async function run<T>(fn:()=>Promise<T>){try{return{ok:true as const,data:await fn()};}catch(e){return{ok:false as const,error:e instanceof WmsError&&e.status<500?e.message:e instanceof Error&&e.message.startsWith('Sign in')?e.message:'Unable to process your request. Refresh this order before trying again.'};}}
export async function readOrderAftercare(access:AftercareAccess){return run(async()=> (await client(access)).getOrderAftercare(access));}
export async function cancelStorefrontOrder(access:AftercareAccess,reason:string){return run(async()=> (await client(access)).cancelOrder(access,reason));}
export async function requestStorefrontReturn(access:AftercareAccess,input:ReturnRequestInput){return run(async()=> (await client(access)).requestReturn(access,input));}
export async function saveReturnTracking(access:AftercareAccess,requestId:string,trackingNumber:string,carrier:'ups'|'usps'|'fedex'){return run(async()=> (await client(access)).saveReturnTracking(access,{requestId,trackingNumber,carrier}));}

export async function downloadReturnPackingSlip(access:AftercareAccess,requestId:string){return run(async()=> (await client(access)).getReturnPackingSlip(access,requestId));}
