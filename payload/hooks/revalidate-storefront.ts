import { after } from 'next/server';
import { revalidateTag } from 'next/cache';
import type { CollectionConfig, GlobalConfig, PayloadRequest } from 'payload';
import { CMS_CONTENT_TAG } from '../../lib/storefront-cache-policy';

function scheduleInvalidation(req: PayloadRequest) {
  if (req.context.storefrontInvalidationScheduled) return;
  try {
    // Payload hooks run before the transaction commits. Invalidate after the
    // response, so another visitor cannot refill the cache with pre-commit data.
    after(() => { revalidateTag(CMS_CONTENT_TAG, { expire: 0 }); });
    req.context.storefrontInvalidationScheduled = true;
  } catch {
    // CLI imports have no Next request lifecycle. Their updates use the
    // 60-second time-based revalidation instead; do not fail an import for this.
  }
}

export function withStorefrontCollectionInvalidation(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [...(collection.hooks?.afterChange ?? []), ({ doc, req }) => {
        scheduleInvalidation(req);
        return doc;
      }],
      afterDelete: [...(collection.hooks?.afterDelete ?? []), ({ doc, req }) => {
        scheduleInvalidation(req);
        return doc;
      }],
    },
  };
}

export function withStorefrontGlobalInvalidation(global: GlobalConfig): GlobalConfig {
  return {
    ...global,
    hooks: {
      ...global.hooks,
      afterChange: [...(global.hooks?.afterChange ?? []), ({ doc, req }) => {
        scheduleInvalidation(req);
        return doc;
      }],
    },
  };
}
