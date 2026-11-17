import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { ProductListItem } from './wms/types'
import { optimizedImageURL } from './media-image'
import { productGalleryImages } from './product-gallery'
import { publicContentCache } from './public-content-cache'

/** Image URL for a Media doc; same-origin URLs are kept relative. */
export function contentImageURL(media: unknown, width = 1280): string | null {
  const selected = optimizedImageURL(media, width)
  if (!selected) return null
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'
  const url = new URL(selected, site)
  return url.origin === new URL(site).origin ? url.pathname + url.search : url.toString()
}

const readProductContent = publicContentCache('product-content-v2', async (wmsProductId: string) => {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'products', where: { wmsProductId: { equals: wmsProductId } }, limit: 1, depth: 1, overrideAccess: false })
  return result.docs[0] || null
})

/** Store → All products record for a WMS product (null when none, hidden, or the CMS is down). */
export const getProductContent = cache(async (wmsProductId: string) => {
  if (!process.env.PAYLOAD_DATABASE_URL) return null
  try {
    return await readProductContent(wmsProductId)
  } catch (error) {
    console.error('[product-content] CMS unavailable', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
})

const readListingImages = publicContentCache('listing-images-v2', async (productIds: string[]) => {
  const payload = await getPayload({ config })
  const content = await payload.find({ collection: 'products', where: { wmsProductId: { in: productIds } }, pagination: false, depth: 1, overrideAccess: false, select: { wmsProductId: true, images: true } })
  return content.docs.map((doc) => ({ productId: doc.wmsProductId, images: (doc.images ?? []).map((item) => contentImageURL(item.image, 640)) }))
})

/** Swap listing-card images for the CMS gallery's first image where one exists. */
export async function withProductListingImages(products: ProductListItem[]): Promise<ProductListItem[]> {
  if (!products.length || !process.env.PAYLOAD_DATABASE_URL) return products
  const images = new Map<string, (string | null)[]>()
  try {
    const content = await readListingImages([...new Set(products.map((product) => product.productId))].sort())
    for (const doc of content) if (doc.productId) images.set(doc.productId, doc.images)
  } catch (error) {
    console.error('[product-images] CMS unavailable', error instanceof Error ? error.message : 'Unknown error')
  }
  return products.map((product) => ({
    ...product,
    imageUrl: productGalleryImages(product.imageUrl, images.get(product.productId) ?? [], (product.variants ?? []).map((variant) => variant.imageUrl))[0] ?? null,
  }))
}
