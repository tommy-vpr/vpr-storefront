'use client';
import {CmsImageImports} from './cms-image-imports';
import {Button,useDocumentInfo} from '@payloadcms/ui';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {RefreshCw} from 'lucide-react';
export function CmsCollectionSync() {
 const {id}=useDocumentInfo();const router=useRouter();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [importing,setImporting]=useState(false);
 if(!id)return null;
 async function sync(){
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/cms/sync-wms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({collectionId:id})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Sync failed.');
   setMessage(`Synced: ${data.created} new products, ${data.updated} updated, ${data.imagesQueued} image imports queued. Click Import pending images to process the queue.`);router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Sync failed.');}finally{setBusy(false);}
 }
 return <section className="cms-sync-control cms-collection-sync" aria-label="Collection sync and image imports"><Button type="button" className="cms-sync-button" buttonStyle="primary" margin={false} disabled={busy || importing} onClick={sync} icon={<RefreshCw size={16} className={busy?'cms-sync-spinner':undefined} aria-hidden="true" />} iconPosition="left">{busy?'Syncing...':'Sync this collection from WMS'}</Button><p className="cms-sync-status" role="status" aria-live="polite" hidden={!message}>{message}</p><CmsImageImports key={id} collectionId={id} disabled={busy} onBusyChange={setImporting} /></section>;
}
