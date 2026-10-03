import Stripe from 'npm:stripe@16.12.0';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

let instance: Stripe | null = null;
export function stripeClient() {
 const secret=Deno.env.get('STRIPE_SECRET_KEY');
 if(!secret)throw new Error('Billing is not configured');
 return instance??=new Stripe(secret,{apiVersion:'2024-06-20',httpClient:Stripe.createFetchHttpClient(),timeout:20000,maxNetworkRetries:2});
}
export const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
export const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
export const admin=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
export async function userFrom(req:Request){
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')??''}},auth:{persistSession:false}});
 const {data,error}=await client.auth.getUser();return error?null:data.user;
}
export function returnTarget(value:unknown){
 const target=new URL(typeof value==='string'?value:'fndrs://premium');
 const app=Deno.env.get('APP_URL');
 const native=target.protocol==='fndrs:' && ['premium','settings'].includes(target.hostname) && !target.username && !target.password;
 const web=app && target.origin===new URL(app).origin && ['https:','http:'].includes(target.protocol) && !target.username && !target.password;
 if(!native&&!web)throw new Error('Invalid return target');
 return target;
}
export function bounce(value:unknown,status?:string){
 const target=returnTarget(value);
 const params=new URLSearchParams({to:target.toString()});if(status)params.set('status',status);
 return `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-return?${params}`;
}
export async function customerFor(userId:string,email?:string){
 const db=admin();const {data,error}=await db.from('subscriptions').select('stripe_customer_id').eq('user_id',userId).maybeSingle();
 if(error)throw Error('Customer lookup failed');
 if(data?.stripe_customer_id)return String(data.stripe_customer_id);
 const customer=await stripeClient().customers.create({email,metadata:{user_id:userId}},{idempotencyKey:`fndrs-customer-${userId}`});
 const {error:writeError}=await db.from('subscriptions').upsert({user_id:userId,stripe_customer_id:customer.id});
 if(writeError)throw Error('Customer persistence failed');return customer.id;
}
export function priceTiers(){return new Map([
 [Deno.env.get('PRICE_PRO_MONTH'),'pro'],[Deno.env.get('PRICE_PRO_YEAR'),'pro'],
 [Deno.env.get('PRICE_BUSINESS_MONTH'),'business'],[Deno.env.get('PRICE_BUSINESS_YEAR'),'business'],
 [Deno.env.get('PRICE_INVESTOR_MONTH'),'investor_plus'],[Deno.env.get('PRICE_INVESTOR_YEAR'),'investor_plus'],
 ].filter(([key])=>!!key) as [string,string][]);}
