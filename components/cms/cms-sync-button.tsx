"use client";
import {CmsImageImports} from './cms-image-imports';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {Button, Gutter} from '@payloadcms/ui';
import {RefreshCw} from 'lucide-react';
export function CmsSyncButton() {
 const router = useRouter();
 const [busy, setBusy] = useState(false);
 const [importing, setImporting] = useState(false);
 const [message, setMessage] = useState('');
 async function sync() {
  setBusy(true); setMessage('');
  try {
   const response = await fetch('/api/cms/sync-wms', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
   const data = await response.json();
   if (!response.ok) throw new Error(data.error || 'Sync failed. Please try again.');
   setMessage(`Synced ${data.assigned} products across ${data.collections} collections (${data.created} new, ${data.updated} updated, ${data.unassigned} unassigned). ${data.imagesQueued} images queued — click Import pending images to process them. Your visibility and content edits are preserved.`);
   router.refresh();
  } catch (error) {setMessage(error instanceof Error ? error.message : 'Sync failed');}
  finally {setBusy(false);}
 }
 return <Gutter className="cms-sync-list"><div className="cms-sync-control cms-sync-control--list"><Button className="cms-sync-button" buttonStyle="primary" margin={false} type="button" disabled={busy || importing} onClick={sync} icon={<RefreshCw size={16} className={busy?'cms-sync-spinner':undefined} aria-hidden="true" />} iconPosition="left">{busy ? 'Syncing...' : 'Sync from WMS'}</Button><p className="cms-sync-status" role="status" aria-live="polite" hidden={!message}>{message}</p><CmsImageImports disabled={busy} onBusyChange={setImporting} /></div></Gutter>;
}
