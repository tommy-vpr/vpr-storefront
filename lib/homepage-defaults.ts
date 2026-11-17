/**
 * Site → Homepage: types + the content the storefront shipped with. No server-only import so
 * scripts (cms:seed) and client components can use the types/defaults.
 */
export type BenefitIcon = 'truck' | 'rotate' | 'card' | 'shield' | 'clock' | 'star' | 'package'
export interface HeroSlide { src: string; alt: string; href: string | null }
export interface Benefit { icon: BenefitIcon; title: string; description: string }
export interface QuickLinkTile { label: string; href: string; src: string }
export interface BrandBanner { quote: string; name: string; designation: string; src: string; bgColor: string; darkBg: boolean }

export interface HomepageContent {
  hero: { enabled: boolean; slides: HeroSlide[] }
  benefits: { enabled: boolean; items: Benefit[] }
  /** `imageByCollectionId` is keyed by Store → Collections record id (a plain object: this result passes through unstable_cache). */
  showcase: { enabled: boolean; heading: string; hiddenCollectionIds: number[]; imageByCollectionId: Record<string, string>; fallbackSrc: string }
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
  showcase: { enabled: true, heading: 'The VPR Collection', hiddenCollectionIds: [], imageByCollectionId: {}, fallbackSrc: '/images/skwezed_product_main.webp' },
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
