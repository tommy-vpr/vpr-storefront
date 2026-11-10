# Payload CMS in the VPR storefront

Same model as the Skwezed storefront, trimmed to what VPR needs: **WMS writes, Payload adds
presentation.** Only WMS products can be sold; the CMS decides how collections/products look,
what the homepage shows, and the header/footer copy.

## Admin map (`/admin`)

| Group | What | Who writes |
|---|---|---|
| Store → Collections | every WMS collection assigned to this store: hide, rename, reorder, banner, description | WMS (identity/membership) + editors (presentation) |
| Store → All products | every WMS product in those collections: show/hide, gallery, description override | WMS (identity) + editors |
| Site → Media | images (GCS bucket `vpr-storefront-storage`, prefix `vpr/cms/media/`) | editors, seed, WMS image import |
| Site → Homepage | hero slides, benefit cards, collection showcase tiles, quick-link tiles, brand banners | editors |
| Site → Site settings | logo/favicon, announcement bar, nicotine warning, header links, footer columns/contact/legal, newsletter form | editors |

Every Homepage / Site settings list falls back to the content the storefront shipped with when
it is empty, so the site renders correctly before anything is edited.

## How the WMS catalogue gets in

- **Sync from WMS** button (Store → All products / a collection) or the `catalog.changed`
  webhook on `/api/webhooks/wms` → `lib/wms-catalog-sync.ts` mirrors collections + products.
- Editors' choices (hidden, images, copy) survive re-syncs. Products WMS unassigns stay (hidden).
- **Import pending images** copies each product's WMS image into Media once (`sourceKey`).
- Storefront reads: `lib/collection-presentation.ts`, `lib/product-content.ts`,
  `lib/storefront-visibility.ts` (hidden products are filtered out of listings, the product
  page and quick order inside `lib/wms/client.ts`).

## Databases

- `DATABASE_URL` / `DIRECT_URL` — the storefront DB (Prisma, `processed_events` only).
- `PAYLOAD_DATABASE_URL` — **a separate Supabase project**, schema `payload`. The two never
  share tables.

## Schema changes — migrations first

Prod never pushes. The build/deploy command is

```
npm run deploy:migrate && npm run build      # prisma migrate deploy && payload migrate
```

Local dev against the dev Supabase project:

1. `PAYLOAD_DB_PUSH=true npm run dev` while iterating on collections/globals (push diffs the
   live schema; answer the prompt).
2. When done, **generate the migration against a DB that is at the last migration's state**,
   not the push-built dev DB — otherwise tables push created are silently missing from the
   migration (this bit Litto). Easiest: an empty local Postgres, `npm run cms:migrate` to replay,
   then `npm run cms:migrate:create <name>`.
3. Commit `payload/migrations/*.ts|json`, `payload-types.ts` and the regenerated
   `app/(payload)/admin/importMap.js` (`npm run cms:importmap`).

`payload/migrations/20261110_163506_initial.ts` is the baseline (27 tables).

## Seeding

```
npm run cms:seed              # WMS sync + public/images → Media + fill Homepage/Site settings
npm run cms:seed -- --no-sync # without WMS credentials
```

Idempotent and create-only per field: a value an editor already set is never overwritten;
media is keyed by `sourceKey` (`public:/images/...`) so re-runs never duplicate. Run it once
against each environment (dev, then prod) after `cms:migrate`. Showcase tiles need Store →
Collections to exist, so run it again after the first WMS sync if the first run had none.

## Scripts

| | |
|---|---|
| `npm run cms:types` | regenerate `payload-types.ts` |
| `npm run cms:importmap` | regenerate the admin import map after adding admin components |
| `npm run cms:migrate` / `cms:migrate:create` / `cms:migrate:status` | Payload migrations |
| `npm run deploy:migrate` | Prisma + Payload migrations (deploy step) |
| `npm run cms:seed` | seed (above) |

## Not included (by decision)

Coupons, quiz, reviews, store locator, blog, catalogue/entries — all exist in the Skwezed repo
and port the same way if ever wanted.
