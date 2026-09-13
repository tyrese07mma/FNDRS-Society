import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { EXPORT_DATASETS } from '../src/lib/export-data.ts';

// Real PostgreSQL engine; minimal Supabase-owned schemas supplied by this harness.
// Hosted Auth/Storage/Realtime services still require separate integration tests.
let db;
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
before(async()=>{
 db=new PGlite({extensions:{pg_trgm}});
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage; create schema realtime;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 create table realtime.messages(extension text);
 alter table realtime.messages enable row level security;
 create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
 create publication supabase_realtime;
 grant usage on schema public,auth,storage,realtime to anon,authenticated,service_role;
 alter default privileges in schema public grant select,insert,update,delete on tables to authenticated,service_role;
 alter default privileges in schema public grant usage,select on sequences to authenticated,service_role;
 `);
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8')); }
  catch(e){ throw new Error(`${file}: ${e.message} at ${e.position}: ${e.query?.slice(Number(e.position)-100,Number(e.position)+100)}`); }
 }
 for(const [id,name] of [[A,'Alpha'],[B,'Beta'],[C,'Gamma']]) await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`,[id,`${name}@example.test`,JSON.stringify({full_name:name})]);
 await db.exec(`update profiles set onboarded=true;`);
});
after(async()=>{if(db)await db.close();});
async function asUser(id,fn) {
 await db.exec('begin; set local role authenticated;');
 await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[id]);
 try {const result=await fn(); await db.exec('commit'); return result;}
 catch(e){await db.exec('rollback');throw e;}
}
test('new accounts contain no fabricated activity',async()=>{
 const {rows}=await db.query('select count(*)::int n from posts'); assert.equal(rows[0].n,0);
 await asUser(A,async()=>{assert.deepEqual((await db.query('select get_posts() data')).rows[0].data,[]);});
});
test('cannot edit another profile or grant own verification',async()=>{
 await asUser(A,async()=>{assert.equal((await db.query('update profiles set bio=$1 where id=$2 returning id',['hacked',B])).rows.length,0);});
 await assert.rejects(asUser(A,()=>db.exec('update profiles set verified=true')));
});
test('paid access requires active status and unexpired period',async()=>{
 await db.query(`insert into subscriptions(user_id,tier,status,current_period_end) values($1,'pro','past_due',now()+interval '1 day') on conflict(user_id) do update set tier='pro',status='past_due',current_period_end=excluded.current_period_end`,[A]);
 assert.equal(await asUser(A,async()=> (await db.query('select my_tier() tier')).rows[0].tier),'free');
 await assert.rejects(asUser(A,()=>db.exec("update subscriptions set status='active'")));
});
test('hidden location is absent from direct profile reads',async()=>{
 await asUser(B,()=>db.query('update profiles set location=$1,location_visible=false where id=$2',['Private City',B]));
 await asUser(A,async()=>{assert.equal((await db.query('select location from profiles where id=$1',[B])).rows[0].location,'');assert.equal((await db.query('select * from private_profile_data')).rows.length,0);});
});

test('owner can read a hidden location through their own projection only',async()=>{
 await asUser(B,async()=>assert.equal((await db.query('select get_my_profile() data')).rows[0].data.location,'Private City'));
 await asUser(A,async()=>assert.equal((await db.query('select get_my_profile() data')).rows[0].data.id,A));
});

test('self-selected investor role cannot join a private community',async()=>{
 const id=(await db.query("insert into communities(slug,name,is_private) values('verified-only','Verified',true) returning id")).rows[0].id;
 await asUser(C,()=>db.query("update profiles set role='investor' where id=$1",[C]));
 await assert.rejects(asUser(C,()=>db.query('insert into community_members(community_id,user_id) values($1,$2)',[id,C])),/verified investor/);
});

test('disabled notification categories are enforced by the backend',async()=>{
 await asUser(B,()=>db.query('insert into user_settings(user_id,notifications) values($1,$2) on conflict(user_id) do update set notifications=excluded.notifications',[B,JSON.stringify({matches:false,messages:false,events:false})]));
 await db.query("select notify($1,'message','muted-test','body',$2,'/inbox')",[B,A]);
 assert.equal((await db.query("select count(*)::int n from notifications where title='muted-test'")).rows[0].n,0);
 await db.query("select notify($1,'system','essential-test','body',null,'/settings')",[B]);
 assert.equal((await db.query("select count(*)::int n from notifications where title='essential-test'")).rows[0].n,1);
});
test('mutual interest creates one match and nonmembers cannot read messages',async()=>{
 await asUser(A,async()=>{assert.equal((await db.query("select swipe($1,'connect') data",[B])).rows[0].data.matched,false);});
 const result=await asUser(B,async()=> (await db.query("select swipe($1,'connect') data",[A])).rows[0].data);
 assert.equal(result.matched,true);
 await asUser(A,()=>db.query('insert into messages(conversation_id,sender_id,body) values($1,$2,$3)',[result.conversation_id,A,'Hello']));
 await asUser(C,async()=>{assert.equal((await db.query('select * from messages')).rows.length,0);});
 await assert.rejects(asUser(C,()=>db.query('insert into messages(conversation_id,sender_id,body) values($1,$2,$3)',[result.conversation_id,C,'Intrusion'])));
});
test('private community posts cannot leak through feed RPC or comments',async()=>{
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);
 const community=(await db.query("insert into communities(slug,name,is_private) values('private','Private',true) returning id")).rows[0].id;
 const post=(await db.query('insert into posts(author_id,body,community_id) values($1,$2,$3) returning id',[B,'Secret',community]).catch(e=>{throw e;})).rows[0].id;
 await asUser(A,async()=>{assert.deepEqual((await db.query("select get_posts('post',$1) data",[post])).rows[0].data,[]);});
 await assert.rejects(asUser(A,()=>db.query('insert into comments(post_id,author_id,body) values($1,$2,$3)',[post,A,'Intrusion'])));
});
test('clients cannot invoke quota or notification internals',async()=>{
 await assert.rejects(asUser(A,()=>db.query("select consume_action($1,'swipe',999,1)",[A])));
});
test('AI requires consent, denies client quota manipulation and records usage privately',async()=>{
 await assert.rejects(db.query('select begin_ai_request($1,$2)',[C,'test-model']));
 await asUser(C,()=>db.query('insert into user_settings(user_id,ai_consent_at) values($1,now())',[C]));
 await assert.rejects(asUser(C,()=>db.query('select begin_ai_request($1,$2)',[C,'test-model'])));
 const request=(await db.query('select begin_ai_request($1,$2) data',[C,'test-model'])).rows[0].data;
 assert.equal(request.max_output_tokens,1500);
 await assert.rejects(db.query('select begin_ai_request($1,$2)',[C,'test-model']));
 await asUser(A,async()=>assert.equal((await db.query('select * from ai_usage')).rows.length,0));
 await asUser(C,async()=>assert.equal((await db.query('select * from ai_usage')).rows.length,1));
});
test('Stripe updates are idempotent and older events cannot regress entitlement',async()=>{
 const args=['evt_new',200,A,'cus_test','sub_test','pro','active','2027-01-01',false];
 const call='select apply_stripe_event($1,$2,$3,$4,$5,$6,$7,$8,$9)';
 await db.query(call,args); await db.query(call,args);
 await db.query(call,['evt_old',100,A,'cus_test','sub_test','free','canceled','2026-01-01',false]);
 assert.equal((await db.query('select tier from subscriptions where user_id=$1',[A])).rows[0].tier,'pro');
 assert.equal((await db.query("select count(*)::int n from stripe_events where id='evt_new'")).rows[0].n,1);
 await assert.rejects(asUser(A,()=>db.query(call,args)));
});
test('blocked users cannot start a conversation',async()=>{
 await asUser(C,()=>db.query('insert into blocks(blocker_id,blocked_id) values($1,$2)',[C,A]));
 await assert.rejects(asUser(A,()=>db.query('select open_conversation($1)',[C])));
});
test('feed pagination uses a stable timestamp and ID cursor',async()=>{
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);
 await db.query("insert into posts(author_id,body,created_at) select $1,'Page '||n,'2026-09-01'::timestamptz from generate_series(1,6) n",[B]);
 await asUser(B,async()=>{
   const first=(await db.query("select feed_page('foryou',null,null,3) data")).rows[0].data;
   assert.equal(first.length,3);
   const cursor=first.at(-1);
   const second=(await db.query("select feed_page('foryou',$1,$2,3) data",[cursor.created_at,cursor.id])).rows[0].data;
   assert.equal(second.length,3);
   assert.equal(new Set([...first,...second].map(p=>p.id)).size,6);
 });
});
test('message pagination cannot bypass conversation membership',async()=>{
 const conv=(await db.query('select id from conversations where user_a=$1 and user_b=$2',[A,B])).rows[0].id;
 await asUser(C,async()=>{assert.equal((await db.query('select * from message_page($1)',[conv])).rows.length,0);});
});

test('blocking removes connections, protects discovery and stops messages in existing chats',async()=>{
 await asUser(A,()=>db.query('insert into follows(follower_id,followee_id) values($1,$2) on conflict do nothing',[A,B]));
 const conv=(await db.query('select id from conversations where user_a=$1 and user_b=$2',[A,B])).rows[0].id;
 await asUser(A,()=>db.query('select set_user_block($1,true)',[B]));
 await asUser(A,()=>db.query('select set_user_block($1,true)',[B]));
 assert.equal((await db.query('select count(*)::int n from follows where follower_id=$1 and followee_id=$2',[A,B])).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from matches where user_a=$1 and user_b=$2',[A,B])).rows[0].n,0);
 await asUser(A,async()=>assert.equal((await db.query('select list_blocked_users() data')).rows[0].data[0].id,B));
 await asUser(B,async()=>{
   assert.deepEqual((await db.query('select list_blocked_users() data')).rows[0].data,[]);
   assert.equal((await db.query('select id from profiles where id=$1',[A])).rows.length,0);
 });
 for(const [sender,other] of [[A,B],[B,A]]) {
   await assert.rejects(asUser(sender,()=>db.query('insert into messages(conversation_id,sender_id,body) values($1,$2,$3)',[conv,sender,'blocked'])),/FORBIDDEN/);
   await assert.rejects(asUser(sender,()=>db.query('insert into follows(follower_id,followee_id) values($1,$2)',[sender,other])),/FORBIDDEN/);
   await assert.rejects(asUser(sender,()=>db.query("select swipe($1,'connect')",[other])),/FORBIDDEN/);
 }
 await asUser(B,()=>db.query('select set_user_block($1,false)',[A]));
 assert.equal((await db.query('select count(*)::int n from blocks where blocker_id=$1 and blocked_id=$2',[A,B])).rows[0].n,1);
 await asUser(A,()=>db.query('select set_user_block($1,false)',[B]));
 await asUser(A,()=>db.query('insert into messages(conversation_id,sender_id,body) values($1,$2,$3)',[conv,A,'unblocked']));
 assert.equal((await db.query('select count(*)::int n from matches where user_a=$1 and user_b=$2',[A,B])).rows[0].n,0);
 await assert.rejects(asUser(A,()=>db.query('select set_user_block($1,true)',[A])),/VALIDATION/);
});

test('export only includes the signed-in account and rejects unknown datasets',async()=>{
 await asUser(A,async()=>{
   for(const dataset of EXPORT_DATASETS) {
     const page=(await db.query('select export_my_data_page($1) data',[dataset])).rows[0].data;
     assert.ok(Array.isArray(page.rows),dataset);
     assert.ok(page.rows.length<=100,dataset);
     for(const row of page.rows) {
       for(const field of ['stripe_customer_id','stripe_subscription_id','last_message']) assert.equal(field in row,false,dataset);
     }
     if(dataset==='profiles') assert.deepEqual(page.rows.map(r=>r.id),[A]);
     if(dataset==='account') assert.deepEqual(page.rows,[{id:A,email:'Alpha@example.test'}]);
     if(dataset==='messages') assert.ok(page.rows.every(r=>r.sender_id===A));
     if(dataset==='ai_usage') assert.equal(page.rows.length,0);
   }
 });
 await assert.rejects(asUser(A,()=>db.query('select export_my_data_page($1)',['auth.users'])),/VALIDATION/);
 await assert.rejects(asUser(A,()=>db.query('select export_my_data_page($1)',['profiles; select 1'])),/VALIDATION/);
 await db.query("select set_config('request.jwt.claim.sub','',false)");
 await assert.rejects(db.query("select export_my_data_page('profiles')"),/AUTH/);
});

test('export database cursor visits every owned row across page boundaries',async()=>{
 await db.query("insert into ai_messages(user_id,role,content) select $1,'user','Export row '||n from generate_series(1,101) n",[A]);
 await asUser(A,async()=>{
   const first=(await db.query("select export_my_data_page('ai_messages') data")).rows[0].data;
   assert.equal(first.rows.length,100);
   const second=(await db.query("select export_my_data_page('ai_messages',$1) data",[first.next])).rows[0].data;
   assert.equal(second.rows.length,1); assert.equal(second.next,null);
   assert.equal(new Set([...first.rows,...second.rows].map(r=>r.id)).size,101);
 });
});

test('account cleanup cannot be bypassed and serializes checkout with deletion',async()=>{
 const startup = await asUser(C, async()=> (await db.query("insert into startups(owner_id,name,tagline) values($1,'Lifecycle test','Created before deletion') returning id",[C])).rows[0].id);
 await db.query("select set_config('request.jwt.claim.sub','',false)");
 await assert.rejects(asUser(C,()=>db.query("select claim_account_operation($1,'delete')",[C])));
 const token=(await db.query("select claim_account_operation($1,'checkout') token",[C])).rows[0].token;
 await assert.rejects(db.query("select claim_account_operation($1,'delete')",[C]),/in progress/);
 await db.query('select release_account_operation($1,$2)',[C,A]);
 await assert.rejects(db.query("select claim_account_operation($1,'checkout')",[C]),/in progress/);
 await db.query('select release_account_operation($1,$2)',[C,token]);
 const deletion=(await db.query("select claim_account_operation($1,'delete') token",[C])).rows[0].token;
 await assert.rejects(asUser(C,()=>db.query("insert into startups(owner_id,name,tagline) values($1,'Late startup','Must not be published')",[C])),/deletion/);
 await assert.rejects(asUser(C,()=>db.query("update startups set tagline='Changed during deletion' where id=$1",[startup])),/deletion/);
 assert.equal((await db.query('select tagline from startups where id=$1',[startup])).rows[0].tagline,'Created before deletion');
 await assert.rejects(asUser(C,()=>db.query("update profiles set bio='still active' where id=$1",[C])),/deletion/);
 await assert.rejects(asUser(C,()=>db.exec('select delete_my_account()')));
 await db.query('select release_account_operation($1,$2)',[C,deletion]);
 await assert.rejects(db.query("select claim_account_operation($1,'checkout')",[C]),/deletion/);
 assert.ok((await db.query("select claim_account_operation($1,'delete') token",[C])).rows[0].token);
 // Trusted cleanup still removes the member's related rows after the freeze.
 await db.query('delete from auth.users where id=$1',[C]);
 assert.equal((await db.query('select id from startups where id=$1',[startup])).rows.length,0);
});
