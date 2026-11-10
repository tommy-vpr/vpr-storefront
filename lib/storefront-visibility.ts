import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { publicContentCache } from './public-content-cache'

/**
 * WMS product IDs the CMS says to hide — "Show on storefront" unticked in Store → All
 * products, or a product WMS has since unassigned from this store. Applied on top of
 * the live, store-scoped WMS API.
 */
const readHiddenProductIds = publicContentCache('hidden-product-ids-v2', async (liveCatalog = false) => {
  const payload = await getPayload({ config })
  const products = await payload.find({ collection: 'products', pagination: false, depth: 0, overrideAccess: true, select: { wmsProductId: true, showInStorefront: true, assignmentStatus: true } })
  const hidden: string[] = []
  for (const doc of products.docs) {
    if (!doc.showInStorefront || (!liveCatalog && doc.assignmentStatus === 'unassigned')) hidden.push(doc.wmsProductId)
  }
  return hidden
})

const safe = async (liveCatalog: boolean) => {
  if (!process.env.PAYLOAD_DATABASE_URL) return new Set<string>()
  try {
    return new Set(await readHiddenProductIds(liveCatalog))
  } catch (err) {
    console.error('[storefront-visibility] CMS unavailable, hiding nothing', err instanceof Error ? err.message : err)
    return new Set<string>()
  }
}

export const getHiddenProductIds = cache(() => safe(false))
/** Only filter products already authorised by the live WMS API; the CMS assignment snapshot may be stale. */
export const getLiveCatalogHiddenProductIds = cache(() => safe(true))
