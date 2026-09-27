import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageAttempt } from '../src/lib/message-request.ts';
import { mergeThreadMessages } from '../src/lib/thread-messages.ts';

test('a failed send retains identity for retry but changed content or recipient gets a new identity', () => {
  const first=messageAttempt(null,'conversation-a',' Hello ');
  assert.equal(messageAttempt(first,'conversation-a','Hello'),first);
  assert.notEqual(messageAttempt(first,'conversation-a','Other').requestId,first.requestId);
  assert.notEqual(messageAttempt(first,'conversation-b','Hello').requestId,first.requestId);
  // Clearing a successful attempt permits intentionally sending the same text again.
  assert.notEqual(messageAttempt(null,'conversation-a','Hello').requestId,first.requestId);
  assert.ok(first.requestId.length<=128);
});

test('realtime and HTTP reconciliation preserves repeated text, removes only matching pending sends, and orders messages', () => {
  const m=(id,time,extra={})=>({id,conversation_id:'c',sender_id:'a',body:'Same text',created_at:time,...extra});
  const pending=m('temp','2026-09-27T12:00:02Z',{pending:true,client_request_id:'request'});
  const old=m('old','2026-09-27T12:00:00Z');
  const confirmed=m('new','2026-09-27T12:00:01Z',{client_request_id:'request'});
  const result=mergeThreadMessages([pending,old],[confirmed,old]);
  assert.deepEqual(result.map(x=>x.id),['old','new']);
  assert.deepEqual(mergeThreadMessages(result,[confirmed]),result);
  const unrelated=m('other','2026-09-27T12:00:01Z',{sender_id:'b',client_request_id:'request'});
  assert.ok(mergeThreadMessages([pending],[unrelated]).some(x=>x.pending));
});
