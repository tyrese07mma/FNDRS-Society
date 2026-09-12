import { admin,bounce,cors,customerFor,json,stripeClient,userFrom } from '../_shared/stripe.ts';
const prices:Record<string,Record<string,string|undefined>>={
 pro:{month:Deno.env.get('PRICE_PRO_MONTH'),year:Deno.env.get('PRICE_PRO_YEAR')},
 business:{month:Deno.env.get('PRICE_BUSINESS_MONTH'),year:Deno.env.get('PRICE_BUSINESS_YEAR')},
 investor_plus:{month:Deno.env.get('PRICE_INVESTOR_MONTH'),year:Deno.env.get('PRICE_INVESTOR_YEAR')},
};
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
 const user=await userFrom(req);if(!user)return json({error:'AUTH: Please sign in again.'},401);
 const {tier,cycle,return_url}=await req.json();
 if(typeof tier!=='string'||!Object.hasOwn(prices,tier)||!['month','year'].includes(cycle))return json({error:'Invalid plan'},400);
 const price=prices[tier][cycle];if(!price)return json({error:'This plan is not available yet.'},503);
 const stripe=stripeClient();const customer=await customerFor(user.id,user.email);
 const existing=await stripe.subscriptions.list({customer,status:'all',limit:100});
 if(existing.data.some(s=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(s.status)))return json({error:'Use Manage subscription to change your existing plan.'},409);
 const {data:dbSub,error}=await admin().from('subscriptions').select('stripe_subscription_id').eq('user_id',user.id).maybeSingle();
 if(error)throw Error('subscription lookup');
 const session=await stripe.checkout.sessions.create({mode:'subscription',customer,line_items:[{price,quantity:1}],
 subscription_data:{...(!dbSub?.stripe_subscription_id?{trial_period_days:7}:{}),metadata:{user_id:user.id}},
 success_url:bounce(return_url,'success'),cancel_url:bounce(return_url,'cancel')},
 {idempotencyKey:`checkout-${user.id}-${tier}-${cycle}-${Math.floor(Date.now()/1800000)}`});
 return json({url:session.url});
 }catch{console.error(JSON.stringify({event:'checkout_failed'}));return json({error:'Checkout is unavailable. Please try again later.'},503);}
});
