import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteAvatars} from '../supabase/functions/_shared/delete-avatars.ts';

test('avatar cleanup removes multiple pages and nested objects without crossing users',async()=>{
 const objects=new Set([...Array.from({length:220},(_,i)=>`owner/image${i}.png`),'owner/nested/photo.png','other/photo.png']);
 const bucket={
  async list(prefix,{limit,offset}) {
   assert.equal(offset,0);
   const children=new Map();
   for(const object of objects) if(object.startsWith(prefix+'/')) {
    const tail=object.slice(prefix.length+1); const [name,...rest]=tail.split('/');
    children.set(name,{name,id:rest.length?null:object});
   }
   return {data:[...children.values()].slice(0,limit),error:null};
  },
  async remove(paths) {for(const path of paths)objects.delete(path);return {error:null};},
 };
 await deleteAvatars(bucket,'owner');
 assert.deepEqual([...objects],['other/photo.png']);
});
test('storage failure stops cleanup instead of reporting successful deletion',async()=>{
 await assert.rejects(deleteAvatars({list:async()=>({data:[{name:'avatar.png',id:'id'}],error:null}),remove:async()=>({error:Error('offline')})},'owner'),/cleanup failed/);
});
