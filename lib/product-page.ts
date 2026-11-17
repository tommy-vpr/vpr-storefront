import 'server-only'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { ProductPage } from '@/payload-types'
import { publicContentCache } from '@/lib/public-content-cache'
import { getClient } from '@/lib/wms/session'
import type { ProductListItem } from '@/lib/wms/types'
import { presentCollections } from '@/lib/collection-presentation'

export type ProductSection = NonNullable<ProductPage['sections']>[number]

/** What the product page renders when the template has never been saved. */
export const DEFAULT_PRODUCT_SECTIONS: ProductSection[] = [
  { blockType: 'productHero', showBrand: true, showBreadcrumbs: true },
  { blockType: 'productDescription', heading: 'Description' },
  { blockType: 'productDetails', showSku: true, showCategory: true },
  { blockType: 'relatedProducts', heading: 'You may also like', source: 'auto', limit: 4 },
]

const readSections = publicContentCache('product-page-sections-v1', async () => {
  const payload = await getPayload({ config })
  const doc = await payload.findGlobal({ slug: 'product-page', depth: 1, overrideAccess: false })
  return doc.sections?.length ? doc.sections : DEFAULT_PRODUCT_SECTIONS
})

/** Site → Product page template: ordered sections, with the default stack as fallback. */
export async function getProductPageSections(): Promise<ProductSection[]> {
  if (!process.env.PAYLOAD_DATABASE_URL) return DEFAULT_PRODUCT_SECTIONS
  try {
    return await readSections()
  } catch (error) {
    console.error('[product-page] CMS unavailable', error instanceof Error ? error.message : 'Unknown error')
    return DEFAULT_PRODUCT_SECTIONS
  }
}

type RelatedArgs = {
  productId: string
  /** WMS product ids hand-picked on the product (Store → All products → Related). */
  picks: string[]
  /** Collection slugs the product belongs to, from the synced record. */
  ownCollectionSlugs: string[]
  source: 'auto' | 'collection' | 'fixed'
  fixedCollectionSlug: string | null
  /** Collection the shopper arrived from (?from=). */
  fromCollectionSlug: string | null
  limit: number
}

/**
 * "You may also like" — hand-picked products first, then filled from a collection: the one
 * the shopper came from / the product's own (auto), or a fixed one chosen on the template.
 * Never the product itself, never duplicates. Uses the same client as the listing pages so
 * per-customer prices and CMS visibility apply.
 */
export async function getRelatedProducts(args: RelatedArgs): Promise<ProductListItem[]> {
  const client = getClient()
  const out: ProductListItem[] = []
  const seen = new Set<string>([args.productId])
  const push = (items: ProductListItem[]) => {
    for (const item of items) {
      if (out.length >= args.limit || seen.has(item.productId)) continue
      seen.add(item.productId)
      out.push(item)
    }
  }
  const listing = async (slug: string | null) => {
    if (!slug) return []
    try {
      return (await client.getCollectionProducts(slug, { take: 48 })).products
    } catch {
      return []
    }
  }

  const pool: string[] = []
  if (args.source === 'fixed') pool.push(args.fixedCollectionSlug ?? '')
  else pool.push(args.fromCollectionSlug ?? '', ...args.ownCollectionSlugs)
  let pools = [...new Set(pool.filter(Boolean))]
  // Nothing known about where this product lives (not synced yet, direct link): find a
  // visible collection that contains it.
  if (!pools.length && args.source !== 'fixed') {
    try {
      const visible = await presentCollections((await client.getCollections()).collections)
      const lists = await Promise.all(visible.map((c) => listing(c.slug)))
      const idx = lists.findIndex((l) => l.some((p) => p.productId === args.productId))
      pools = [visible[idx >= 0 ? idx : 0]?.slug].filter(Boolean) as string[]
    } catch {
      pools = []
    }
  }

  const lists = await Promise.all(pools.map(listing))
  if (args.picks.length) {
    const byId = new Map<string, ProductListItem>()
    for (const list of lists) for (const item of list) byId.set(item.productId, item)
    push(args.picks.map((id) => byId.get(id)).filter((x): x is ProductListItem => Boolean(x)))
  }
  if (args.source !== 'fixed' || args.fixedCollectionSlug) for (const list of lists) push(rotateAround(list, args.productId))
  return out
}

/**
 * Start the fill from the product's own position in the listing and wrap around, so every
 * product recommends its neighbours instead of the same first N of the collection. When the
 * product is not in the list (fixed collection), start from a stable offset derived from its id
 * so different products still spread across the collection.
 */
function rotateAround(list: ProductListItem[], productId: string): ProductListItem[] {
  if (list.length < 2) return list
  let i = list.findIndex((p) => p.productId === productId)
  if (i < 0) {
    let h = 0
    for (const ch of productId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    i = (h % list.length) - 1
  }
  const start = (i + 1 + list.length) % list.length
  return [...list.slice(start), ...list.slice(0, start)]
}
