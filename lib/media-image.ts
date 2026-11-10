type ImageFile = {url?: string | null; width?: number | null; filesize?: number | null; mimeType?: string | null};
type ImageMedia = ImageFile & {sizes?: Record<string, ImageFile | null> | null};
/** Smallest webp rendition that still covers the target width; falls back to the original. */
export function optimizedImageURL(value: unknown, targetWidth = 1280): string | null {
 if (!value || typeof value !== 'object') return null;
 const media = value as ImageMedia;
 if (!media.url) return null;
 if (media.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(media.mimeType)) return media.url;
 const variants = Object.values(media.sizes || {}).filter((file): file is ImageFile => Boolean(file?.url && file.width && file.mimeType === 'image/webp' && (!media.filesize || !file.filesize || file.filesize < media.filesize))).sort((a,b) => a.width! - b.width!);
 const suitable = variants.find(file => file.width! >= Math.min(targetWidth, media.width || targetWidth));
 return suitable?.url || media.url;
}
