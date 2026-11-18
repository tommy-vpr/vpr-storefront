# Database pool lifecycle release

Payload 3.90.2 retains its startup client. A version/source-guarded postinstall patch returns it; dependency drift fails installation for review. ManagedPool registers Payload and Prisma with Vercel only in production runtime, excluding Payload migration processes. Payload remains max 5; Prisma is max 2. Both use min 0, 10-second idle cleanup and a 10-second acquisition timeout. No schema migration is added.

## Verification

Run npm run test:pool with VPR_POOL_TEST_DATABASE_URL pointing explicitly to disposable local Postgres on port 55434 (otherwise database tests skip). Run npm run typecheck and npm run test:checkout.

The actual CMS integration is tests/payload-pool.integration.ts, run with node --import tsx. It requires a disposable database named vpr_pool_cms_* on 127.0.0.1:55434; set PAYLOAD_DATABASE_URL, PAYLOAD_SECRET, PAYLOAD_DB_PUSH=true and NODE_ENV=development. Never use a shared or deployed database for that test.

## Deployment

Deploy this storefront independently. Existing URLs and secrets stay in place. Temporarily set VPR_POOL_DIAGNOSTICS=true before deploying. Logs prefixed [vpr-pool] contain counts and deployment/pool identifiers, never credentials or SQL. Verify CMS media, homepage and checkout recovery; observe release/remove events ending in total=0 after idle. Match with Supavisor logs where available. Counts are per application pool; the dashboard aggregate is not a direct one-to-one measure.

Do not claim sustained capacity from a brief smoke test. Increase read concurrency only after reviewing errors and cleanup. Disable diagnostics and redeploy after verification. Rollback uses the previous deployment and reintroduces its previous pool behavior; no database restore is required by this change.
