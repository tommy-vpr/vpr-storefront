import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { publicContentCache } from './public-content-cache'
import type { Collection } from './wms/types'
import type { SiteLink } from './site-defaults'

/** One header menu entry; `children` = one level of dropdown. */
export interface NavItem { title: string; href: string; external?: boolean; children?: NavItem[] }

type Row = {
  label: string
  linkType: 'collection' | 'collections' | 'path' | 'url' | 'brands'
  collection?: number | { slug?: string | null } | null
  path?: string | null
  url?: string | null
  children?: Row[] | null
}

const readMenu = publicContentCache('navigation-v1', async (): Promise<Row[]> => {
  const payload = await getPayload({ config })
  const nav = await payload.findGlobal({ slug: 'navigation', depth: 1 })
  return (nav.mainMenu ?? []) as unknown as Row[]
})

/* ── built-in menu (no Navigation rows yet) ────────────────────────────────── */

export function groupByBrand(collections: Collection[]): Map<string, Collection[]> {
  const groups = new Map<string, Collection[]>()
  for (const c of collections) {
    const brand = c.brand ?? c.name.split(/\s+/)[0] ?? c.name
    const list = groups.get(brand)
    if (list) list.push(c)
    else groups.set(brand, [c])
  }
  return groups
}
const stripBrandPrefix = (name: string, brand: string) => (name.startsWith(`${brand} `) ? name.slice(brand.length + 1) : name)

/** Automatic brand menus: one entry per brand, a dropdown when the brand has several collections. */
export function brandMenus(collections: Collection[], hiddenSlugs: string[]): NavItem[] {
  const excluded = new Set(hiddenSlugs)
  return [...groupByBrand(collections.filter((c) => !excluded.has(c.slug))).entries()].map(([brand, cols]) =>
    cols.length === 1
      ? { title: brand, href: `/collections/${cols[0].slug}` }
      : { title: brand, href: `/collections/${cols[0].slug}`, children: cols.map((c) => ({ title: stripBrandPrefix(c.name, brand), href: `/collections/${c.slug}` })) },
  )
}

const fromLinks = (links: SiteLink[]): NavItem[] => links.map((l) => ({ title: l.label, href: l.href, external: l.external }))

/* ── resolve rows ──────────────────────────────────────────────────────────── */

function resolveRow(row: Row, slugById: Map<number, string>): NavItem | null {
  switch (row.linkType) {
    case 'collection': {
      const slug = typeof row.collection === 'object' && row.collection ? row.collection.slug : typeof row.collection === 'number' ? slugById.get(row.collection) : null
      return slug ? { title: row.label, href: `/collections/${slug}` } : null
    }
    case 'collections':
      return { title: row.label, href: '/all-collections' }
    case 'path':
      return row.path ? { title: row.label, href: row.path } : null
    case 'url':
      return row.url ? { title: row.label, href: row.url, external: true } : null
    default:
      return null
  }
}

export interface NavigationInput {
  /** Live, presentation-filtered WMS collections (menu-only). */
  collections: Collection[]
  /** Store → Collections record id → slug, for relationship rows that come back as bare ids. */
  slugById: Map<number, string>
  /** Site settings → Header: collections the automatic brand menus skip. */
  brandHiddenSlugs: string[]
  /** Site settings → Header links: appended in the built-in menu. */
  fallbackLinks: SiteLink[]
}

/**
 * Header menu. Navigation rows when there are any (a "brands" row expands to the automatic
 * brand menus); otherwise the built-in menu: brand menus + Site settings header links.
 * Never throws — a CMS outage yields the built-in menu.
 */
export const getNavigation = cache(async (input: NavigationInput): Promise<NavItem[]> => {
  const builtIn = () => [...brandMenus(input.collections, input.brandHiddenSlugs), ...fromLinks(input.fallbackLinks)]
  if (!process.env.PAYLOAD_DATABASE_URL || !process.env.PAYLOAD_SECRET) return builtIn()
  let rows: Row[]
  try {
    rows = await readMenu()
  } catch (err) {
    console.error('[navigation] CMS unavailable, using built-in menu', err instanceof Error ? err.message : err)
    return builtIn()
  }
  if (!rows.length) return builtIn()
  const out: NavItem[] = []
  for (const row of rows) {
    if (row.linkType === 'brands') {
      out.push(...brandMenus(input.collections, input.brandHiddenSlugs))
      continue
    }
    const own = resolveRow(row, input.slugById)
    const children = (row.children ?? []).map((c) => resolveRow(c, input.slugById)).filter((x): x is NavItem => x !== null)
    // A parent with no link of its own takes its first child's href.
    const href = own?.href ?? children[0]?.href
    if (!href) continue
    out.push({ title: row.label, href, external: own?.external, ...(children.length ? { children } : {}) })
  }
  return out
})
