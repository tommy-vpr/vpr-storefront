import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { publicContentCache } from './public-content-cache'
import { optimizedImageURL } from './media-image'
import type { Collection } from './wms/types'

/**
 * Store → Collections presentation layer: per WMS collection slug, how the storefront
 * shows it (or hides it). Membership/prices stay WMS; this is display only.
 */
export interface CollectionPresentation {
  /** Payload record id — relationships elsewhere point at this. */
  id: number
  slug: string
  visible: boolean
  inMenu: boolean
  order: number
  title: string | null
  description: string | null
  bannerUrl: string | null
}

const readPresentation = publicContentCache('collection-presentation-v1', async (): Promise<CollectionPresentation[]> => {
  const payload = await getPayload({ config })
  const res = await payload.find({ collection: 'wms-collections', pagination: false, depth: 1, overrideAccess: true, sort: 'menuOrder' })
  return res.docs.map((d) => ({
    id: d.id,
    slug: d.slug,
    visible: d.assigned !== false && d.showInStorefront !== false,
    inMenu: d.showInMenu !== false,
    order: d.menuOrder ?? 0,
    title: d.displayTitle?.trim() || null,
    description: d.description?.trim() || null,
    bannerUrl: optimizedImageURL(d.banner, 1920),
  }))
})

export const getCollectionPresentation = cache(async (): Promise<Map<string, CollectionPresentation>> => {
  if (!process.env.PAYLOAD_DATABASE_URL) return new Map()
  try {
    return new Map((await readPresentation()).map((p) => [p.slug, p]))
  } catch (err) {
    console.error('[collection-presentation] CMS unavailable', err instanceof Error ? err.message : err)
    return new Map()
  }
})

/**
 * Turn Store → Collections relationship values into slugs. Those records are
 * admin-only to read, so public reads never populate the relationship (you get
 * bare ids back even at depth 1); this resolves them from the cached list.
 */
export async function collectionSlugsFromRefs(refs: unknown): Promise<string[]> {
  if (!refs) return []
  const list = Array.isArray(refs) ? refs : [refs]
  const byId = new Map<number, string>()
  for (const p of (await getCollectionPresentation()).values()) byId.set(p.id, p.slug)
  const out: string[] = []
  for (const ref of list) {
    if (ref && typeof ref === 'object' && 'slug' in ref && typeof (ref as { slug: unknown }).slug === 'string') out.push((ref as { slug: string }).slug)
    else if (typeof ref === 'number' && byId.has(ref)) out.push(byId.get(ref)!)
    else if (typeof ref === 'string' && byId.has(Number(ref))) out.push(byId.get(Number(ref))!)
  }
  return out
}

/** Apply presentation to live WMS collections: hidden ones dropped, overrides merged, CMS order first. */
export async function presentCollections(collections: Collection[], opts: { menuOnly?: boolean } = {}): Promise<Collection[]> {
  const pres = await getCollectionPresentation()
  if (!pres.size) return collections
  return collections
    .filter((c) => {
      const p = pres.get(c.slug)
      return !p || (p.visible && (!opts.menuOnly || p.inMenu))
    })
    .map((c) => presentCollection(c, pres.get(c.slug)))
    .sort((a, b) => (pres.get(a.slug)?.order ?? 0) - (pres.get(b.slug)?.order ?? 0))
}

export function presentCollection<T extends { slug: string; name: string; description: string | null; bannerUrl?: string | null }>(c: T, p?: CollectionPresentation | null): T {
  if (!p) return c
  return { ...c, name: p.title ?? c.name, description: p.description ?? c.description, bannerUrl: p.bannerUrl ?? c.bannerUrl }
}

/** True when the CMS hides this collection (an unknown slug is not hidden — WMS decides existence). */
export async function isCollectionHidden(slug: string): Promise<boolean> {
  const p = (await getCollectionPresentation()).get(slug)
  return Boolean(p && !p.visible)
}
