import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import pg from 'pg';
import ts from 'typescript';
import {patchPayloadPostgres} from '../scripts/patch-payload-postgres.mjs';

const require = createRequire(import.meta.url);
const adapterPath = path.join(path.dirname(require.resolve('@payloadcms/db-postgres')), 'connect.js');
const installed = readFileSync(adapterPath, 'utf8');
const original = installed.replace('    // VPR compatibility fix: return the startup probe to its pool.\n    result.release();\n', '');

test('startup compatibility patch is idempotent and refuses dependency drift', () => {
  const patched = patchPayloadPostgres(original, '3.90.2');
  assert.equal(patchPayloadPostgres(patched, '3.90.2'), patched);
  assert.throws(() => patchPayloadPostgres(original, '3.91.0'), /Review/);
  assert.throws(() => patchPayloadPostgres(original + '\nchanged', '3.90.2'), /refusing/);
  assert.equal(installed, patched, 'postinstall must apply the compatibility fix');
});

test('managed pools register once on Vercel and stay unattached for local/migration work', async () => {
  const source = readFileSync(new URL('../lib/database-pool.ts', import.meta.url), 'utf8');
  for (const env of [
    {VERCEL: '1', NODE_ENV: 'production', expected: 1},
    {VERCEL: '', NODE_ENV: 'development', expected: 0},
    {VERCEL: '1', NODE_ENV: 'production', PAYLOAD_MIGRATING: 'true', expected: 0},
  ]) {
    const exports = {}; let attached = 0;
    const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
    new Function('require', 'exports', 'process', code)(id => id === '@vercel/functions' ? {attachDatabasePool: () => attached++} : require(id), exports, {env});
    const pool = new exports.ManagedPool({max: 5});
    assert.equal(attached, env.expected);
    assert.equal(exports.managedPg.Pool, exports.ManagedPool);
    await pool.end();
  }
});

const databaseURL = process.env.VPR_POOL_TEST_DATABASE_URL;
test('opt-in diagnostics report real checkout/release/drain counts without secrets or SQL', {skip: !databaseURL}, async () => {
  const url = new URL(databaseURL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '55434');
  const source = readFileSync(new URL('../lib/database-pool.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
  const exports = {}, logs = [];
  const env = {VPR_POOL_DIAGNOSTICS: 'true'};
  new Function('require', 'exports', 'process', 'console', code)(require, exports, {env}, {info: (...args) => logs.push(args)});
  const pool = new exports.ManagedPool({connectionString: databaseURL, application_name: 'vpr-payload', max: 2, min: 0, idleTimeoutMillis: 100});
  try {
    const client = await pool.connect();
    await client.query('SELECT 1 AS private_query_marker');
    client.release();
    exports.reportDatabasePool(pool, 'coupon-cron');
    await new Promise(resolve => setTimeout(resolve, 250));
    const rows = logs.map(row => JSON.parse(row[1]));
    assert.ok(rows.some(row => row.event === 'acquire' && row.nonIdle === 1));
    assert.ok(rows.some(row => row.event === 'release' && row.nonIdle === 0 && row.idle === 1));
    assert.ok(rows.some(row => row.event === 'remove' && row.total === 0));
    assert.ok(rows.some(row => row.event === 'coupon-cron'));
    assert.equal(new Set(rows.map(row => row.poolId)).size, 1);
    assert.ok(rows.every(row => row.pool === 'vpr-payload'));
    const serialized = JSON.stringify(logs);
    assert.ok(!serialized.includes(url.password) && !serialized.includes('postgresql://') && !serialized.includes('private_query_marker'));
    const before = logs.length;
    env.VPR_POOL_DIAGNOSTICS = 'false';
    exports.reportDatabasePool(pool, 'disabled');
    assert.equal(logs.length, before);
  } finally {await pool.end();}
});

test('real Vercel helper keeps request lifetime open until local idle connections drain', {skip: !databaseURL}, async () => {
  const url = new URL(databaseURL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '55434');
  const symbol = Symbol.for('@vercel/request-context');
  const previousContext = globalThis[symbol];
  const previousEnv = {VERCEL_URL: process.env.VERCEL_URL, VERCEL_REGION: process.env.VERCEL_REGION};
  const pending = [];
  let pool;
  try {
    process.env.VERCEL_URL = 'local-pool-test.invalid';
    process.env.VERCEL_REGION = 'iad1';
    globalThis[symbol] = {get: () => ({waitUntil: promise => pending.push(promise)})};
    const source = readFileSync(new URL('../lib/database-pool.ts', import.meta.url), 'utf8');
    const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
    const exports = {};
    new Function('require', 'exports', 'process', code)(require, exports, {env: {VERCEL: '1', NODE_ENV: 'production'}});
    pool = new exports.ManagedPool({connectionString: databaseURL, max: 2, min: 0, idleTimeoutMillis: 150});
    assert.equal((await pool.query('SELECT 1 AS result')).rows[0].result, 1);
    assert.ok(pending.length > 0, 'the real SDK should register work with Vercel waitUntil');
    await Promise.all(pending);
    assert.equal(pool.totalCount, 0);
  } finally {
    await pool?.end();
    if (previousContext === undefined) delete globalThis[symbol]; else globalThis[symbol] = previousContext;
    for (const [key, value] of Object.entries(previousEnv)) {if (value === undefined) delete process.env[key]; else process.env[key] = value;}
  }
});

test('real Postgres: startup returns its client, transactions coexist, idle clients drain', {skip: !databaseURL}, async () => {
  const url = new URL(databaseURL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '55434', 'Only the disposable local test PostgreSQL port is allowed');
  // Execute the installed adapter's actual connect logic. Schema construction is
  // stubbed because this regression is about client checkout, not schema changes.
  function connectFrom(source) {
    const code = source.replace(/^import .*;\r?\n/gm, '').replace('export const connect =', 'const connect =');
    return new Function('drizzle', 'withReplicas', 'pushDevSchema', code + '\nreturn connect;')(() => ({}), () => ({}), async () => {throw Error('Schema push is forbidden');});
  }
  for (const [source, expectedCheckedOut] of [[original, 1], [installed, 0]]) {
    let startupClient;
    class TrackingPool extends pg.Pool {
      connect(callback) {
        if (callback) return super.connect(callback);
        return super.connect().then(client => {startupClient ??= client; return client;});
      }
    }
    const adapter = {pg: {Pool: TrackingPool}, poolOptions: {connectionString: databaseURL, max: 5, min: 0, idleTimeoutMillis: 150, connectionTimeoutMillis: 2000}, push: false, schema: {}, payload: {logger: {error() {}, info() {}}}, createExtensions: async () => {}};
    try {
      await connectFrom(source).call(adapter);
      assert.equal(adapter.pool.totalCount - adapter.pool.idleCount, expectedCheckedOut);
      if (expectedCheckedOut) startupClient.release(); // clean up the control's known leak
      const client = await adapter.pool.connect();
      try {
        await client.query('BEGIN');
        const concurrent = await adapter.pool.query('SELECT 1 AS result');
        assert.equal(concurrent.rows[0].result, 1);
        await client.query('ROLLBACK');
      } finally {client.release();}
      await new Promise(resolve => setTimeout(resolve, 350));
      assert.equal(adapter.pool.totalCount, 0, 'idle connections should close');
    } finally {await adapter.pool?.end();}
  }
});
