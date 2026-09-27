import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deletionPage } from '../scripts/web-release.mjs';
import { verifyHosting } from '../scripts/verify-hosting.mjs';

test('public deletion page refuses missing configuration and escapes configured links', () => {
  assert.throws(() => deletionPage({}));
  const env = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fixture_not_a_real_key',
    EXPO_PUBLIC_WEB_ORIGIN: 'https://fndrs.society', EXPO_PUBLIC_SUPPORT_EMAIL: 'support@fndrs.society',
    ...Object.fromEntries(['TERMS', 'PRIVACY', 'IMPRINT', 'GUIDELINES'].map(k => [`EXPO_PUBLIC_${k}_URL`, 'https://fndrs.society/legal?q=1&lang=de'])),
  };
  const html = deletionPage(env);
  assert.ok(html.includes('mailto:support@fndrs.society'));
  assert.ok(html.includes('q=1&amp;lang=de'));
  assert.ok(html.includes('lang="en"'));
  assert.ok(!html.includes('privacy@'));
});

test('hosting check detects SPA fallbacks masquerading as deletion page or JavaScript', async () => {
  const headers = { 'content-type': 'text/html', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
  const fetcher = async () => new Response('<script src="/bundle.js"></script>', { headers });
  const results = await verifyHosting('https://fndrs.society', fetcher);
  assert.ok(results.find(r => r.path === '/' && r.check === 'HTML route').ok);
  assert.equal(results.find(r => r.path === '/account-deletion/' && r.check === 'HTML route').ok, false);
  assert.equal(results.find(r => r.path === 'bundle').ok, false);
  await assert.rejects(() => verifyHosting('https://user:password@fndrs.society', fetcher));
});
