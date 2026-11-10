import { Client } from 'pg';
import { createLocalReq, type Payload } from 'payload';
export interface CatalogSnapshot {
 storeId: string;
 collections: {id: string; name: string; slug: string; description?: string | null}[];
 products: {productId: string; name: string; imageUrl: string | null; collectionIds: string[]}[];
 complete: boolean;
}
async function readWms(path: string) {
 if (!process.env.WMS_API_URL || !process.env.WMS_API_KEY) throw new Error('WMS API is not configured.');
 return fetch(process.env.WMS_API_URL + path, {headers: {'x-api-key': process.env.WMS_API_KEY}, cache: 'no-store', signal: AbortSignal.timeout(30000)});
}
export async function fetchCatalogSnapshot(): Promise<CatalogSnapshot> {
 const response = await readWms('/storefront/catalog-sync');
 if (response.ok) return validateSnapshot({...await response.json(), complete: true});
 if (response.status !== 404) throw new Error(`WMS catalog request failed (${response.status}).`);
 // Compatibility with the deployed WMS before the new snapshot endpoint ships.
 // Public lists omit unsellable products: never infer unassignment from this fallback.
 const [storeResponse, collectionsResponse] = await Promise.all([readWms('/storefront/store'), readWms('/storefront/collections')]);
 if (!storeResponse.ok || !collectionsResponse.ok) throw new Error('WMS catalog is unavailable.');
 const store = await storeResponse.json();
 const {collections} = await collectionsResponse.json();
 const products = new Map<string, CatalogSnapshot['products'][number]>();
 for (const collection of collections) {
  let skip = 0;
  while (true) {
   const page = await readWms(`/storefront/collections/${encodeURIComponent(collection.slug)}?take=100&skip=${skip}`);
   if (!page.ok) throw new Error('Collection changed during sync. Please retry.');
   const data = await page.json();
   if (!Array.isArray(data.products) || !Number.isInteger(data.total)) throw new Error('Invalid WMS collection page.');
   for (const product of data.products) {
    const existing = products.get(product.productId);
    if (existing) existing.collectionIds.push(collection.id);
    else products.set(product.productId, {productId: product.productId, name: product.name, imageUrl: product.imageUrl ?? null, collectionIds: [collection.id]});
   }
   skip += data.products.length;
   if (skip >= data.total) break;
   if (!data.products.length) throw new Error('Incomplete WMS collection page.');
  }
 }
 return validateSnapshot({storeId: store.store.id, collections, products: [...products.values()], complete: false});
}
function validateSnapshot(value: CatalogSnapshot): CatalogSnapshot {
 if (!value || typeof value.storeId !== 'string' || !Array.isArray(value.collections) || !Array.isArray(value.products)) throw new Error('Invalid WMS catalog snapshot.');
 if (!process.env.WMS_STORE_ID || value.storeId !== process.env.WMS_STORE_ID) throw new Error('WMS catalog belongs to a different store.');
 const collectionIds = new Set<string>();
 for (const collection of value.collections) {
  if (!collection.id || !collection.name || !collection.slug || collectionIds.has(collection.id)) throw new Error('Invalid or duplicate WMS collection.');
  collectionIds.add(collection.id);
 }
 const productIds = new Set<string>();
 for (const product of value.products) {
  if (!product.productId || !product.name || productIds.has(product.productId) || !Array.isArray(product.collectionIds) || !product.collectionIds.length || product.collectionIds.some(id => !collectionIds.has(id))) throw new Error('Invalid or duplicate WMS product.');
  productIds.add(product.productId);
 }
 return value;
}
export async function syncWmsCatalog(payload: Payload, readSnapshot = fetchCatalogSnapshot, options: {collectionId?: string} = {}) {
 const lock = new Client({connectionString: process.env.PAYLOAD_DATABASE_URL || process.env.DATABASE_URL, connectionTimeoutMillis: 10000});
 await lock.connect();
 let transactionID: string | number | null = null;
 try {
  // Acquire before reading WMS, so concurrent/delayed deliveries cannot apply older snapshots last.
  await lock.query('BEGIN');
  await lock.query("SET LOCAL lock_timeout = '45s'");
  await lock.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['vpr-catalog-sync-v1:' + process.env.WMS_STORE_ID]);
  const snapshot = validateSnapshot(await readSnapshot());
  if(options.collectionId && !snapshot.collections.some(c=>c.id===options.collectionId)) throw new Error('This collection is no longer assigned in WMS.');
  transactionID = await payload.db.beginTransaction();
  if (transactionID == null) throw new Error('Catalog sync requires a database transaction.');
  const req = await createLocalReq({req: {transactionID}}, payload);
  // A transaction uses one pg connection; run its reads sequentially.
  const existingCollections = await payload.find({collection: 'wms-collections', pagination: false, depth: 0, req});
  const existingProducts = await payload.find({collection: 'products', pagination: false, depth: 0, req});
  const collections = new Map(existingCollections.docs.map(doc => [doc.wmsCollectionId, doc]));
  const products = new Map(existingProducts.docs.map(doc => [doc.wmsProductId, doc]));
  const collectionRefs = new Map<string, number>();
  for (const source of snapshot.collections) {
   const wmsDescription = source.description?.trim() || null;
   const data: Record<string, unknown> = {wmsCollectionId: source.id, title: source.name, slug: source.slug, assigned: true, wmsDescription};
   const existing = collections.get(source.id);
   // The editable description is seeded from WMS once (when empty) and never overwritten after that.
   const seedDescription = wmsDescription && !existing?.description?.trim();
   if (existing && existing.title === data.title && existing.slug === data.slug && existing.assigned === true && (existing.wmsDescription ?? null) === wmsDescription && !seedDescription) {collectionRefs.set(source.id, existing.id); continue;}
   if (seedDescription) data.description = wmsDescription;
   // Other presentation fields are not in `data`, so an update never touches them.
   const doc = existing ? await payload.update({collection: 'wms-collections', id: existing.id, data, req}) : await payload.create({collection: 'wms-collections', data: data as never, req});
   collectionRefs.set(source.id, doc.id);
  }
  let created = 0, updated = 0, unassigned = 0, imagesQueued = 0;
  const activeJobs = await payload.find({collection:'payload-jobs',where:{and:[{queue:{equals:'wms-content-images'}},{hasError:{not_equals:true}},{completedAt:{exists:false}}]},pagination:false,depth:0,req});
  const queued = new Set(activeJobs.docs.map(job=>(job.input as {productId?:number})?.productId));
  const syncedAt = new Date().toISOString();
  for (const source of snapshot.products) {
   const existing = products.get(source.productId);
   const inScope = !options.collectionId || source.collectionIds.includes(options.collectionId);
   const membership = {
    title: source.name, wmsProductId: source.productId, assignmentStatus: 'assigned' as const,
    collections: [...new Set(source.collectionIds)].map(id => collectionRefs.get(id)!), imageUrl: source.imageUrl, lastSyncedAt: syncedAt,
   };
   let doc = existing;
   if (!doc) {
    doc = await payload.create({collection: 'products', data: {...membership, showInStorefront: true, wmsImageSourceUrl: source.imageUrl, wmsImageImportStatus: source.imageUrl ? 'pending' : 'no-image'}, context: {wmsContentSync: true}, req});
    created++;
   } else {
    const changed = doc.title !== membership.title || doc.assignmentStatus !== 'assigned' || (doc.imageUrl ?? null) !== membership.imageUrl || JSON.stringify(doc.collections ?? []) !== JSON.stringify(membership.collections);
    // A new WMS image re-arms the import unless the editor already uploaded a gallery or protected the record.
    const rearm = inScope && ['pending','failed','no-image'].includes(doc.wmsImageImportStatus || '') && !doc.images?.length && source.imageUrl && doc.wmsImageSourceUrl !== source.imageUrl;
    if (changed || rearm) {
     doc = await payload.update({collection: 'products', id: doc.id, data: {...membership, ...(rearm ? {wmsImageSourceUrl: source.imageUrl, wmsImageImportStatus: 'pending', wmsImageImportError: null} : {})}, context: {wmsContentSync: true}, req});
     updated++;
    }
   }
   if (inScope && ['pending','failed'].includes(doc.wmsImageImportStatus || '') && !doc.images?.length && doc.wmsImageSourceUrl && !queued.has(doc.id)) {
    await payload.jobs.queue({task:'import-wms-content-image',input:{productId:doc.id},queue:'wms-content-images',req});
    queued.add(doc.id); imagesQueued++;
   }
  }
  if (snapshot.complete) {
   const assignedIds = new Set(snapshot.products.map(product => product.productId));
   for (const doc of existingProducts.docs) if (!assignedIds.has(doc.wmsProductId) && (doc.assignmentStatus !== 'unassigned' || doc.collections?.length)) {
    await payload.update({collection: 'products', id: doc.id, data: {assignmentStatus: 'unassigned', collections: [], lastSyncedAt: syncedAt}, context: {wmsContentSync: true}, req}); unassigned++;
   }
   for (const doc of existingCollections.docs) if (!collectionRefs.has(doc.wmsCollectionId) && doc.assigned !== false) {
    await payload.update({collection: 'wms-collections', id: doc.id, data: {assigned: false}, req});
   }
  }
  await payload.db.commitTransaction(transactionID); transactionID = null;
  return {created, updated, unassigned, imagesQueued, assigned: snapshot.products.length, collections: snapshot.collections.length, complete: snapshot.complete, syncedAt};
 } catch (error) {
  if (transactionID != null) await payload.db.rollbackTransaction(transactionID);
  throw error;
 } finally {
  try {await lock.query('ROLLBACK');}
  finally {await lock.end();}
 }
}
