import { bounce,cors,customerFor,json,stripeClient,userFrom } from '../_shared/stripe.ts';
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
 const user=await userFrom(req);if(!user)return json({error:'AUTH: Please sign in again.'},401);
 const {return_url}=await req.json();
 const session=await stripeClient().billingPortal.sessions.create({customer:await customerFor(user.id,user.email),return_url:bounce(return_url)});
 return json({url:session.url});
 }catch{console.error(JSON.stringify({event:'portal_failed'}));return json({error:'Billing is unavailable. Please try again later.'},503);}
});
