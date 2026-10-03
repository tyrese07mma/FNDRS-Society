// Opt-in, synthetic fixture only. Never sends email or logs tokens/passwords.
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
const project=process.env.FNDRS_LIVE_TEST_PROJECT, cli=process.env.FNDRS_TEST_CLI;
if(project!=='echedxohsntgeijbxmsc'||!cli)throw Error('Explicit test project and CLI required');
const keys=JSON.parse(execFileSync(cli,['projects','api-keys','--project-ref',project,'--output','json','--agent','no'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}};
const url=`https://${project}.supabase.co`;
const admin=createClient(url,keys.find(k=>k.name==='service_role').api_key,options);
const member=createClient(url,keys.find(k=>k.name==='anon').api_key,options);
const run=randomUUID(),email=`fndrs-auth-${run}@example.invalid`,password=randomBytes(32).toString('base64url')+'Aa1!';
let id,passes=0;
const pass=label=>{passes++;console.log('PASS '+label);};
const check=(value,label)=>{if(!value)throw Error(label);};
async function ok(p,label){const r=await p;if(r.error)throw Error(`${label} (${r.error.code??r.error.status??'provider'})`);return r.data;}
try {
 const signup=await ok(admin.auth.admin.generateLink({type:'signup',email,password,options:{data:{full_name:'Temporary Auth Test',fndrs_test_run:run}}}),'Generate signup');
 id=signup.user.id;
 const denied=await member.auth.signInWithPassword({email,password});
 check(denied.error?.code==='email_not_confirmed','Unconfirmed account was not rejected');pass('Unconfirmed account cannot sign in');
 await ok(member.auth.verifyOtp({token_hash:signup.properties.hashed_token,type:'signup'}),'Confirm signup');pass('Signup confirmation establishes a session');
 const profile=await ok(member.from('profiles').select('id,onboarded').eq('id',id).single(),'Read new profile');
 check(profile.id===id&&!profile.onboarded,'New profile/onboarding state incorrect');pass('New confirmed account has its own incomplete onboarding profile');
 await ok(member.auth.signOut(),'Sign out');
 const used=await member.auth.verifyOtp({token_hash:signup.properties.hashed_token,type:'signup'});
 check(!!used.error,'Used confirmation accepted twice');pass('Confirmation token is single use');
 await ok(member.auth.signInWithPassword({email,password}),'Password sign in');pass('Confirmed account can sign in');
 await ok(member.auth.signOut(),'Sign out before recovery');
 const recovery=await ok(admin.auth.admin.generateLink({type:'recovery',email}),'Generate recovery');
 await ok(member.auth.verifyOtp({token_hash:recovery.properties.hashed_token,type:'recovery'}),'Verify recovery');
 const next=randomBytes(32).toString('base64url')+'Bb2!';
 await ok(member.auth.updateUser({password:next}),'Change recovered password');
 await ok(member.auth.signOut(),'Sign out after password change');
 check(!!(await member.auth.signInWithPassword({email,password})).error,'Old password still accepted');
 await ok(member.auth.signInWithPassword({email,password:next}),'New password login');pass('Recovery replaces the password and rejects the previous password');
 const session=await ok(member.auth.getSession(),'Session lookup');
 await ok(member.auth.signOut(),'Final sign out');
 check(!!(await member.auth.refreshSession({refresh_token:session.session.refresh_token})).error,'Signed-out refresh token accepted');pass('Sign-out revokes refresh session');
} catch(e){console.log('FAIL '+e.message);process.exitCode=1;}
finally {
 if(id){const owned=await ok(admin.auth.admin.getUserById(id),'Cleanup ownership');check(owned.user.email===email&&owned.user.user_metadata.fndrs_test_run===run,'Fixture ownership mismatch');await ok(admin.auth.admin.deleteUser(id),'Cleanup fixture');console.log('PASS synthetic account removed');}
 member.auth.stopAutoRefresh();admin.auth.stopAutoRefresh();console.log(JSON.stringify({passed:passes,failed:process.exitCode?1:0}));
}
