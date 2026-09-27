import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Read-only checks: no sign-ins, tokens, account changes or response bodies in logs. */
export async function verifyHosting(origin, fetcher = fetch) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('Provide a public HTTPS origin only.');
  const results = [];
  let home = '';
  for (const path of ['/', '/auth-callback', '/legal', '/account-deletion/']) {
    try {
      const response = await fetcher(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      const html = await response.text();
      const ok = response.status === 200 && /text\/html/i.test(response.headers.get('content-type') ?? '') &&
        (path === '/account-deletion/' ? html.includes('mailto:') && html.includes('FNDRS Society') : /<script\b/i.test(html));
      results.push({ path, ok, check: 'HTML route' });
      results.push({ path, ok: response.headers.get('referrer-policy') === 'no-referrer' && response.headers.get('x-content-type-options') === 'nosniff', check: 'Response headers' });
      if (path === '/' && ok) home = html;
    } catch { results.push({ path, ok: false, check: 'Route reachable' }); }
  }
  const source = home.match(/<script\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  if (source) {
    const asset = new URL(source.replaceAll('&amp;', '&'), base);
    if (asset.origin !== base.origin) results.push({ path: 'bundle', ok: false, check: 'Same-origin bundle' });
    else {
      try {
        const r = await fetcher(asset, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
        results.push({ path: 'bundle', ok: r.status === 200 && /(?:javascript|ecmascript)/i.test(r.headers.get('content-type') ?? ''), check: 'JavaScript bundle' });
        await r.body?.cancel();
      } catch { results.push({ path: 'bundle', ok: false, check: 'JavaScript bundle' }); }
    }
  } else results.push({ path: 'bundle', ok: false, check: 'Bundle reference' });
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const results = await verifyHosting(process.env.EXPO_PUBLIC_WEB_ORIGIN);
    for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.path}: ${result.check}`);
    if (results.some(r => !r.ok)) process.exitCode = 1;
    console.log('This check does not prove authentication, legal review or account deletion delivery.');
  } catch { console.error('Hosting verification needs EXPO_PUBLIC_WEB_ORIGIN with a public HTTPS origin.'); process.exitCode = 1; }
}
