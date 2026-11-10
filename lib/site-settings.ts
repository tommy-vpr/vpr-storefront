import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { publicContentCache } from './public-content-cache'
import { optimizedImageURL } from './media-image'

/**
 * Site → Site settings, resolved to plain values with the storefront's built-in defaults
 * filled in. Components take this object; none of them touch Payload directly.
 */
export interface SiteLink { label: string; href: string; external?: boolean }

export interface SiteSettings {
  siteName: string
  logo: { src: string; width: number; height: number; alt: string }
  faviconUrl: string | null
  announcement: { enabled: boolean; text: string; href: string | null }
  warning: { enabled: boolean; line1: string; line2: string }
  headerHiddenCollectionIds: number[]
  headerLinks: SiteLink[]
  footerQuickLinks: SiteLink[]
  footerServiceLinks: SiteLink[]
  contact: { phone: string; email: string; hours: string[] }
  legalText: string | null
  newsletterFormUrl: string | null
}

export const DEFAULT_HEADER_LINKS: SiteLink[] = [
  { label: 'IJoy', href: '/collections/skwezed-ijoy' },
  { label: 'Wholesale App', href: '/wholesale-application' },
  { label: 'Merch', href: '/collections/skwezed-merch' },
  { label: 'Contact', href: '/contact' },
]
/** Slugs the header's auto brand grouping skips by default (they're linked explicitly above). */
export const DEFAULT_HEADER_HIDDEN_SLUGS = ['skwezed-ijoy', 'skwezed-merch']

export const DEFAULTS: SiteSettings = {
  siteName: process.env.NEXT_PUBLIC_STORE_NAME || 'VPR Collection',
  logo: { src: '/images/logo-main.png', width: 150, height: 24, alt: 'VPR Collection' },
  faviconUrl: null,
  announcement: { enabled: true, text: 'Free Shipping On Every Order!', href: null },
  warning: { enabled: true, line1: 'Warning: This product contain nicotine.', line2: 'Nicotine is an addictive chemical.' },
  headerHiddenCollectionIds: [],
  headerLinks: DEFAULT_HEADER_LINKS,
  footerQuickLinks: [
    { label: 'Pact Act', href: '/pact-app' },
    { label: 'Wholesale App', href: '/wholesale-application' },
    { label: 'Skwezed Retail Site', href: 'https://www.skwezed.com/', external: true },
  ],
  footerServiceLinks: [
    { label: 'Partnership Support', href: '/partnership-support' },
    { label: 'Shipping & Return', href: '/shipping-returns' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Contact Us', href: '/contact' },
  ],
  contact: { phone: '(626) 698-0098', email: 'info@vprcollection.com', hours: ['Monday - Friday', '10:00a-5:00p PST'] },
  legalText: null,
  newsletterFormUrl: 'https://form.jotform.com/240252043265446',
}

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
    logo: logoMedia?.url ? { src: optimizedImageURL(logoMedia, 600) ?? logoMedia.url, width: logoW, height: logoH, alt: logoMedia.alt || d.logo.alt } : { ...d.logo, width: logoW, height: Math.round((logoW * 88) / 544) },
    faviconUrl: g.favicon && typeof g.favicon === 'object' ? g.favicon.url ?? null : null,
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
