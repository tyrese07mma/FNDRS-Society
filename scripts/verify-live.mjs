// Explicit opt-in integration test. Creates and removes only run-owned fixtures.
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const project=process.env.FNDRS_LIVE_TEST_PROJECT;
const cli=process.env.FNDRS_TEST_CLI;
const output=process.env.FNDRS_TEST_OUTPUT;
if(project!=='echedxohsntgeijbxmsc'||!cli||!output) throw Error('Explicit FNDRS test project, CLI and output directory required');
const runId=randomUUID();
const results=[];const accounts=[];const clients=[];
mkdirSync(output,{recursive:true});
const manifest=()=>writeFileSync(resolve(output,'fixtures.json'),JSON.stringify({project,runId,accounts:accounts.map(({id,email,deleted})=>({id,email,deleted:!!deleted}))},null,2));
const check=(condition,name)=>{if(!condition)throw Error(name);};
async function ok(operation,label){const result=await operation;if(result.error)throw Error(`${label} failed (${result.error.code??result.error.status??'provider'})`);return result.data;}
const pass=name=>{results.push({name,passed:true});console.log('PASS '+name);};
const url=`https://${project}.supabase.co`;
let admin,publicKey;
function client(key){const c=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}});clients.push(c);return c;}
try {
 const raw=execFileSync(cli,['projects','api-keys','--project-ref',project,'--output','json','--agent','no'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
 const keys=JSON.parse(raw);publicKey=keys.find(k=>k.name==='anon')?.api_key;
 const secret=keys.find(k=>k.name==='service_role')?.api_key;
 check(publicKey&&secret,'Existing project keys unavailable');admin=client(secret);
 for(const name of ['A','B']){
  const email=`fndrs-test-${runId}-${name.toLowerCase()}@example.invalid`;
  const password=randomBytes(32).toString('base64url')+'Aa1!';
  const data=await ok(admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`FNDRS Test ${name}`,fndrs_test_run:runId}}),'Create controlled account');
  const account={id:data.user.id,email,password,client:client(publicKey)};accounts.push(account);manifest();
  await ok(account.client.auth.signInWithPassword({email,password}),'Test login');
  await ok(account.client.from('profiles').update({onboarded:true,discoverable:true,bio:'Temporary automated FNDRS verification'}).eq('id',account.id),'Test onboarding');
 }
 const [a,b]=accounts;pass('Two isolated authenticated sessions');
 await ok(a.client.from('profiles').update({headline:'Temporary verified profile update'}).eq('id',a.id),'Profile update');
 const profile=await ok(b.client.rpc('get_profile',{p_id:a.id}),'Other user profile read');
 check(profile.headline==='Temporary verified profile update','Profile update not visible');
 const forged=await ok(b.client.from('profiles').update({headline:'Forbidden update'}).eq('id',a.id).select('id'),'Foreign profile attempt');
 check(forged.length===0,'Foreign profile write allowed');pass('Profile propagation and foreign-write isolation');
 const post=await ok(a.client.from('posts').insert({author_id:a.id,body:'Temporary automated integration check — removed after this run.'}).select('id').single(),'Post creation');
 const visible=await ok(b.client.from('posts').select('id').eq('id',post.id).single(),'Other user post read');check(visible.id===post.id,'Post not visible');
 await ok(b.client.from('post_likes').insert({post_id:post.id,user_id:b.id}),'Like');
 await ok(b.client.from('follows').insert({follower_id:b.id,followee_id:a.id}),'Follow');
 const liked=await ok(a.client.from('posts').select('like_count').eq('id',post.id).single(),'Like count');check(liked.like_count===1,'Like count mismatch');pass('Post visibility, like and follow persistence');
 await ok(a.client.rpc('swipe',{p_target:b.id,p_action:'connect'}),'First swipe');
 const match=await ok(b.client.rpc('swipe',{p_target:a.id,p_action:'connect'}),'Mutual swipe');check(match.matched&&match.conversation_id,'Mutual match missing');
 const conv=match.conversation_id;pass('Mutual match creates a conversation');
 let receive;const received=new Promise(resolve=>{receive=resolve;});
 let timer;const channel=b.client.channel(`thread:${conv}`,{config:{private:true}})
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${conv}`},payload=>receive(payload.new));
 await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Realtime subscription timeout')),20000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(Error('Realtime subscription failed'));}});});
 const requestId=randomUUID();const args={p_conversation:conv,p_body:'Temporary private message',p_request_id:requestId};
 const [one,two]=await Promise.all([ok(a.client.rpc('send_message',args),'Send message'),ok(a.client.rpc('send_message',args),'Concurrent retry')]);check(one.id===two.id,'Concurrent send duplicated');
 const inbox=await ok(b.client.rpc('list_conversations'),'Inbox loading');
 check(inbox.some(row=>row.id===conv&&row.last_message===args.p_body),'Inbox conversation missing');pass('Inbox loads the saved conversation');
 const notifications=await ok(a.client.from('notifications').select('id, kind, title, body, link, read, created_at, actor:profiles!notifications_actor_fk(id, full_name, avatar_url)').eq('user_id',a.id).order('created_at',{ascending:false}).limit(100),'Notification loading');
 check(notifications.length>0,'Expected activity notifications missing');
 await ok(a.client.from('notifications').update({read:true}).eq('user_id',a.id).eq('read',false),'Mark notifications read');pass('Notifications load with actor profiles and can be marked read');
 const event=await Promise.race([received,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Realtime delivery timeout')),20000);})]);clearTimeout(timer);
 check(event.id===one.id&&event.sender_id===a.id,'Realtime sender/message mismatch');pass('Realtime delivery and concurrent-send idempotency');
 await ok(b.client.rpc('mark_read',{p_conversation:conv}),'Mark read');
 const reads=await ok(a.client.from('conversation_reads').select('last_read_at').eq('conversation_id',conv).eq('user_id',b.id).single(),'Read receipt');check(!!reads.last_read_at,'Read receipt missing');pass('Read receipt persists');
 const fresh=client(publicKey);await ok(fresh.auth.signInWithPassword({email:b.email,password:b.password}),'Fresh session login');
 const history=await ok(fresh.rpc('message_page',{p_conversation:conv,p_limit:50}),'Persisted history');check(history.some(row=>row.id===one.id),'Message missing after fresh login');pass('Fresh client login retains message history');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64');
 const path=`${a.id}/integration.png`;
 await ok(a.client.storage.from('avatars').upload(path,png,{contentType:'image/png'}),'Owned avatar upload');
 const intrusion=await b.client.storage.from('avatars').upload(path,png,{contentType:'image/png',upsert:true});check(!!intrusion.error,'Foreign avatar overwrite allowed');pass('Storage accepts owned uploads and rejects foreign overwrite');
 await ok(a.client.rpc('set_user_block',{p_target:b.id,p_blocked:true}),'Block peer');
 const blocked=await b.client.rpc('send_message',{p_conversation:conv,p_body:'Must be rejected',p_request_id:randomUUID()});check(!!blocked.error,'Blocked message allowed');pass('Blocking prevents further messages');
} catch(error) {
 results.push({name:error.message,passed:false});console.log('FAIL '+error.message);process.exitCode=1;
} finally {
 for(const account of accounts){
  try {
   const owned=await ok(admin.auth.admin.getUserById(account.id),'Cleanup ownership lookup');
   check(owned.user.user_metadata.fndrs_test_run===runId&&owned.user.email===account.email,'Cleanup ownership mismatch');
   const session=await ok(account.client.auth.getSession(),'Cleanup session');
   const response=await fetch(`${url}/functions/v1/delete-account`,{method:'POST',headers:{apikey:publicKey,Authorization:`Bearer ${session.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({password:account.password,expectedUserId:account.id}),signal:AbortSignal.timeout(45000)});
   const deletion=await response.json();
   if(!response.ok||deletion.deleted!==true) {
    results.push({name:`Account deletion function rejected test ${accounts.indexOf(account)+1} (HTTP ${response.status})`,passed:false});process.exitCode=1;
    // Fallback only for this run's generated account after verifying its marker.
    await ok(admin.rpc('claim_account_operation',{p_user:account.id,p_kind:'delete'}),'Cleanup lease');
    const files=await ok(admin.storage.from('avatars').list(account.id),'Cleanup avatar list');
    if(files.length)await ok(admin.storage.from('avatars').remove(files.map(file=>`${account.id}/${file.name}`)),'Cleanup avatar removal');
    await ok(admin.auth.admin.deleteUser(account.id),'Cleanup generated account');
   } else pass(`Account deletion function completed for test ${accounts.indexOf(account)+1}`);
   const gone=await admin.auth.admin.getUserById(account.id);check(!gone.data.user,'Generated account still exists');
   account.deleted=true;manifest();
  } catch(error) {results.push({name:`Generated fixture cleanup: ${error.message}`,passed:false});console.log('FAIL generated fixture cleanup');process.exitCode=1;}
 }
 for(const c of clients){await c.removeAllChannels();c.auth.stopAutoRefresh();}
 writeFileSync(resolve(output,'report.json'),JSON.stringify({project,runId,at:new Date().toISOString(),scope:'Admin-confirmed synthetic accounts; not an email verification or device/UI test',results,cleanupComplete:accounts.every(a=>a.deleted)},null,2));
 console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,cleanupComplete:accounts.every(a=>a.deleted)}));
}
