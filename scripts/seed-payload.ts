/**
 * Seed Payload with what the storefront shipped hard-coded:
 *
 *   npm run cms:seed            everything below
 *   npm run cms:seed -- --no-sync   skip the WMS catalogue sync (no WMS creds locally)
 *
 *  1. WMS catalogue → Store → Collections / All products (same code path as "Sync from WMS")
 *  2. public/images/* that the homepage, header and footer use → Site → Media (once; keyed by
 *     sourceKey so re-runs never duplicate)
 *  3. Site → Site settings + Site → Homepage filled with the shipped content, pointing at
 *     those Media records — create-only per field: a value an editor already set is kept.
 *
 * Idempotent: run it as often as you like, locally or against prod.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload, type Payload } from 'payload'
import config from '../payload.config'
import { HOME_DEFAULTS, DEFAULT_SHOWCASE_IMAGES, DEFAULT_SHOWCASE_HIDDEN_SLUGS } from '../lib/homepage-defaults'
import { DEFAULTS as SITE_DEFAULTS } from '../lib/site-defaults'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const imagesDir = path.join(root, 'public', 'images')
const args = new Set(process.argv.slice(2))
const NO_SYNC = args.has('--no-sync')

/* ------------------------------------------------------------------ media */

const mediaBySource = new Map<string, number>()

async function loadExistingMedia(payload: Payload) {
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: 'media', limit: 200, page, depth: 0, pagination: true })
    for (const d of res.docs) if (d.sourceKey) mediaBySource.set(d.sourceKey, d.id)
    if (!res.hasNextPage) break
    page++
  }
}

/** Upload one file from public/images (once); returns the media id. `src` is the site path, e.g. /images/foo.webp. */
async function uploadImage(payload: Payload, src: string, alt: string): Promise<number | null> {
  const sourceKey = `public:${src}`
  const existing = mediaBySource.get(sourceKey)
  if (existing !== undefined) return existing
  const filePath = path.join(imagesDir, path.basename(src))
  if (!fs.existsSync(filePath)) {
    console.warn(`  ! missing file ${filePath}`)
    return null
  }
  const doc = await payload.create({ collection: 'media', data: { alt: alt || path.basename(src), sourceKey }, filePath })
  mediaBySource.set(sourceKey, doc.id)
  console.log(`  + media ${path.basename(src)}`)
  return doc.id
}

/* ------------------------------------------------------------ catalogue */

async function syncCatalogue(payload: Payload) {
  if (NO_SYNC) return console.log('catalogue: skipped (--no-sync)')
  if (!process.env.WMS_API_URL || !process.env.WMS_API_KEY) return console.log('catalogue: skipped (WMS_API_URL / WMS_API_KEY not set)')
  const { syncWmsCatalog } = await import('../lib/wms-catalog-sync')
  const result = await syncWmsCatalog(payload)
  console.log('catalogue:', JSON.stringify(result))
}

/* -------------------------------------------------------------- globals */

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

/** Fill only the fields the editor has not set yet. */
async function fillGlobal<T extends 'site-settings' | 'homepage'>(payload: Payload, slug: T, defaults: Record<string, unknown>) {
  const current = (await payload.findGlobal({ slug, depth: 0 })) as unknown as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(defaults)) if (isEmpty(current[k]) && !isEmpty(v)) data[k] = v
  if (!Object.keys(data).length) return console.log(`${slug}: nothing to fill`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await payload.updateGlobal({ slug, data: data as any })
  console.log(`${slug}: filled ${Object.keys(data).join(', ')}`)
}

async function seedSiteSettings(payload: Payload) {
  const d = SITE_DEFAULTS
  await fillGlobal(payload, 'site-settings', {
    siteName: d.siteName,
    logo: await uploadImage(payload, d.logo.src, 'VPR Collection logo'),
    logoWidth: d.logo.width,
    favicon: await uploadImage(payload, '/images/vpr-fav-icon.png', 'VPR favicon'),
    announcementEnabled: true,
    announcementText: d.announcement.text,
    warningEnabled: true,
    warningLine1: d.warning.line1,
    warningLine2: d.warning.line2,
    headerLinks: d.headerLinks.map((l) => ({ label: l.label, href: l.href, external: Boolean(l.external) })),
    footerQuickLinks: d.footerQuickLinks.map((l) => ({ label: l.label, href: l.href, external: Boolean(l.external) })),
    footerServiceLinks: d.footerServiceLinks.map((l) => ({ label: l.label, href: l.href, external: Boolean(l.external) })),
    contactPhone: d.contact.phone,
    contactEmail: d.contact.email,
    contactHours: d.contact.hours.join('\n'),
    newsletterFormUrl: d.newsletterFormUrl,
  })
}

async function seedHomepage(payload: Payload) {
  const d = HOME_DEFAULTS
  // Showcase rows need Store → Collections records; those exist only after the catalogue sync.
  const collections = await payload.find({ collection: 'wms-collections', pagination: false, depth: 0, overrideAccess: true })
  const idBySlug = new Map(collections.docs.map((c) => [c.slug, c.id]))
  const showcaseImages: Array<{ collection: number; image: number }> = []
  for (const [slug, src] of Object.entries(DEFAULT_SHOWCASE_IMAGES)) {
    const collection = idBySlug.get(slug)
    const image = await uploadImage(payload, src, `${slug} tile`)
    if (collection && image) showcaseImages.push({ collection, image })
  }
  const showcaseHidden = DEFAULT_SHOWCASE_HIDDEN_SLUGS.map((s) => idBySlug.get(s)).filter((x): x is number => x !== undefined)

  const heroSlides = []
  for (const s of d.hero.slides) heroSlides.push({ image: await uploadImage(payload, s.src, s.alt), title: s.alt, href: s.href })
  const quickLinks = []
  for (const q of d.quickLinks.items) quickLinks.push({ label: q.label, href: q.href, image: await uploadImage(payload, q.src, q.label) })
  const banners = []
  for (const b of d.banners.items) banners.push({ image: await uploadImage(payload, b.src, b.name), name: b.name, designation: b.designation, quote: b.quote, bgColor: b.bgColor, darkBg: b.darkBg })

  await fillGlobal(payload, 'homepage', {
    heroEnabled: true,
    heroSlides: heroSlides.filter((s) => s.image),
    benefitsEnabled: true,
    benefits: d.benefits.items,
    showcaseEnabled: true,
    showcaseHeading: d.showcase.heading,
    showcaseHidden,
    showcaseImages,
    showcaseFallback: await uploadImage(payload, d.showcase.fallbackSrc, 'Collection tile fallback'),
    quickLinksEnabled: true,
    quickLinks: quickLinks.filter((q) => q.image),
    bannersEnabled: true,
    banners: banners.filter((b) => b.image),
  })
  if (!collections.docs.length) console.log('  (no Store → Collections yet — run again after a WMS sync to attach showcase tiles)')
}

async function main() {
  console.log('seeding Payload …')
  const payload = await getPayload({ config })
  await loadExistingMedia(payload)
  console.log(`media already seeded: ${mediaBySource.size}`)
  await syncCatalogue(payload)
  await seedSiteSettings(payload)
  await seedHomepage(payload)
  console.log('done')
  process.exit(0)
}

// `payload run` exits the moment the module finishes evaluating; await at top level.
try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
