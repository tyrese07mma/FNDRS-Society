import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeErrorCopy } from '../src/lib/error-copy.ts';

test('untrusted provider errors never expose internal details through interface copy',()=>{
 const fallback='The request could not be completed. Please try again.';
 for(const error of [new Error('SQL select secret from auth.users'),{message:'sk-secret',code:'23505'},'private stack',{code:'constructor'},{code:'__proto__'},null]) assert.equal(safeErrorCopy(error),fallback);
 assert.equal(safeErrorCopy({code:'FORBIDDEN',message:'internal account ID abc'}),'This action is not available for your account.');
 assert.equal(safeErrorCopy({message:'Email or password is incorrect.'}),'Email or password is incorrect.');
});
