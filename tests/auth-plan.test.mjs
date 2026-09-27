import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authPlan } from '../scripts/auth-plan.mjs';
test('auth plan rejects injected destinations and produces exact web/native callbacks', () => {
  for (const url of ['http://localhost:8090', 'https://user:secret@host.com', 'https://host.com/path', 'https://host.com?next=bad', 'https://host.com/#bad']) assert.throws(() => authPlan(url));
  const plan = authPlan('https://app.fndrs.society');
  assert.equal(plan.site_url, 'https://app.fndrs.society');
  assert.equal(plan.redirect_urls.length, 4);
  assert.ok(plan.redirect_urls.includes('https://app.fndrs.society/auth-callback?next=reset-password'));
  assert.ok(plan.redirect_urls.includes('fndrs://auth-callback'));
  assert.ok(plan.redirect_urls.every(url => !url.includes('*')));
});
