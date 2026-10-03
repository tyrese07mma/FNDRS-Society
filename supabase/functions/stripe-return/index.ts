import {returnTarget} from '../_shared/stripe.ts';
Deno.serve(req=>{
 try{const url=new URL(req.url);const target=returnTarget(url.searchParams.get('to'));const status=url.searchParams.get('status');
 if(status&&['success','cancel'].includes(status))target.searchParams.set('status',status);
 return new Response(null,{status:302,headers:{Location:target.toString(),'Cache-Control':'no-store'}});
 }catch{return new Response('Invalid return target',{status:400});}
});
