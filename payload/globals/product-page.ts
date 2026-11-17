import type { Block, GlobalConfig } from 'payload'

/**
 * Site → Product page template: the section stack of every shop product page
 * (/products/<variantId>). The hero (gallery, title, variants, add to cart) is the fixed
 * core; everything else can be added, removed or reordered. Per-product picks (related
 * products, hide related) live on Store → All products.
 */
const ProductHero: Block = {
  slug: 'productHero',
  labels: { singular: 'Product hero (gallery + buy box)', plural: 'Product heroes' },
  fields: [
    { name: 'showBrand', type: 'checkbox', defaultValue: true, admin: { description: 'Small brand line above the title.' } },
    { name: 'showBreadcrumbs', type: 'checkbox', defaultValue: true },
  ],
}
const ProductDescription: Block = {
  slug: 'productDescription',
  labels: { singular: 'Description', plural: 'Descriptions' },
  fields: [{ name: 'heading', type: 'text', defaultValue: 'Description' }],
}
const ProductDetails: Block = {
  slug: 'productDetails',
  labels: { singular: 'Details (SKU, category)', plural: 'Details' },
  fields: [
    { name: 'showSku', type: 'checkbox', defaultValue: true },
    { name: 'showCategory', type: 'checkbox', defaultValue: true },
  ],
}
const RelatedProducts: Block = {
  slug: 'relatedProducts',
  labels: { singular: 'You may also like', plural: 'You may also like' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'You may also like' },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'auto',
      options: [
        { label: "Hand-picked on the product, else the product's collection", value: 'auto' },
        { label: "Same collection as the product", value: 'collection' },
        { label: 'A specific collection', value: 'fixed' },
      ],
    },
    { name: 'collection', type: 'relationship', relationTo: 'wms-collections', filterOptions: { assigned: { equals: true } }, admin: { condition: (_, s) => s?.source === 'fixed' } },
    { name: 'limit', type: 'number', defaultValue: 4, min: 1, max: 12 },
  ],
}
const RichText: Block = {
  slug: 'richText',
  labels: { singular: 'Rich text', plural: 'Rich text' },
  fields: [{ name: 'heading', type: 'text' }, { name: 'content', type: 'richText', required: true }],
}
const Embed: Block = {
  slug: 'embed',
  labels: { singular: 'Embed / HTML', plural: 'Embeds' },
  fields: [{ name: 'html', type: 'code', required: true, admin: { language: 'html' } }],
}

export const productPageBlocks: Block[] = [ProductHero, ProductDescription, ProductDetails, RelatedProducts, RichText, Embed]

export const ProductPage: GlobalConfig = {
  slug: 'product-page',
  label: 'Product page template',
  admin: { group: 'Site', description: 'Sections of every shop product page (/products/<id>). Starts with hero → description → details → you may also like. Per-product related picks are on Store → All products.' },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      name: 'sections',
      type: 'blocks',
      blocks: productPageBlocks,
      admin: { initCollapsed: true },
      // What a fresh install shows: the same stack the storefront falls back to.
      defaultValue: [
        { blockType: 'productHero', showBrand: true, showBreadcrumbs: true },
        { blockType: 'productDescription', heading: 'Description' },
        { blockType: 'productDetails', showSku: true, showCategory: true },
        { blockType: 'relatedProducts', heading: 'You may also like', source: 'auto', limit: 4 },
      ],
    },
  ],
}
