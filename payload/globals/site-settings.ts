import type { Field, GlobalConfig } from 'payload'

/**
 * Site → Site settings: brand assets and the small copy/links that used to be constants in
 * components/{header,footer,announceBar,warningLabel}.tsx. Every field has a built-in default
 * equal to what the storefront shipped with, so an empty global renders the site unchanged.
 */
const link = (extra: Field[] = []): Field[] => [
  { type: 'row', fields: [{ name: 'label', type: 'text', required: true }, { name: 'href', label: 'Link', type: 'text', required: true, admin: { description: 'Site path (/wholesale-application) or full URL.' } }, ...extra] },
]
const linkList = (name: string, label: string, description: string): Field => ({
  name,
  label,
  type: 'array',
  admin: { description, components: { RowLabel: '/components/cms/cms-field-row-label#CmsLinkRowLabel' } },
  fields: link([{ name: 'external', label: 'Opens in new tab', type: 'checkbox', defaultValue: false }]),
})

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Site', description: 'Logo, announcement bar, warning label, header links, footer columns and third-party ids. Leave a field empty to use the built-in default.' },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand',
          fields: [
            { name: 'siteName', type: 'text', defaultValue: 'VPR Collection', admin: { description: 'Used in page titles and the footer line.' } },
            { name: 'logo', type: 'upload', relationTo: 'media', admin: { description: 'Header logo. Default: logo-main.png (544 × 88).' } },
            { name: 'logoWidth', type: 'number', defaultValue: 150, admin: { description: 'Header logo width in px.' } },
            { name: 'favicon', type: 'upload', relationTo: 'media', admin: { description: 'Browser tab icon. Default: vpr-fav-icon.png.' } },
          ],
        },
        {
          label: 'Announcement & warning',
          fields: [
            { name: 'announcementEnabled', label: 'Show announcement bar', type: 'checkbox', defaultValue: true },
            { name: 'announcementText', label: 'Announcement text', type: 'text', defaultValue: 'Free Shipping On Every Order!' },
            { name: 'announcementHref', label: 'Announcement link (optional)', type: 'text' },
            { name: 'warningEnabled', label: 'Show nicotine warning', type: 'checkbox', defaultValue: true },
            { name: 'warningLine1', type: 'text', defaultValue: 'Warning: This product contain nicotine.' },
            { name: 'warningLine2', type: 'text', defaultValue: 'Nicotine is an addictive chemical.' },
          ],
        },
        {
          label: 'Header',
          fields: [
            { name: 'headerHiddenCollections', label: 'Collections hidden from the brand menus', type: 'relationship', relationTo: 'wms-collections', hasMany: true, admin: { description: 'The header groups collections by brand automatically; pick any that should not appear there (default: Skwezed x iJoy, Merch — they are linked elsewhere).' } },
            linkList('headerLinks', 'Extra header links', 'Shown after the brand menus. Default: IJoy, Wholesale App, Merch, Contact.'),
          ],
        },
        {
          label: 'Footer',
          fields: [
            linkList('footerQuickLinks', 'Quick links column', 'Default: Pact Act, Wholesale App, Skwezed Retail Site.'),
            linkList('footerServiceLinks', 'Customer service column', 'Default: Partnership Support, Shipping & Return, Terms of Use, Contact Us.'),
            {
              type: 'row',
              fields: [
                { name: 'contactPhone', type: 'text', defaultValue: '(626) 698-0098' },
                { name: 'contactEmail', type: 'text', defaultValue: 'info@vprcollection.com' },
              ],
            },
            { name: 'contactHours', type: 'textarea', defaultValue: 'Monday - Friday\n10:00a-5:00p PST', admin: { description: 'One line per row.' } },
            { name: 'legalText', label: 'Legal / Prop 65 text', type: 'textarea', admin: { description: 'Small print under the footer columns. Empty = the built-in text.' } },
          ],
        },
        {
          label: 'Integrations',
          fields: [
            { name: 'newsletterFormUrl', label: 'Jotform — newsletter form URL', type: 'text', defaultValue: 'https://form.jotform.com/240252043265446' },
          ],
        },
      ],
    },
  ],
}
