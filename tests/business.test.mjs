import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasPaidAccess} from '../src/lib/subscription.ts';
import {authCallbackParams} from '../src/lib/auth-callback.ts';
import {SseDecoder} from '../src/lib/sse.ts';
test('payment states fail closed',()=>{
 const now=Date.parse('2026-09-11T12:00:00Z');
 for(const status of ['past_due','incomplete','canceled'])assert.equal(hasPaidAccess({tier:'pro',status,current_period_end:'2026-10-01'},now),false);
 assert.equal(hasPaidAccess({tier:'pro',status:'active',current_period_end:'2026-10-01'},now),true);
 assert.equal(hasPaidAccess({tier:'pro',status:'trialing',current_period_end:null},now),false);
 assert.equal(hasPaidAccess({tier:'pro',status:'active',current_period_end:'2026-09-01'},now),false);
 assert.equal(hasPaidAccess({tier:'free',status:'active',current_period_end:'2026-10-01'},now),false);
});
test('auth callback never accepts an arbitrary redirect destination',()=>{
 assert.equal(authCallbackParams('fndrs://auth-callback?code=abc&next=https://evil.test').recovery,false);
 assert.equal(authCallbackParams('fndrs://auth-callback?code=abc&next=reset-password').recovery,true);
 assert.equal(authCallbackParams('https://app.test/auth-callback#error=access_denied').error,true);
});
test('SSE parser handles split frames, CRLF, multiline data and heartbeats',()=>{
 const d=new SseDecoder(); assert.deepEqual(d.push('event: delta\r\ndata: {"te'),[]);
 assert.deepEqual(d.push('xt":"Hi"}\r\n\r\n:ping\n\nevent: done\ndata: one\ndata: two\n\n'),[
  {event:'delta',data:'{"text":"Hi"}'},{event:'done',data:'one\ntwo'},
 ]);
});
