import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { publicContentCache } from './public-content-cache'
import { optimizedImageURL } from './media-image'

/**
 * Site → Homepage, resolved to plain props for app/(shop)/page.tsx. Every list falls back to
 * the content the storefront shipped with, so an empty global renders the page unchanged.
 */
export type { BenefitIcon, HeroSlide, Benefit, QuickLinkTile, BrandBanner, HomepageContent } from './homepage-defaults'
export { HOME_DEFAULTS, DEFAULT_SHOWCASE_IMAGES, DEFAULT_SHOWCASE_HIDDEN_SLUGS } from './homepage-defaults'
import { HOME_DEFAULTS, type BenefitIcon, type HeroSlide, type QuickLinkTile, type BrandBanner, type HomepageContent } from './homepage-defaults'

const img = (m: unknown, w: number) => optimizedImageURL(m, w)
const relId = (r: unknown): number | null => (typeof r === 'object' && r ? (r as { id: number }).id : typeof r === 'number' ? r : Number.isFinite(Number(r)) ? Number(r) : null)
const nonEmpty = <T,>(list: T[], d: T[]) => (list.length ? list : d)

const readHomepage = publicContentCache('homepage-v1', async (): Promise<HomepageContent> => {
  const payload = await getPayload({ config })
  const g = await payload.findGlobal({ slug: 'homepage', depth: 1 })
  const d = HOME_DEFAULTS
  const slides = (g.heroSlides ?? []).map((s) => ({ src: img(s.image, 2400), alt: s.title, href: s.href?.trim() || null })).filter((s): s is HeroSlide => Boolean(s.src))
  const benefits = (g.benefits ?? []).map((b) => ({ icon: (b.icon ?? 'truck') as BenefitIcon, title: b.title, description: b.description }))
  const tiles = (g.quickLinks ?? []).map((q) => ({ label: q.label, href: q.href, src: img(q.image, 900) })).filter((q): q is QuickLinkTile => Boolean(q.src))
  const banners = (g.banners ?? []).map((b) => ({ quote: b.quote, name: b.name, designation: b.designation ?? '', src: img(b.image, 1200), bgColor: b.bgColor?.trim() || '#101010', darkBg: b.darkBg !== false })).filter((b): b is BrandBanner => Boolean(b.src))
  const imageByCollectionId: Record<string, string> = {}
  for (const row of g.showcaseImages ?? []) {
    const id = relId(row.collection); const src = img(row.image, 900)
    if (id !== null && src) imageByCollectionId[String(id)] = src
  }
  return {
    hero: { enabled: g.heroEnabled !== false, slides: nonEmpty(slides, d.hero.slides) },
    benefits: { enabled: g.benefitsEnabled !== false, items: nonEmpty(benefits, d.benefits.items) },
    showcase: {
      enabled: g.showcaseEnabled !== false,
      heading: g.showcaseHeading?.trim() || d.showcase.heading,
      hiddenCollectionIds: (g.showcaseHidden ?? []).map(relId).filter((n): n is number => n !== null),
      imageByCollectionId,
      fallbackSrc: img(g.showcaseFallback, 900) ?? d.showcase.fallbackSrc,
    },
    quickLinks: { enabled: g.quickLinksEnabled !== false, items: nonEmpty(tiles, d.quickLinks.items) },
    banners: { enabled: g.bannersEnabled !== false, items: nonEmpty(banners, d.banners.items) },
  }
})

/** Never throws: the homepage must render during a CMS outage. */
export const getHomepage = cache(async (): Promise<HomepageContent> => {
  if (!process.env.PAYLOAD_DATABASE_URL || !process.env.PAYLOAD_SECRET) return HOME_DEFAULTS
  try {
    return await readHomepage()
  } catch (err) {
    console.error('[homepage] CMS unavailable, using defaults', err instanceof Error ? err.message : err)
    return HOME_DEFAULTS
  }
})
