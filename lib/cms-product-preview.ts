import type { Payload, PayloadRequest } from 'payload';
import { optimizedImageURL } from './media-image';

type PreviewRow = {images?: unknown; imageUrl?: unknown; title?: unknown};
/** First gallery image of a Store → All products row, else the WMS image URL. */
export async function visibilityProductImage(payload: Payload, row: PreviewRow, req?: PayloadRequest, width=320): Promise<string|null> {
 const image=(row.images as {image?:unknown}[]|null|undefined)?.[0]?.image ?? null;
 const media=typeof image==='number' || typeof image==='string'
  ? await payload.findByID({collection:'media',id:image,depth:0,overrideAccess:false,disableErrors:true,...(req?{req}:{})}) : image;
 return optimizedImageURL(media,width) || (typeof row.imageUrl==='string' && row.imageUrl ? row.imageUrl : null);
}
