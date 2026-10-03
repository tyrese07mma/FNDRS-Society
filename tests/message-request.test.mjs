import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageAttempt, createMessageOutbox } from '../src/lib/message-request.ts';
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

test('pending sends survive a fresh outbox instance and are isolated by account', async () => {
  const values=new Map();
  const storage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{values.set(key,value);}};
  const first=createMessageOutbox(storage);
  const attempt=await first.prepare('owner-a','chat-a','Saved message');
  const restarted=createMessageOutbox(storage);
  assert.deepEqual(await restarted.read('owner-a','chat-a'),attempt);
  assert.equal(await restarted.read('owner-b','chat-a'),null);
  assert.equal((await restarted.prepare('owner-a','chat-a','Saved message')).requestId,attempt.requestId);
  await restarted.confirm('owner-a',attempt);
  assert.equal(await first.read('owner-a','chat-a'),null);
  assert.ok([...values.values()].every(value=>!value.includes('Saved message')));
  assert.notEqual((await restarted.prepare('owner-a','chat-a','Saved message')).requestId,attempt.requestId);
});

test('storage failures stop preparation and a late acknowledgment cannot erase a newer draft', async () => {
  const values=new Map();
  const storage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{values.set(key,value);}};
  const outbox=createMessageOutbox(storage);
  const old=await outbox.prepare('owner-a','chat-a','First');
  const next=await outbox.prepare('owner-a','chat-a','Second');
  await outbox.confirm('owner-a',old);
  assert.deepEqual(await outbox.read('owner-a','chat-a'),next);
  await assert.rejects(createMessageOutbox({...storage,setItem:async()=>{throw new Error('Full');}}).prepare('owner-a','chat-a','Third'),/Full/);
  assert.deepEqual(await outbox.read('owner-a','chat-a'),next);
  values.set('fndrs.message.owner-a.chat-a','not-json');
  await assert.rejects(outbox.prepare('owner-a','chat-a','Third'));
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
