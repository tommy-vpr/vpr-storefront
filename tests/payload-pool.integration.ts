import assert from 'node:assert/strict';
import {getPayload} from 'payload';
import config from '../payload.config';

const url = new URL(process.env.PAYLOAD_DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '55434' || !url.pathname.startsWith('/vpr_pool_cms_')) {
  throw Error('Only an explicitly disposable local CMS test database is allowed');
}
const payload = await getPayload({config});
const pool = payload.db.pool;
try {
  assert.equal(pool.totalCount - pool.idleCount, 0, 'startup must not retain a client');
  await payload.updateGlobal({slug: 'site-settings', data: {siteName: 'Local pool regression'}});
  const results = await Promise.all(Array.from({length: 10}, () => payload.findGlobal({slug: 'site-settings', depth: 0})));
  assert.ok(results.every(result => result.siteName === 'Local pool regression'));
  assert.equal(pool.totalCount - pool.idleCount, 0, 'CMS reads and saves return their clients');
  console.log('PASS actual Payload startup, CMS save and ten concurrent reads; no retained clients');
} finally {
  await payload.destroy();
  await pool.end();
}
