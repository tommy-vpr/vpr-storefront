export function productGalleryImages(primary: string | null | undefined, additional: (string | null | undefined)[], variants: (string | null | undefined)[]) {
 // Payload is the curated product gallery. Size variants often have separate
 // uploaded copies of the same photo, so appending them multiplies thumbnails.
 const gallery = [...new Set(additional.filter((url): url is string => Boolean(url?.trim())))];
 if (gallery.length) return gallery;
 const fallback = primary || variants.find(url => Boolean(url?.trim()));
 return fallback ? [fallback] : [];
}
