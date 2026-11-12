/**
 * Site → Site settings: types + the storefront's built-in values. No server-only import so
 * scripts (cms:seed) and client components can use the types/defaults.
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
