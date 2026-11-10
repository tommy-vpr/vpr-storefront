import { Client } from 'pg';
import type { PayloadRequest, Where } from 'payload';

const queue = 'wms-content-images';
const batchSize = 2;

export async function imageImportCandidates(req: PayloadRequest, collectionId?: number) {
  const scope: Where = {assignmentStatus: {equals: 'assigned'}};
  if (collectionId !== undefined) scope.collections = {equals: collectionId};
  return (await req.payload.find({collection: 'products', where: scope, pagination: false, depth: 0, req})).docs;
}

export function summarizeImageImports(docs: Awaited<ReturnType<typeof imageImportCandidates>>) {
  const missing = docs.filter(doc => !doc.images?.length && ['pending', 'failed'].includes(doc.wmsImageImportStatus || '') && doc.wmsImageSourceUrl);
  return {
    complete: docs.filter(doc => doc.images?.length).length,
    pending: missing.filter(doc => doc.wmsImageImportStatus === 'pending').length,
    failed: missing.filter(doc => doc.wmsImageImportStatus === 'failed').length,
    remaining: missing.length,
    noImage: docs.filter(doc => !doc.images?.length && doc.wmsImageImportStatus === 'no-image').length,
  };
}

export async function runManualImageBatch(req: PayloadRequest, collectionId: number | undefined, excludeIds: number[]) {
  const lock = new Client({connectionString: process.env.PAYLOAD_DATABASE_URL || process.env.DATABASE_URL, connectionTimeoutMillis: 10000});
  try {
    await lock.connect();
    await lock.query('BEGIN');
    const lease = await lock.query('SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked', ['vpr-wms-image-runner']);
    if (!lease.rows[0].locked) {
      return {busy: true, attemptedIds: [], imported: 0, failed: 0, available: 0, summary: summarizeImageImports(await imageImportCandidates(req, collectionId))};
    }
    const docs = await imageImportCandidates(req, collectionId);
    const excluded = new Set(excludeIds);
    const eligible = docs.filter(doc => !excluded.has(doc.id) && !doc.images?.length && ['pending', 'failed'].includes(doc.wmsImageImportStatus || '') && doc.wmsImageSourceUrl);
    const jobs = (await req.payload.find({collection: 'payload-jobs', where: {and: [{queue: {equals: queue}}, {completedAt: {exists: false}}, {hasError: {not_equals: true}}]}, pagination: false, depth: 0, req})).docs;
    const attemptedIds: number[] = [];
    let imported = 0, failed = 0;
    for (const doc of eligible.slice(0, batchSize)) {
      const active = jobs.filter(job => job.taskSlug === 'import-wms-content-image' && (job.input as {productId?: number})?.productId === doc.id);
      // A stopped Vercel request may leave a claim behind. Do not steal recent work.
      if (active.some(job => job.processing && Date.parse(job.updatedAt) > Date.now() - 15 * 60 * 1000)) continue;
      let job = active.find(job => !job.processing) || active[0];
      if (!job) job = await req.payload.jobs.queue({task: 'import-wms-content-image', input: {productId: doc.id}, queue, req, overrideAccess: false});
      attemptedIds.push(doc.id);
      try {
        await req.payload.jobs.runByID({id: job.id, req, overrideAccess: false});
      } catch (error) {
        req.payload.logger.error({err: error}, 'Manual WMS image job failed');
      }
      const current = await req.payload.findByID({collection: 'products', id: doc.id, depth: 0, req});
      if (current.images?.length) imported++;
      else if (current.wmsImageImportStatus !== 'protected') failed++;
    }
    const after = await imageImportCandidates(req, collectionId);
    const seen = new Set([...excludeIds, ...attemptedIds]);
    const available = after.filter(doc => !seen.has(doc.id) && !doc.images?.length && ['pending', 'failed'].includes(doc.wmsImageImportStatus || '') && doc.wmsImageSourceUrl).length;
    return {busy: attemptedIds.length === 0 && eligible.length > 0, attemptedIds, imported, failed, available, summary: summarizeImageImports(after)};
  } finally {
    await lock.query('ROLLBACK').catch(() => {});
    await lock.end();
  }
}
