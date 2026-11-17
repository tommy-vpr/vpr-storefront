import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { publicContentCache } from './public-content-cache'
import { cmsMediaURL, optimizedImageURL } from './media-image'

/**
 * Site → Site settings, resolved to plain values with the storefront's built-in defaults
 * filled in. Components take this object; none of them touch Payload directly.
 */
export type { SiteLink, SiteSettings } from './site-defaults'
export { DEFAULTS, DEFAULT_HEADER_LINKS, DEFAULT_HEADER_HIDDEN_SLUGS } from './site-defaults'
import { DEFAULTS, type SiteLink, type SiteSettings } from './site-defaults'

const str = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim() : d)
const links = (rows: unknown, d: SiteLink[]): SiteLink[] => {
  if (!Array.isArray(rows) || !rows.length) return d
  return rows
    .map((r) => (r && typeof r === 'object' ? (r as { label?: string; href?: string; external?: boolean }) : null))
    .filter((r): r is { label: string; href: string; external?: boolean } => Boolean(r?.label && r?.href))
    .map((r) => ({ label: r.label, href: r.href, external: Boolean(r.external) || /^https?:\/\//.test(r.href) && !r.href.startsWith(process.env.NEXT_PUBLIC_SITE_URL || '\u0000') }))
}
const ids = (rels: unknown): number[] => (Array.isArray(rels) ? rels.map((r) => (typeof r === 'object' && r ? (r as { id: number }).id : Number(r))).filter((n) => Number.isFinite(n)) : [])

const readSettings = publicContentCache('site-settings-v1', async (): Promise<SiteSettings> => {
  const payload = await getPayload({ config })
  const g = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  const d = DEFAULTS
  const logoMedia = g.logo && typeof g.logo === 'object' ? g.logo : null
  const logoW = typeof g.logoWidth === 'number' && g.logoWidth > 0 ? g.logoWidth : d.logo.width
  const logoH = logoMedia?.width && logoMedia?.height ? Math.round((logoW * logoMedia.height) / logoMedia.width) : d.logo.height
  const hours = str(g.contactHours, d.contact.hours.join('\n')).split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    siteName: str(g.siteName, d.siteName),
    logo: logoMedia?.url ? { src: optimizedImageURL(logoMedia, 600) ?? cmsMediaURL(logoMedia.url), width: logoW, height: logoH, alt: logoMedia.alt || d.logo.alt } : { ...d.logo, width: logoW, height: Math.round((logoW * 88) / 544) },
    faviconUrl: g.favicon && typeof g.favicon === 'object' && g.favicon.url ? cmsMediaURL(g.favicon.url) : null,
    announcement: { enabled: g.announcementEnabled !== false, text: str(g.announcementText, d.announcement.text), href: str(g.announcementHref, '') || null },
    warning: { enabled: g.warningEnabled !== false, line1: str(g.warningLine1, d.warning.line1), line2: str(g.warningLine2, d.warning.line2) },
    headerHiddenCollectionIds: ids(g.headerHiddenCollections),
    headerLinks: links(g.headerLinks, d.headerLinks),
    footerQuickLinks: links(g.footerQuickLinks, d.footerQuickLinks),
    footerServiceLinks: links(g.footerServiceLinks, d.footerServiceLinks),
    contact: { phone: str(g.contactPhone, d.contact.phone), email: str(g.contactEmail, d.contact.email), hours: hours.length ? hours : d.contact.hours },
    legalText: str(g.legalText, '') || null,
    newsletterFormUrl: str(g.newsletterFormUrl, d.newsletterFormUrl ?? '') || null,
  }
})

/** Never throws: the header/footer must render during a CMS outage. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!process.env.PAYLOAD_DATABASE_URL || !process.env.PAYLOAD_SECRET) return DEFAULTS
  try {
    return await readSettings()
  } catch (err) {
    console.error('[site-settings] CMS unavailable, using defaults', err instanceof Error ? err.message : err)
    return DEFAULTS
  }
})
