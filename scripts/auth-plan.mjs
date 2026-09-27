import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function authPlan(origin) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /localhost|\.invalid$|\.test$/.test(url.hostname)) throw new Error('A production HTTPS origin is required.');
  return {
    site_url: url.origin,
    redirect_urls: [
      `${url.origin}/auth-callback`,
      `${url.origin}/auth-callback?next=reset-password`,
      'fndrs://auth-callback',
      'fndrs://auth-callback?next=reset-password',
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(authPlan(process.env.EXPO_PUBLIC_WEB_ORIGIN), null, 2));
    console.log('Configuration plan only. No Supabase settings were changed. Test on a signed native build, not Expo Go.');
  } catch { console.error('Set EXPO_PUBLIC_WEB_ORIGIN to the final production HTTPS origin first.'); process.exitCode = 1; }
}
