import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime } from '../src/lib/relative-time.ts';

test('notification, inbox and chat timestamps work without a RelativeTimeFormat constructor', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'RelativeTimeFormat');
  try {
    Object.defineProperty(Intl, 'RelativeTimeFormat', { value: undefined, configurable: true });
    assert.equal(relativeTime(-3, 'minute', 'de-DE'), 'vor 3 Minuten');
    assert.equal(relativeTime(-1, 'hour', 'en-US'), '1 hour ago');
    assert.equal(relativeTime(0, 'second', 'de-DE'), 'jetzt');
    assert.equal(relativeTime(0, 'day', 'de-DE', false), 'heute');
    assert.equal(relativeTime(-1, 'day', 'en-US', false), 'yesterday');
    assert.equal(relativeTime(2, 'week', 'de-DE'), 'in 2 Wochen');
  } finally {
    Object.defineProperty(Intl, 'RelativeTimeFormat', descriptor);
  }
});

test('supported runtimes retain native locale formatting', () => {
  for (const locale of ['de-DE', 'en-US']) {
    assert.equal(relativeTime(-3, 'minute', locale), new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' }).format(-3, 'minute'));
  }
});
