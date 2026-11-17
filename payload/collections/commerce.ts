import type { CollectionConfig } from 'payload'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/$/, '')

/**
 * Store group — the WMS catalogue mirrored into Payload, one direction only:
 * WMS writes (collections, products, membership, prices, stock), Payload syncs and
 * adds presentation on top.
 *
 *  - wms-collections  "Collections": every collection WMS assigns to this store, plus
 *                     presentation (title override, banner, description, visible, menu)
 *  - products         "All products": one record per WMS product — hide/show, gallery,
 *                     description override, which collections it is in
 *
 * Filled by lib/wms-catalog-sync.ts ("Sync from WMS" or the `catalog.changed` webhook).
 */

const authed = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)
const GROUP = 'Store'

export const WmsCollections: CollectionConfig = {
  slug: 'wms-collections',
  labels: { singular: 'Collection', plural: 'Collections' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'assigned', 'showInStorefront', 'showInMenu', 'url'],
    group: GROUP,
    description: 'Collections assigned to this store in WMS (membership is managed in WMS → Sync from WMS). How each appears on the storefront is managed here. Each is a shop page at /collections/<slug>.',
  },
  // Identity/membership fields are owned by WMS (read-only); presentation is editable here.
  access: { read: authed, create: () => false, update: authed, delete: () => false },
  fields: [
    { name: 'syncControls', type: 'ui', admin: { disableListColumn: true, components: { Field: '/components/cms/cms-collection-sync#CmsCollectionSync' } } },
    { name: 'wmsCollectionId', type: 'text', required: true, unique: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'title', type: 'text', required: true, admin: { readOnly: true, description: 'Name in WMS. Use "Display title" below to show something else.' } },
    { name: 'slug', type: 'text', required: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'assigned', type: 'checkbox', defaultValue: true, admin: { readOnly: true, position: 'sidebar', description: 'Unticked = no longer assigned to this store in WMS.' } },
    { name: 'wmsDescription', label: 'WMS description', type: 'textarea', admin: { readOnly: true, description: 'As written in WMS. Copied into "Description" below the first time it syncs; edit that one freely.' } },
    {
      name: 'url',
      label: 'Storefront URL',
      type: 'text',
      virtual: true,
      admin: { readOnly: true, position: 'sidebar' },
      hooks: { afterRead: [({ siblingData }) => (siblingData?.slug ? `${SITE_URL}/collections/${siblingData.slug}` : null)] },
    },
    {
      type: 'collapsible',
      label: 'Storefront presentation',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'showInStorefront', label: 'Show on storefront', type: 'checkbox', defaultValue: true, admin: { description: 'Off = /collections/<slug> is a 404 and it leaves the Shop index.' } },
            { name: 'showInMenu', label: 'Show in Shop menu', type: 'checkbox', defaultValue: true },
            { name: 'menuOrder', label: 'Order', type: 'number', defaultValue: 0, admin: { description: 'Lower first, in the Shop menu and index.' } },
          ],
        },
        { name: 'displayTitle', label: 'Display title', type: 'text', admin: { description: 'Heading shown on the storefront (defaults to the WMS name).' } },
        { name: 'description', type: 'textarea', admin: { description: 'Shown under the collection heading / on the banner. Seeded from WMS; your edits stick.' } },
        { name: 'banner', type: 'upload', relationTo: 'media', admin: { description: 'Full-width banner above the grid (title sits on it).' } },
      ],
    },
    { name: 'productLinks', type: 'ui', admin: { disableListColumn: true, components: { Field: '/components/cms/cms-collection-products#CmsCollectionProducts' } } },
    {
      name: 'products',
      label: 'Products in this collection',
      type: 'join',
      collection: 'products',
      on: 'collections',
      defaultLimit: 10,
      defaultSort: 'title',
      admin: {
        allowCreate: false,
        defaultColumns: ['preview', 'title', 'showInStorefront', 'assignmentStatus'],
        description: 'Membership synced from WMS. Open a product to hide it or edit its images/description. Change membership in WMS.',
      },
    },
  ],
}

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Product', plural: 'All products' },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, context }) => {
        // A manual edit protects the record from the automatic WMS image import.
        if (operation === 'update' && !context.wmsContentSync && ['pending', 'failed', 'no-image'].includes(originalDoc?.wmsImageImportStatus)) {
          return { ...data, wmsImageImportStatus: 'protected', wmsImageImportError: null }
        }
        return data
      },
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['preview', 'title', 'collections', 'showInStorefront', 'assignmentStatus'],
    group: GROUP,
    components: { beforeList: ['/components/cms/cms-sync-button#CmsSyncButton'] },
    description: 'Every WMS product in a collection assigned to this store. Only WMS products can be sold; here you hide/show them and add images and copy. Visibility and edits survive re-syncs. Products WMS unassigns stay here (hidden) so their content is kept.',
  },
  access: { read: ({ req }) => (req.user ? true : { showInStorefront: { not_equals: false } }), create: authed, update: authed, delete: authed },
  fields: [
    { name: 'preview', label: 'Thumbnail', type: 'ui', admin: { disableListColumn: false, components: { Cell: '/components/cms/cms-thumbnail-cell#CmsThumbnailCell', Field: '/components/cms/cms-visibility-image#CmsVisibilityImage' } } },
    { name: 'showInStorefront', label: 'Show on storefront', type: 'checkbox', defaultValue: true, required: true, admin: { position: 'sidebar', description: 'Off = hidden from listings, product page (404), quick order and search.' } },
    { name: 'title', type: 'text', required: true, admin: { components: { Cell: '/components/cms/cms-record-title-cell#CmsRecordTitleCell' }, description: 'Name in WMS.' } },
    { name: 'wmsProductId', type: 'text', required: true, unique: true, admin: { readOnly: true, position: 'sidebar', description: 'WMS product ID (not variant ID). Applies to all variants.' } },
    { name: 'assignmentStatus', type: 'select', options: ['unknown', 'assigned', 'unassigned'], defaultValue: 'unknown', admin: { readOnly: true, position: 'sidebar', description: 'Unassigned = WMS removed it from every collection of this store.' } },
    { name: 'collections', type: 'relationship', relationTo: 'wms-collections', hasMany: true, admin: { readOnly: true, description: 'From WMS.' } },
    { name: 'lastSyncedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'description', type: 'textarea', admin: { description: 'Overrides the WMS description on the product page when set.' } },
    {
      name: 'related',
      label: 'Related products (You may also like)',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      filterOptions: { showInStorefront: { not_equals: false } },
      admin: { description: 'Hand-picked. Empty = products from the same collection (per the Product page template).' },
    },
    { name: 'hideRelated', label: 'Hide "You may also like" on this product', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    {
      name: 'images',
      type: 'array',
      admin: { description: 'Product gallery, in order. First image is used on listing cards. Empty = the WMS image.' },
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
    { name: 'imageUrl', type: 'text', admin: { readOnly: true, position: 'sidebar', description: 'Image URL as reported by WMS.' } },
    { name: 'wmsImageImportStatus', type: 'select', options: ['pending', 'complete', 'failed', 'no-image', 'protected'], admin: { readOnly: true, position: 'sidebar', description: 'Use "Import pending images" to pull the WMS image into Media. Editing this record protects it from the import.' } },
    { name: 'wmsImageSourceUrl', type: 'text', admin: { hidden: true, readOnly: true } },
    { name: 'wmsImageImportError', type: 'textarea', admin: { readOnly: true, position: 'sidebar' } },
  ],
}

export const commerceCollections: CollectionConfig[] = [WmsCollections, Products]
