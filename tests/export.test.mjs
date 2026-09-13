import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectExport, EXPORT_DATASETS } from '../src/lib/export-data.ts';

test('export collects all pages and datasets without truncating a completed file',async()=>{
 const result=JSON.parse(await collectExport(async(dataset,cursor)=>dataset==='posts'?{rows:[{id:cursor?'second':'first'}],next:cursor?null:'next'}:{rows:[],next:null},async()=>{},()=>{}));
 assert.deepEqual(result.records.posts,[{id:'first'},{id:'second'}]);
 assert.deepEqual(Object.keys(result.records),[...EXPORT_DATASETS]);
});
test('export discards a page if the account changes while the request is running',async()=>{
 let owner='A';
 await assert.rejects(collectExport(async()=>{owner='B';return {rows:[{secret:'B'}],next:null};},async()=>{if(owner!=='A')throw new Error('account changed');},()=>{}),/account changed/);
});
test('export rejects a repeated cursor instead of running an infinite request loop',async()=>{
 await assert.rejects(collectExport(async()=>({rows:[],next:'same'}),async()=>{},()=>{}),/did not advance/);
});
