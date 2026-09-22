import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseConfigErrors } from '../scripts/release-config.mjs';

const valid = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fixture_not_a_real_key',
  EXPO_PUBLIC_WEB_ORIGIN: 'https://app.fndrs.society',
  EXPO_PUBLIC_TERMS_URL: 'https://fndrs.society/terms',
  EXPO_PUBLIC_PRIVACY_URL: 'https://fndrs.society/privacy',
  EXPO_PUBLIC_IMPRINT_URL: 'https://fndrs.society/imprint',
  EXPO_PUBLIC_GUIDELINES_URL: 'https://fndrs.society/guidelines',
  EXPO_PUBLIC_SUPPORT_EMAIL: 'support@fndrs.society',
};
test('release configuration rejects preview, missing legal pages and leaked server credentials', () => {
  assert.deepEqual(releaseConfigErrors(valid), []);
  for (const name of Object.keys(valid)) assert.ok(releaseConfigErrors({ ...valid, [name]: '' }).length, name);
  assert.ok(releaseConfigErrors({ ...valid, EXPO_PUBLIC_LOCAL_PREVIEW: 'true' }).length);
  assert.ok(releaseConfigErrors({ ...valid, EXPO_PUBLIC_ANTHROPIC_API_KEY: 'server-only-test' }).length);
  const secret = 'eyJ.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.fixture';
  const errors = releaseConfigErrors({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: secret });
  assert.ok(errors.length);
  assert.ok(!errors.join('').includes(secret));
  for (const origin of ['http://localhost:8090', 'https://localhost', 'https://app.example.com', 'https://host.invalid', 'https://user:secret@host.com', 'https://host.com/subpath']) {
    assert.ok(releaseConfigErrors({ ...valid, EXPO_PUBLIC_WEB_ORIGIN: origin }).length, origin);
  }
});
