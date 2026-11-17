import type { Endpoint } from 'payload';
import { syncWmsCatalog } from '../../lib/wms-catalog-sync';
import { revalidateTag } from 'next/cache';
import { CMS_CONTENT_TAG, WMS_CATALOG_TAG } from '../../lib/storefront-cache-policy';
export const syncCatalogEndpoint: Endpoint = {
 path: '/sync-wms', method: 'post', handler: async req => {
  if (!req.user) return Response.json({error: 'Sign in to Payload to sync.'}, {status: 401});
  const origin = req.headers.get('origin');
  if (!req.headers.get('content-type')?.includes('application/json') || (origin && origin !== new URL(req.url!).origin)) {
   return Response.json({error: 'Invalid request origin.'}, {status: 403});
  }
  let body: {collectionId?: unknown};
  try {body=await req.json!();} catch{return Response.json({error:'Invalid JSON body.'},{status:400});}
  if(!body || typeof body !== 'object' || Array.isArray(body))return Response.json({error:'Invalid JSON body.'},{status:400});
  let collectionId: string | undefined;
  if(body.collectionId !== undefined) {
   if(typeof body.collectionId !== 'number' && typeof body.collectionId !== 'string') return Response.json({error:'Invalid collection ID.'},{status:400});
   const collection=await req.payload.findByID({collection:'wms-collections',id:body.collectionId,req,overrideAccess:false,disableErrors:true});
   if(!collection)return Response.json({error:'Collection not found.'},{status:404});
   collectionId=collection.wmsCollectionId;
  }
  try {
   const result = await syncWmsCatalog(req.payload, undefined, {collectionId});
   revalidateTag(CMS_CONTENT_TAG, {expire: 0});
   revalidateTag(WMS_CATALOG_TAG, {expire: 0});
   return Response.json(result);
  }
  catch (error) {
   req.payload.logger.error({err: error}, 'WMS catalog sync failed');
   return Response.json({error: error instanceof Error ? error.message : 'Sync failed'}, {status: 503});
  }
 },
};
