type ImageFile = {url?: string | null; width?: number | null; filesize?: number | null; mimeType?: string | null};
type ImageMedia = ImageFile & {sizes?: Record<string, ImageFile | null> | null};
/**
 * Payload returns absolute URLs under serverURL for files it serves itself (local dev without
 * GCS, or a private bucket). Make those site-relative so next/image's localPatterns apply and
 * the host never has to be in remotePatterns; GCS URLs pass through untouched.
 */
export function cmsMediaURL(value: string): string {
 const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
 try {
  const url = new URL(value, site);
  return url.origin === new URL(site).origin ? url.pathname + url.search : url.toString();
 } catch {
  return value;
 }
}

/** Smallest webp rendition that still covers the target width; falls back to the original. */
export function optimizedImageURL(value: unknown, targetWidth = 1280): string | null {
 if (!value || typeof value !== 'object') return null;
 const media = value as ImageMedia;
 if (!media.url) return null;
 if (media.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(media.mimeType)) return cmsMediaURL(media.url);
 const variants = Object.values(media.sizes || {}).filter((file): file is ImageFile => Boolean(file?.url && file.width && file.mimeType === 'image/webp' && (!media.filesize || !file.filesize || file.filesize < media.filesize))).sort((a,b) => a.width! - b.width!);
 const suitable = variants.find(file => file.width! >= Math.min(targetWidth, media.width || targetWidth));
 return cmsMediaURL(suitable?.url || media.url);
}
