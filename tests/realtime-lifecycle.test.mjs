import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realtimeLifecycle } from '../src/lib/realtime-lifecycle.ts';

test('each reconnect refreshes data once and disposed subscriptions cannot update a screen', () => {
  const events=[];
  const lifecycle=realtimeLifecycle(()=>events.push('refresh'),()=>events.push('offline'));
  lifecycle.status('SUBSCRIBED');
  lifecycle.status('SUBSCRIBED');
  lifecycle.status('CHANNEL_ERROR');
  lifecycle.status('SUBSCRIBED');
  lifecycle.status('TIMED_OUT');
  lifecycle.status('SUBSCRIBED');
  assert.deepEqual(events,['refresh','offline','refresh','offline','refresh']);
  lifecycle.stop();
  lifecycle.status('CLOSED');
  lifecycle.status('SUBSCRIBED');
  assert.equal(events.length,5);
});
