import type { DefaultServerCellComponentProps } from 'payload';
import type { Media } from '@/payload-types';
import { visibilityProductImage } from '@/lib/cms-product-preview';
import { FileText, Film, ImageOff } from 'lucide-react';

export async function CmsThumbnailCell({rowData, collectionSlug, payload}: DefaultServerCellComponentProps) {
  const media: Media | null = collectionSlug === 'media' ? rowData as Media : null;
  const source = collectionSlug === 'products' ? await visibilityProductImage(payload,rowData) : media?.sizes?.thumbnail?.url || media?.url;
  const isImage = collectionSlug === 'products' ? Boolean(source) : media?.mimeType?.startsWith('image/');
  const Icon = media?.mimeType === 'application/pdf' ? FileText : media?.mimeType?.startsWith('video/') ? Film : ImageOff;
  const label = media?.mimeType === 'application/pdf' ? 'PDF' : media?.mimeType?.startsWith('video/') ? 'Video' : 'No image';
  return <div className="cms-image-preview" style={{width: 56, height: 56, minWidth: 56, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    {isImage && source
      // Plain image keeps the admin preview independent of Next image host rules.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={source} alt={media?.alt || (collectionSlug === 'products' ? rowData.title : '') || ''} loading="lazy" width={56} height={56} style={{display: 'block', width: 56, height: 56, maxWidth: 56, maxHeight: 56, objectFit: 'contain'}} />
      : <span title={label} role="img" aria-label={label}><Icon size={24} /></span>}
  </div>;
}

export function CmsThumbnailField() { return null; }
