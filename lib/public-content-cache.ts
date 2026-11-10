import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { CMS_CONTENT_TAG, PUBLIC_CONTENT_SECONDS } from './storefront-cache-policy';
import { createHash } from 'node:crypto';

// A local CMS clone must not reuse cached content from the previous database.
function databaseCacheKey() {
  const value = process.env.PAYLOAD_DATABASE_URL || process.env.DATABASE_URL;
  if (!value) return 'unconfigured';
  const url = new URL(value);
  return createHash('sha256').update(url.hostname + ':' + url.port + url.pathname + ':' + url.username).digest('hex');
}

/** Only anonymous CMS reads belong here. Never pass a session, user or request. */
export function publicContentCache<Args extends unknown[], Result>(
  key: string,
  read: (...args: Args) => Promise<Result>,
) {
  // Keep the existing dynamic-rendering model; Cache Components is not enabled.
  return cache(unstable_cache(read, [
    'public-content-v1',
    databaseCacheKey(),
    process.env.WMS_STORE_ID || 'vpr',
    process.env.NEXT_PUBLIC_SITE_URL || 'local',
    key,
  ], { revalidate: PUBLIC_CONTENT_SECONDS, tags: [CMS_CONTENT_TAG] }));
}
