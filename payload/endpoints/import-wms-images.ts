import type { Endpoint } from 'payload';
import { imageImportCandidates, runManualImageBatch, summarizeImageImports } from '../../lib/wms-manual-images';

export const importWmsImagesEndpoint: Endpoint = {
  path: '/import-wms-images',
  method: 'post',
  handler: async req => {
    if (!req.user || req.user.collection !== 'users') return Response.json({error: 'Sign in to Payload to import images.'}, {status: 401});
    const origin = req.headers.get('origin');
    if (!req.headers.get('content-type')?.includes('application/json') || (origin && origin !== new URL(req.url!).origin)) {
      return Response.json({error: 'Invalid request origin.'}, {status: 403});
    }
    let body;
    try { body = await req.json!(); } catch { return Response.json({error: 'Invalid JSON body.'}, {status: 400}); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !['status', 'run'].includes(body.action)) return Response.json({error: 'Invalid action.'}, {status: 400});
    let collectionId: number | undefined;
    if (body.collectionId !== undefined) {
      if (typeof body.collectionId !== 'string' && typeof body.collectionId !== 'number') return Response.json({error: 'Invalid collection ID.'}, {status: 400});
      collectionId = Number(body.collectionId);
      if (!Number.isSafeInteger(collectionId) || collectionId < 1) return Response.json({error: 'Invalid collection ID.'}, {status: 400});
      const collection = await req.payload.findByID({collection: 'wms-collections', id: collectionId, depth: 0, req, overrideAccess: false, disableErrors: true});
      if (!collection) return Response.json({error: 'Collection not found.'}, {status: 404});
    }
    const excludeIds = body.excludeIds ?? [];
    if (!Array.isArray(excludeIds) || excludeIds.length > 10000 || excludeIds.some((id: unknown) => !Number.isSafeInteger(id) || Number(id) < 1)) return Response.json({error: 'Invalid image selection.'}, {status: 400});
    try {
      if (body.action === 'status') return Response.json({summary: summarizeImageImports(await imageImportCandidates(req, collectionId))});
      return Response.json(await runManualImageBatch(req, collectionId, excludeIds));
    } catch (error) {
      req.payload.logger.error({err: error}, 'Manual WMS image import failed');
      return Response.json({error: 'Image import could not finish. Completed images are saved; try again.'}, {status: 503});
    }
  },
};
