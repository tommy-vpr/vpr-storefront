import type {PayloadRequest} from 'payload';
import {visibilityProductImage} from '@/lib/cms-product-preview';

export async function CmsVisibilityImage({data,req}: {data: {images?:unknown;imageUrl?:unknown;title?:string};req:PayloadRequest}) {
 if(!req.user)return null;
 const source=await visibilityProductImage(req.payload,data,req,640);
 return <section style={{marginBottom:24}}>
  <p style={{marginBottom:12,fontWeight:600}}>Product image</p>
  {source
   // Keep image previews compatible with both Payload and WMS image URLs.
   // eslint-disable-next-line @next/next/no-img-element
   ? <img src={source} alt={data.title || 'Product image'} width={240} height={240} style={{display:'block',width:240,height:240,maxWidth:'100%',objectFit:'contain'}} />
   : <p>No product image available.</p>}
 </section>;
}
