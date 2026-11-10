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
export type BenefitIcon = 'truck' | 'rotate' | 'card' | 'shield' | 'clock' | 'star' | 'package'
export interface HeroSlide { src: string; alt: string; href: string | null }
export interface Benefit { icon: BenefitIcon; title: string; description: string }
export interface QuickLinkTile { label: string; href: string; src: string }
export interface BrandBanner { quote: string; name: string; designation: string; src: string; bgColor: string; darkBg: boolean }

export interface HomepageContent {
  hero: { enabled: boolean; slides: HeroSlide[] }
  benefits: { enabled: boolean; items: Benefit[] }
  showcase: { enabled: boolean; heading: string; hiddenCollectionIds: number[]; imageByCollectionId: Map<number, string>; fallbackSrc: string }
  quickLinks: { enabled: boolean; items: QuickLinkTile[] }
  banners: { enabled: boolean; items: BrandBanner[] }
}

export const HOME_DEFAULTS: HomepageContent = {
  hero: {
    enabled: true,
    slides: [
      { src: '/images/VPR-web_banners_2.webp', alt: 'SKWEZED wholesale collection', href: null },
      { src: '/images/VPR-web_banners.webp', alt: 'iJoy x SKWEZED collection', href: null },
    ],
  },
  benefits: {
    enabled: true,
    items: [
      { icon: 'rotate', title: '90-Day Buy Back', description: 'Enjoy stress-free ordering with our 90-day buy back policy. Your satisfaction is guaranteed, making your purchase risk-free.' },
      { icon: 'truck', title: 'Free Shipping', description: 'No need to worry about additional shipping charges. Enjoy the convenience of free shipping on all orders placed with us.' },
      { icon: 'card', title: 'No Credit Card Fees', description: 'Shop without worrying about extra fees — our no credit card fee policy ensures simple, transparent transactions for all.' },
    ],
  },
  showcase: { enabled: true, heading: 'The VPR Collection', hiddenCollectionIds: [], imageByCollectionId: new Map(), fallbackSrc: '/images/skwezed_product_main.webp' },
  quickLinks: {
    enabled: true,
    items: [
      { label: 'Quick Order', href: '/quick-order', src: '/images/ql_quick_order.webp' },
      { label: 'Sample Request', href: '/sample-request', src: '/images/ql_sample_request.webp' },
      { label: 'Wholesale', href: '/wholesale-application', src: '/images/ql_wholesale.webp' },
    ],
  },
  banners: {
    enabled: true,
    items: [
      { quote: 'VPR Collection has been our go-to for wholesale for two years. Fast shipping, real prices, and the support team actually picks up.', name: 'Skwezed', designation: 'Tastes Just Like It!', src: '/images/skwezed_banner_main.webp', bgColor: '#22c55e', darkBg: false },
      { quote: 'The pricing structure is transparent and the 90-day buy back policy has saved us from being stuck with slow-moving SKUs.', name: 'iJoy x Skwezed', designation: 'Buyer, Vape District', src: '/images/ijoy_banner_main.webp', bgColor: '#fb923c', darkBg: false },
      { quote: 'Free shipping on every order makes a real difference on our margins. Haven\'t found another wholesale partner that does it.', name: 'Blankers', designation: 'Blanker x Skwezed', src: '/images/blanker_banner_main.webp', bgColor: '#101010', darkBg: true },
    ],
  },
}

/** Built-in slug → tile image map, used until Homepage → Collection showcase has its own rows. */
export const DEFAULT_SHOWCASE_IMAGES: Record<string, string> = {
  'skwezed-freebase': '/images/skwezed_product_main.webp',
  'skwezed-30ml': '/images/skwezed_30ml_product_main.webp',
  'skwezed-ijoy': '/images/ijoy_product_main.webp',
}
export const DEFAULT_SHOWCASE_HIDDEN_SLUGS = ['merch', 'skwezed-merch']

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
  const imageByCollectionId = new Map<number, string>()
  for (const row of g.showcaseImages ?? []) {
    const id = relId(row.collection); const src = img(row.image, 900)
    if (id !== null && src) imageByCollectionId.set(id, src)
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
