import Link from 'next/link';
import type {PayloadRequest} from 'payload';

export async function CmsCollectionProducts({id,req}: {id?:number|string;req:PayloadRequest}) {
 if(!id || !req.user)return null;
 const products=await req.payload.find({collection:'products',where:{collections:{equals:id}},pagination:false,depth:0,overrideAccess:false,req});
 const base=req.payload.config.routes.admin+'/collections/';
 const query=new URLSearchParams({'where[collections][equals]':String(id)});
 return <section style={{marginBlock:'1.5rem'}}>
  <p>{products.totalDocs} synced {products.totalDocs===1?'product':'products'} in this collection.</p>
  <Link href={`${base}products?${query}`} prefetch={false}>Open in All products</Link>
 </section>;
}
