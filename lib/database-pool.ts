import pg from 'pg';
import {attachDatabasePool} from '@vercel/functions';
import {randomUUID} from 'node:crypto';

type PoolCounts = Pick<pg.Pool, 'totalCount' | 'idleCount' | 'waitingCount'>;
const identities = new WeakMap<object, {id: string; name: string; managed: boolean}>();

/** Counts and identifiers only: no query text, client objects or connection URLs. */
export function reportDatabasePool(pool: PoolCounts, event: string, heldMs?: number) {
  if (process.env.VPR_POOL_DIAGNOSTICS !== 'true') return;
  const identity = identities.get(pool);
  console.info('[vpr-pool]', JSON.stringify({
    event, poolId: identity?.id || 'unregistered', pool: identity?.name || 'unknown',
    deployment: process.env.VERCEL_DEPLOYMENT_ID || 'local',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local',
    region: process.env.VERCEL_REGION || 'local', managed: identity?.managed || false,
    total: pool.totalCount, idle: pool.idleCount,
    nonIdle: pool.totalCount - pool.idleCount, waiting: pool.waitingCount,
    ...(heldMs === undefined ? {} : {heldMs}),
  }));
}

/** Register once at construction, before Payload or Prisma acquires any clients.
 * Local dev and migration processes keep normal node-postgres lifecycle behavior.
 */
export class ManagedPool extends pg.Pool {
  constructor(options?: pg.PoolConfig) {
    super(options);
    const identity = {id: randomUUID(), name: options?.application_name || 'unknown', managed: false};
    identities.set(this, identity);
    if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production' && process.env.PAYLOAD_MIGRATING !== 'true') {
      attachDatabasePool(this);
      identity.managed = true;
    }
    if (process.env.VPR_POOL_DIAGNOSTICS === 'true') {
      const acquired = new WeakMap<object, number>();
      // Log after pg finishes each event's synchronous bookkeeping. No timers or
      // extra queries are added, so diagnostics do not keep the function awake.
      this.on('acquire', client => {
        acquired.set(client, Date.now());
        queueMicrotask(() => reportDatabasePool(this, 'acquire'));
      });
      this.on('release', (_error, client) => {
        const start = acquired.get(client);
        acquired.delete(client);
        queueMicrotask(() => reportDatabasePool(this, 'release', start === undefined ? undefined : Date.now() - start));
      });
      this.on('remove', () => queueMicrotask(() => reportDatabasePool(this, 'remove')));
      reportDatabasePool(this, 'created');
    }
  }
}

// Payload officially supports supplying an instrumented node-postgres dependency.
export const managedPg = {...pg, Pool: ManagedPool};
