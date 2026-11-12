import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { Client } from 'pg';
import type { Payload, TaskConfig, Where } from 'payload';

export function wmsImageURL(source: string): URL {
 const url = new URL(source);
 if (url.protocol !== 'https:' || url.port || url.username || url.password ||
   !(url.hostname === 'storage.googleapis.com' || url.hostname.endsWith('.storage.googleapis.com') || url.hostname === 'cdn.shopify.com')) {
  throw new Error('Unsupported WMS image host. Upload this image manually.');
 }
 return url;
}
export async function importWmsImage(payload: Payload, source: string, alt: string) {
 const url = wmsImageURL(source);
 // Ignore signed URL credentials: the same storage object must reuse its Media record.
 const sourceKey = 'wms-image:' + createHash('sha256').update(url.origin + url.pathname).digest('hex');
 const existing = (await payload.find({collection:'media',where:{sourceKey:{equals:sourceKey}},limit:1,depth:0})).docs[0];
 if (existing) return existing;
 const response = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
 if (!response.ok) throw new Error(`WMS image download failed (HTTP ${response.status}).`);
 if (!response.body || Number(response.headers.get('content-length')) > 20*1024*1024) throw new Error('Image exceeds the 20 MB import limit.');
 const chunks: Uint8Array[] = []; let size=0;
 const reader=response.body.getReader();
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20*1024*1024){await reader.cancel();throw new Error('Image exceeds the 20 MB import limit.');}chunks.push(value);}}finally{reader.releaseLock();}
 const data=Buffer.concat(chunks);
 const metadata=await sharp(data,{limitInputPixels:40000000}).metadata();
 const formats: Record<string,{extension:string;mime:string}>={jpeg:{extension:'jpg',mime:'image/jpeg'},png:{extension:'png',mime:'image/png'},webp:{extension:'webp',mime:'image/webp'},gif:{extension:'gif',mime:'image/gif'}};
 const format=metadata.format && formats[metadata.format];
 if(!format)throw new Error('Unsupported WMS image format. Upload JPEG, PNG, WebP or GIF.');
 return payload.create({collection:'media',data:{alt,sourceKey},file:{data,size,mimetype:format.mime,name:'wms-'+sourceKey.slice(-24)+'.'+format.extension}});
}
export async function importWmsContentImage(payload: Payload, productId: number) {
 const lock=new Client({connectionString:process.env.PAYLOAD_DATABASE_URL||process.env.DATABASE_URL,connectionTimeoutMillis:10000});
 await lock.connect();
 try {
  // Transaction-scoped locks stay on one backend through Supabase transaction pooling.
  await lock.query('BEGIN');
  await lock.query("SET LOCAL lock_timeout = '30s'");
  await lock.query('SELECT pg_advisory_xact_lock(hashtext($1))',['vpr-wms-image-import-v1']);
  const doc=await payload.findByID({collection:'products',id:productId,depth:0,disableErrors:true});
  if(!doc || !['pending','failed'].includes(doc.wmsImageImportStatus || '') || !doc.wmsImageSourceUrl || doc.images?.length)return;
  const unchanged: Where={and:[{id:{equals:doc.id}},{updatedAt:{equals:doc.updatedAt}},{wmsImageImportStatus:{in:['pending','failed']}}]};
  try {
   const media=await importWmsImage(payload,doc.wmsImageSourceUrl,doc.title);
   await payload.update({collection:'products',where:unchanged,data:{images:[{image:media.id}],wmsImageImportStatus:'complete',wmsImageImportError:null},context:{wmsContentSync:true}});
  } catch(error) {
   // Never store download URLs/tokens in errors. The next job attempt can retry.
   await payload.update({collection:'products',where:unchanged,data:{wmsImageImportStatus:'failed',wmsImageImportError:'Image import failed. Retry Sync from WMS, or upload an image manually.'},context:{wmsContentSync:true}});
   throw error;
  }
 }finally{try{await lock.query('ROLLBACK');}finally{await lock.end();}}
}
export const wmsContentImageTask: TaskConfig<{input:{productId:number};output:Record<string,never>}>={
 slug:'import-wms-content-image',label:'Import WMS product image',
 inputSchema:[{name:'productId',type:'number',required:true}],
 retries:{attempts:3,backoff:{type:'exponential',delay:10000}},
 handler:async({input,req})=>{await importWmsContentImage(req.payload,input.productId);return {output:{}};},
};
