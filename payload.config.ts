import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { buildConfig, type Access, type CollectionConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import sharp from 'sharp'
import { commerceCollections } from './payload/collections/commerce'
import { SiteSettings } from './payload/globals/site-settings'
import { Homepage } from './payload/globals/homepage'
import { Navigation } from './payload/globals/navigation'
import { syncCatalogEndpoint } from './payload/endpoints/sync-catalog'
import { importWmsImagesEndpoint } from './payload/endpoints/import-wms-images'
import { withStorefrontCollectionInvalidation, withStorefrontGlobalInvalidation } from './payload/hooks/revalidate-storefront'
import { wmsContentImageTask } from './lib/wms-content-image'

/**
 * Payload CMS for the VPR Collection storefront.
 *
 *  Store  — WMS collections + products mirrored one way (WMS writes, Payload adds
 *           presentation: visibility, banners, images, copy). Only WMS products sell.
 *  Site   — Media (GCS), Homepage sections, Site settings (header/footer/announcement).
 *
 * Database: its own Supabase project, `payload` schema. Prisma's processed_events lives in the
 * storefront DB (DATABASE_URL), so the two never share tables. Schema changes ship as
 * migrations (npm run cms:migrate:create → cms:migrate on deploy); `push` is dev-only and
 * opt-in via PAYLOAD_DB_PUSH=true.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(dirname, '.env.local'), quiet: true })
const authenticated: Access = ({ req }) => Boolean(req.user)
const siteURL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'
const bucket = process.env.STOREFRONT_GCS_BUCKET
const mediaPrefix = `${process.env.STOREFRONT_MEDIA_PREFIX || 'vpr'}/cms/media`
const gcsPublic = process.env.STOREFRONT_GCS_PUBLIC === 'true'
const encoded = process.env.STOREFRONT_GCS_SERVICE_ACCOUNT_BASE64
const credentials = encoded ? JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) : undefined

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: siteURL,
  csrf: [new URL(siteURL).origin],
  cookiePrefix: 'vpr-cms',
  routes: { admin: '/admin', api: '/api/cms' },
  admin: {
    user: 'users',
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ' – VPR CMS', icons: [{ rel: 'icon', type: 'image/png', url: '/images/vpr-fav-icon.png' }] },
    components: { graphics: { Logo: '/components/cms/cms-branding#CmsLogo', Icon: '/components/cms/cms-branding#CmsIcon' } },
    avatar: { Component: '/components/cms/cms-profile-avatar#CmsProfileAvatar' },
  },
  editor: lexicalEditor(),
  sharp,
  collections: ([
    {
      slug: 'users',
      auth: true,
      admin: { useAsTitle: 'email' },
      access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
      fields: [
        { name: 'name', type: 'text' },
        {
          name: 'profilePhoto',
          label: 'Profile photo',
          type: 'upload',
          relationTo: 'media',
          filterOptions: { mimeType: { contains: 'image/' } },
          // Hidden on create-first-user: the media browser needs a signed-in user, and there is none yet.
          admin: { condition: (data) => Boolean(data?.id), description: 'Shown in the admin header. Upload or pick an image, then save; clear it to go back to the default icon.' },
        },
      ],
    },
    {
      slug: 'media',
      admin: { group: 'Site' },
      access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
      upload: {
        staticDir: path.join(dirname, 'media'),
        mimeTypes: ['image/*'],
        // With direct GCS URLs the /api/cms/media/file proxy is off, so the admin thumbnail must use
        // the size's own URL (falls back to the original for files uploaded before the size existed).
        adminThumbnail: ({ doc }: { doc: Record<string, unknown> }) => {
          const d = doc as { url?: string | null; filename?: string | null; prefix?: string | null; sizes?: { thumbnail?: { url?: string | null; filename?: string | null } } }
          const filename = d.sizes?.thumbnail?.filename || d.filename
          // This hook runs before the storage plugin rewrites doc URLs, so build the public GCS URL directly.
          if (gcsPublic && bucket && filename) return `https://storage.googleapis.com/${bucket}/${encodeURIComponent(`${d.prefix || mediaPrefix}/${filename}`)}`
          return d.sizes?.thumbnail?.url || d.url || null
        },
        imageSizes: [{ name: 'thumbnail', width: 300, height: 300, fit: 'inside', withoutEnlargement: true }],
      },
      fields: [
        { name: 'alt', type: 'text', required: true },
        { name: 'sourceKey', type: 'text', unique: true, admin: { readOnly: true, position: 'sidebar', description: 'Set by the WMS image importer / seed so the same source image is never uploaded twice.' } },
      ],
    },
    ...commerceCollections,
  ] as CollectionConfig[]).map(withStorefrontCollectionInvalidation),
  globals: [Navigation, Homepage, SiteSettings].map(withStorefrontGlobalInvalidation),
  endpoints: [syncCatalogEndpoint, importWmsImagesEndpoint],
  jobs: {
    tasks: [wmsContentImageTask],
    // Image imports are started from the admin ("Import pending images"); nothing runs on a cron.
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({ ...defaultJobsCollection, admin: { ...defaultJobsCollection.admin, hidden: true } }),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.PAYLOAD_DATABASE_URL || '', max: 5 },
    schemaName: 'payload',
    push: process.env.NODE_ENV !== 'production' && process.env.PAYLOAD_DB_PUSH === 'true',
    migrationDir: path.join(dirname, 'payload/migrations'),
  }),
  typescript: { outputFile: path.join(dirname, 'payload-types.ts') },
  plugins: bucket ? [gcsStorage({
    bucket,
    options: { projectId: process.env.STOREFRONT_GCS_PROJECT_ID, ...(credentials ? { credentials } : {}) },
    collections: {
      media: {
        prefix: mediaPrefix,
        // With a public-read bucket, hand out direct storage.googleapis.com URLs instead of
        // proxying every image through /api/cms/media/file/* (one Next request per image).
        ...(gcsPublic ? { disablePayloadAccessControl: true as const } : {}),
      },
    },
  })] : [],
})
