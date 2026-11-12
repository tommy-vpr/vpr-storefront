'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Gutter } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import { ImageDown } from 'lucide-react';

type Summary = {complete: number; pending: number; failed: number; remaining: number; noImage: number};
type Result = {summary: Summary; busy?: boolean; attemptedIds?: number[]; imported?: number; failed?: number; available?: number; error?: string};
type Props = {collectionId?: string | number; disabled?: boolean; onBusyChange?: (busy: boolean) => void};

export function CmsImageImports({collectionId, disabled, onBusyChange}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState<Summary>();
  const [processed, setProcessed] = useState(0);
  const [target, setTarget] = useState(0);
  const mounted = useRef(false);
  const paused = useRef(false);
  const running = useRef(false);

  async function request(action: 'status' | 'run', excludeIds: number[] = []): Promise<Result> {
    const response = await fetch('/api/cms/import-wms-images', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action, collectionId, excludeIds})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Image import failed. Please try again.');
    return data;
  }
  useEffect(() => {
    mounted.current = true;
    if (!disabled) request('status').then(data => {if (mounted.current) setSummary(data.summary);}).catch(() => {});
    return () => {mounted.current = false; paused.current = true;};
    // Each control has a fixed collection scope for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, disabled]);

  async function start() {
    if (running.current) return;
    running.current = true; paused.current = false;
    setBusy(true); onBusyChange?.(true); setMessage('Checking pending images...'); setProcessed(0);
    const attempted: number[] = [];
    let imported = 0, failed = 0;
    try {
      const status = await request('status');
      if (!mounted.current) return;
      setSummary(status.summary); setTarget(status.summary.remaining);
      if (!status.summary.remaining) {setMessage('No pending image imports.'); return;}
      while (mounted.current && !paused.current) {
        const data = await request('run', attempted);
        if (!mounted.current) return;
        setSummary(data.summary);
        attempted.push(...(data.attemptedIds || []));
        imported += data.imported || 0; failed += data.failed || 0;
        setProcessed(attempted.length);
        setMessage(imported + ' imported; ' + data.summary.remaining + ' remaining' + (failed ? '; ' + failed + ' need retry.' : '.'));
        if (data.busy) {setMessage('Another import is running. Completed images are saved; try again shortly.'); break;}
        if (!data.available || !data.attemptedIds?.length) break;
      }
      if (mounted.current && paused.current) setMessage('Paused. Completed images are saved. Click Import pending images to resume.');
      if (mounted.current) router.refresh();
    } catch (error) {
      if (mounted.current) {setMessage(error instanceof Error ? error.message : 'Import failed.'); router.refresh();}
    } finally {
      running.current = false;
      if (mounted.current) {setBusy(false); onBusyChange?.(false);}
    }
  }
  return <div className="cms-sync-control cms-image-imports">
    <div className="cms-image-import-actions">
      <Button type="button" className="cms-sync-button" margin={false} disabled={busy || disabled} onClick={start} icon={<ImageDown size={16} aria-hidden="true" />} iconPosition="left">{busy ? 'Importing images...' : 'Import pending images'}</Button>
      {busy && <Button type="button" buttonStyle="secondary" margin={false} onClick={() => {paused.current = true; setMessage('Pausing after the current batch...');}}>Pause</Button>}
    </div>
    {busy && target > 0 && <progress aria-label="Images processed this run" value={processed} max={target} />}
    <p className="cms-sync-status" role="status" aria-live="polite">{message || (summary ? summary.remaining + ' pending or failed image imports.' + (summary.noImage ? ' ' + summary.noImage + ' products have no WMS image.' : '') : 'Import missing WMS images in batches. Existing images are preserved.')}</p>
    <p className="cms-sync-status">{collectionId ? 'Imports images for this collection.' : 'Imports images for all assigned products.'} Keep this page open while importing. You can pause or leave and resume later.</p>
  </div>;
}
export function CmsImageImportsList() {return <Gutter className="cms-sync-list"><CmsImageImports /></Gutter>;}
