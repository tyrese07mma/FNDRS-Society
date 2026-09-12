import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { admin, cors, json, stripeClient, userFrom } from '../_shared/stripe.ts';
import { deleteAvatars } from '../_shared/delete-avatars.ts';

Deno.serve(async (req) => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 let lease:string|null=null;
 let userId:string|null=null;
 const db=admin();
 try {
  const user=await userFrom(req);
  if(!user?.email) return json({error:'AUTH: Please sign in again.'},401);
  const raw=await req.text();
  if(raw.length>4096) return json({error:'Invalid request'},400);
  const {password}=JSON.parse(raw);
  if(typeof password!=='string'||!password||password.length>1024) return json({error:'Enter your current password.'},400);
  // Reauthenticate only this account. Passwords and temporary tokens are never logged.
  const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.signInWithPassword({email:user.email,password});
  if(error||data.user?.id!==user.id) return json({error:'AUTH: Password confirmation failed.'},401);
  await auth.auth.signOut({scope:'local'});
  userId=user.id;
  const {data:token,error:claimError}=await db.rpc('claim_account_operation',{p_user:userId,p_kind:'delete'});
  if(claimError) return json({error:'Another account operation is running. Retry shortly.'},409);
  lease=token;
  const {data:sub,error:subError}=await db.from('subscriptions').select('stripe_customer_id').eq('user_id',userId).single();
  if(subError) throw Error('Subscription lookup failed');
  if(sub.stripe_customer_id) {
   // Stripe customer deletion cancels subscriptions and prevents new purchases.
   // On retry an already-deleted customer is safe to skip.
   const stripe=stripeClient();
   const customer=await stripe.customers.retrieve(sub.stripe_customer_id);
   if(!customer.deleted) await stripe.customers.del(customer.id);
   const {error:tombstoneError}=await db.from('deleted_billing_customers').upsert({customer_id:sub.stripe_customer_id});
   if(tombstoneError) throw Error('Billing cleanup persistence failed');
  }
  // Delete bytes through the Storage API, not merely their SQL metadata.
  // New user uploads are denied once account_deletions contains this account.
  await deleteAvatars(db.storage.from('avatars'),userId);
  const {error:deleteError}=await db.auth.admin.deleteUser(userId);
  if(deleteError) throw Error('Account cleanup failed');
  return json({deleted:true});
 } catch {
  console.error(JSON.stringify({event:'account_deletion_failed'}));
  return json({error:'Account deletion could not finish. Retry to continue cleanup; a subscription may already have been canceled.'},503);
 } finally {
  if(userId&&lease) await db.rpc('release_account_operation',{p_user:userId,p_token:lease});
 }
});
