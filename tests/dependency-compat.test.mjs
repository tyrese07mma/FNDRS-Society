import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);

test('patched decoder preserves the query-string interface used by Expo Router', () => {
  const query = require('query-string');
  assert.deepEqual({ ...query.parse('q=Gr%C3%BCnder+%26+Co&tag=AI&tag=SaaS&empty=&flag') }, {
    q: 'Gründer & Co', tag: ['AI', 'SaaS'], empty: '', flag: null,
  });
  const serialized = query.stringify({ next: 'reset-password', text: 'Gründer & Co', tag: ['AI', 'SaaS'] });
  const roundtrip = query.parse(serialized);
  assert.equal(roundtrip.text, 'Gründer & Co');
  assert.deepEqual(roundtrip.tag, ['AI', 'SaaS']);
  assert.equal(roundtrip.next, 'reset-password');
  assert.equal(query.parse('value=%25E0').value, '%E0');
});

test('malformed percent input completes in a bounded subprocess', () => {
  const result = execFileSync(process.execPath, ['-e', `
    const query = require('query-string');
    const result = query.parse('value=' + '%E0%A4'.repeat(10000));
    if (typeof result.value !== 'string') process.exit(1);
    process.stdout.write('completed');
  `], { timeout: 10000, encoding: 'utf8' });
  assert.equal(result, 'completed');
});

test('xcode generates valid unique project identifiers with patched uuid', () => {
  const project = require('xcode').project('fixture.pbxproj');
  project.hash = { project: { objects: {} } };
  const ids = Array.from({ length: 100 }, () => project.generateUuid());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[A-F0-9]{24}$/);
});
