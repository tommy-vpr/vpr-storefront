import type { Field, GlobalConfig } from 'payload'

/**
 * Site → Navigation: the header menu, in order. Empty → the built-in menu (automatic brand
 * menus from WMS collections, then Site settings → Header links), so nothing breaks before an
 * editor touches it. One level of dropdowns, as the header supports.
 */
const linkFields = (nested: boolean): Field[] => [
  { name: 'label', type: 'text', required: true },
  {
    name: 'linkType',
    label: 'Links to',
    type: 'select',
    required: true,
    defaultValue: 'collection',
    options: [
      { label: 'Shop collection', value: 'collection' },
      { label: 'All collections (/all-collections)', value: 'collections' },
      { label: 'Site path (e.g. /wholesale-application, /contact, /quick-order)', value: 'path' },
      { label: 'External URL (new tab)', value: 'url' },
      ...(nested ? [{ label: 'Automatic brand menus (one dropdown per brand, from WMS collections)', value: 'brands' }] : []),
    ],
  },
  { name: 'collection', type: 'relationship', relationTo: 'wms-collections', admin: { condition: (_, s) => s?.linkType === 'collection' } },
  { name: 'path', type: 'text', admin: { condition: (_, s) => s?.linkType === 'path', description: 'Hand-built pages: /all-collections, /quick-order, /wholesale-application, /partnership-support, /shipping-returns, /terms, /contact, /orders/lookup' } },
  { name: 'url', type: 'text', admin: { condition: (_, s) => s?.linkType === 'url', description: 'https://…' } },
]

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigation',
  admin: { group: 'Site', description: 'Header menu. Leave the list empty to use the built-in menu (automatic brand menus + Site settings → Header links). A row of type "Automatic brand menus" drops those brand dropdowns wherever you place it.' },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      name: 'mainMenu',
      label: 'Header menu',
      type: 'array',
      admin: { description: 'Top-level items; add "Dropdown items" for a submenu (one level).', components: { RowLabel: '/components/cms/cms-field-row-label#CmsNavRowLabel' } },
      fields: [
        ...linkFields(true),
        {
          name: 'children',
          label: 'Dropdown items',
          type: 'array',
          admin: { condition: (_, s) => s?.linkType !== 'brands', components: { RowLabel: '/components/cms/cms-field-row-label#CmsNavRowLabel' } },
          fields: linkFields(false),
        },
      ],
    },
  ],
}
