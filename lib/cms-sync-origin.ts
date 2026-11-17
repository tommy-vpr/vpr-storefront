type CmsRequest = {url?: string; headers: Headers; payload?: {config?: {serverURL?: string}}};

/** Next/proxy request URLs can differ from the origin used by the admin browser. */
export function isCmsSyncRequest(req: CmsRequest): boolean {
 if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return false;
 const origin = req.headers.get('origin');
 if (!origin || origin === 'null') return false;
 try {
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) return false;
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return false;
  // Browser-controlled Fetch Metadata cannot be supplied by cross-origin page JS.
  if (fetchSite === 'same-origin') return true;
  const urls = [req.url, req.payload?.config?.serverURL];
  return urls.some(url => {try {return !!url && new URL(url).origin === origin;} catch {return false;}});
 } catch {return false;}
}
