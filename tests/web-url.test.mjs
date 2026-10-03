import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webUrl, openWebDestination } from '../src/lib/web-url.ts';

test('external web destinations normalize domains and reject unsafe schemes and credentials', () => {
  assert.equal(webUrl(' example.com/about '), 'https://example.com/about');
  assert.equal(webUrl('HTTPS://example.com/a?q=one%20two'), 'https://example.com/a?q=one%20two');
  for (const value of ['', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'https://user:secret@example.com', 'https://exa mple.com', 'https://example.com\n@evil.test', 'https:\\evil.test']) {
    assert.throws(() => webUrl(value), value);
  }
});

test('external link failures are reported without leaking provider errors', async () => {
  let errors = 0;
  let opens = 0;
  const open = async () => { opens++; throw new Error('provider detail'); };
  assert.equal(await openWebDestination('javascript:alert(1)', open, () => errors++), false);
  assert.equal(opens, 0);
  assert.equal(await openWebDestination('example.com', open, () => errors++), false);
  assert.equal(await openWebDestination(() => { throw new Error('bad date'); }, open, () => errors++), false);
  assert.equal(errors, 3);
  assert.equal(await openWebDestination('example.com', async url => assert.equal(url, 'https://example.com/'), () => errors++), true);
  assert.equal(errors, 3);
});
