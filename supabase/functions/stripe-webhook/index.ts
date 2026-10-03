import Stripe from 'npm:stripe@16.12.0';
import {admin,stripeClient,priceTiers} from '../_shared/stripe.ts';
const statuses:Record<string,string>={active:'active',trialing:'trialing',past_due:'past_due',unpaid:'past_due',canceled:'canceled',paused:'incomplete',incomplete:'incomplete',incomplete_expired:'incomplete'};
Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET');if(!secret||!Deno.env.get('STRIPE_SECRET_KEY'))return new Response('Unavailable',{status:503});
 const signature=req.headers.get('stripe-signature');if(!signature)return new Response('Invalid signature',{status:400});
 const stripe=stripeClient();let event:Stripe.Event;
 try{event=await stripe.webhooks.constructEventAsync(await req.text(),signature,secret,undefined,Stripe.createSubtleCryptoProvider());}
 catch{return new Response('Invalid signature',{status:400});}
 try{
 let id:string|null=null;
 if(event.type.startsWith('customer.subscription.'))id=(event.data.object as Stripe.Subscription).id;
 else if(event.type==='checkout.session.completed'){const s=(event.data.object as Stripe.Checkout.Session).subscription;id=typeof s==='string'?s:s?.id??null;}
 else if(event.type==='invoice.paid'||event.type==='invoice.payment_failed'){const s=(event.data.object as Stripe.Invoice).subscription;id=typeof s==='string'?s:s?.id??null;}
 if(!id)return Response.json({received:true});
 // Retrieve current state; event payloads can arrive late or out of order.
 const sub=await stripe.subscriptions.retrieve(id);
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
 const db=admin();const {data:owner,error:ownerError}=await db.from('subscriptions').select('user_id').eq('stripe_customer_id',customer).maybeSingle();
 if(ownerError)throw Error('Customer lookup failed');
 if(!owner){
  const {data:deleted,error:deletedError}=await db.from('deleted_billing_customers').select('customer_id').eq('customer_id',customer).maybeSingle();
  if(!deletedError&&deleted)return Response.json({received:true});
  throw Error('Unknown customer');
 }
 const price=sub.items.data[0]?.price.id;const tier=price?priceTiers().get(price):undefined;
 if(!tier)throw Error('Unknown price');
 const {error}=await db.rpc('apply_stripe_event',{p_event:event.id,p_created:event.created,p_user:owner.user_id,p_customer:customer,p_subscription:sub.id,p_tier:sub.status==='canceled'?'free':tier,p_status:statuses[sub.status]??'incomplete',p_period:new Date(sub.current_period_end*1000).toISOString(),p_cancel:sub.cancel_at_period_end});
 if(error)throw Error('Persistence failed');
 return Response.json({received:true});
 }catch{console.error(JSON.stringify({event:'webhook_failed',eventId:event.id}));return new Response('Processing failed',{status:500});}
});
