import type { Field, GlobalConfig } from 'payload'

/**
 * Site → Homepage: the sections of app/(shop)/page.tsx in order — hero slider, benefit
 * cards, collection showcase, quick-link tiles, brand banners (animated testimonials).
 * Each section can be switched off; an empty list falls back to the built-in content so
 * the page never renders half-empty.
 */
const rowLabel = (name: string) => ({ components: { RowLabel: `/components/cms/cms-field-row-label#${name}` } })
const image = (name: string, label: string, description?: string): Field => ({ name, label, type: 'upload', relationTo: 'media', admin: description ? { description } : undefined })

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  label: 'Homepage',
  admin: { group: 'Site', description: 'Everything on the home page, top to bottom. Empty lists use the built-in defaults.' },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero slider',
          fields: [
            { name: 'heroEnabled', label: 'Show hero slider', type: 'checkbox', defaultValue: true },
            {
              name: 'heroSlides',
              label: 'Slides',
              type: 'array',
              admin: { description: 'Full-bleed images, 5s autoplay with fade. Recommended 2400 × 900 or wider.', ...rowLabel('CmsTitleRowLabel') },
              fields: [
                image('image', 'Image'),
                { name: 'title', label: 'Alt text / title', type: 'text', required: true },
                { name: 'href', label: 'Link (optional)', type: 'text', admin: { description: 'Makes the whole slide clickable.' } },
              ],
            },
          ],
        },
        {
          label: 'Benefits',
          fields: [
            { name: 'benefitsEnabled', label: 'Show benefit cards', type: 'checkbox', defaultValue: true },
            {
              name: 'benefits',
              type: 'array',
              admin: { description: 'Three cards under the hero. Default: 90-Day Buy Back, Free Shipping, No Credit Card Fees.', ...rowLabel('CmsTitleRowLabel') },
              fields: [
                { type: 'row', fields: [
                  { name: 'icon', type: 'select', defaultValue: 'truck', options: [{ label: 'Truck', value: 'truck' }, { label: 'Rotate (buy back)', value: 'rotate' }, { label: 'Credit card', value: 'card' }, { label: 'Shield', value: 'shield' }, { label: 'Clock', value: 'clock' }, { label: 'Star', value: 'star' }, { label: 'Package', value: 'package' }] },
                  { name: 'title', type: 'text', required: true },
                ] },
                { name: 'description', type: 'textarea', required: true },
              ],
            },
          ],
        },
        {
          label: 'Collection showcase',
          fields: [
            { name: 'showcaseEnabled', label: 'Show collection showcase', type: 'checkbox', defaultValue: true },
            { name: 'showcaseHeading', type: 'text', defaultValue: 'The VPR Collection' },
            { name: 'showcaseHidden', label: 'Collections to leave out', type: 'relationship', relationTo: 'wms-collections', hasMany: true, admin: { description: 'Default: merch collections.' } },
            {
              name: 'showcaseImages',
              label: 'Tile images per collection',
              type: 'array',
              admin: { description: 'The tile picture for each collection. Collections without one use the fallback image.', ...rowLabel('CmsTitleRowLabel') },
              fields: [
                { name: 'collection', type: 'relationship', relationTo: 'wms-collections', required: true },
                image('image', 'Tile image', 'Square product render works best (object-fit: contain).'),
              ],
            },
            image('showcaseFallback', 'Fallback tile image', 'Used for collections with no tile image. Default: skwezed_product_main.webp.'),
          ],
        },
        {
          label: 'Quick links',
          fields: [
            { name: 'quickLinksEnabled', label: 'Show quick-link tiles', type: 'checkbox', defaultValue: true },
            {
              name: 'quickLinks',
              type: 'array',
              admin: { description: 'Image tiles with a label bar. Default: Quick Order, Sample Request, Wholesale.', ...rowLabel('CmsLinkRowLabel') },
              fields: [
                { type: 'row', fields: [{ name: 'label', type: 'text', required: true }, { name: 'href', label: 'Link', type: 'text', required: true }] },
                image('image', 'Image', '16:10 tile.'),
              ],
            },
          ],
        },
        {
          label: 'Brand banners',
          fields: [
            { name: 'bannersEnabled', label: 'Show brand banners', type: 'checkbox', defaultValue: true },
            {
              name: 'banners',
              label: 'Banners (animated testimonials)',
              type: 'array',
              admin: { description: 'Quote + image carousel near the bottom of the page. Default: Skwezed, iJoy x Skwezed, Blankers.', ...rowLabel('CmsTitleRowLabel') },
              fields: [
                image('image', 'Image'),
                { type: 'row', fields: [{ name: 'name', label: 'Brand / name', type: 'text', required: true }, { name: 'designation', label: 'Tagline', type: 'text' }] },
                { name: 'quote', type: 'textarea', required: true },
                { type: 'row', fields: [
                  { name: 'bgColor', label: 'Background colour', type: 'text', defaultValue: '#101010', admin: { description: 'CSS colour behind the image (e.g. #22c55e).' } },
                  { name: 'darkBg', label: 'Dark background (light text)', type: 'checkbox', defaultValue: true },
                ] },
              ],
            },
          ],
        },
      ],
    },
  ],
}
