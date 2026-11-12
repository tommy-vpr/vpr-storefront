import 'server-only';
import { getPayload } from 'payload';
import config from '@payload-config';
import { publicContentCache } from './public-content-cache';
import { normalizeAgeVerification } from './age-verification-settings';
import { optimizedImageURL } from './media-image';

const readSettings = publicContentCache('age-verification', async () => {
  const payload = await getPayload({config});
  const g = await payload.findGlobal({slug: 'age-verification', depth: 1, overrideAccess: false});
  return {...g, logoUrl: optimizedImageURL(g.logo, 480)};
});
export async function getAgeVerification() {
  if (!process.env.PAYLOAD_DATABASE_URL || !process.env.PAYLOAD_SECRET) return normalizeAgeVerification();
  try { return normalizeAgeVerification(await readSettings()); }
  catch (error) {
    console.error('[age-verification] CMS unavailable; keeping 21+ confirmation enabled', error instanceof Error ? error.message : 'Unknown error');
    return normalizeAgeVerification();
  }
}
