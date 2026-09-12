import { fetch } from 'expo/fetch';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { SseDecoder } from '@/lib/sse';
import type { CopilotMessage } from '../types';
import { ApiError } from '../api';
import { sb } from './client';

export async function streamCopilot(prompt: string, onDelta?: (text: string) => void): Promise<CopilotMessage> {
 const {data:{session}}=await sb().auth.getSession();
 if(!session)throw new ApiError('AUTH');
 const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),100_000);
 try {
  const response=await fetch(`${SUPABASE_URL}/functions/v1/copilot`,{
   method:'POST',signal:abort.signal,headers:{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({prompt}),
  });
  if(!response.ok||!response.body)throw new Error(response.status===429?'Your Copilot limit has been reached, or a request is still running.':'Copilot is unavailable. Please try again.');
  const reader=response.body.getReader();const decoder=new SseDecoder();const utf8=new TextDecoder();
  while(true){
   const {done,value}=await reader.read();if(done)break;
   for(const frame of decoder.push(utf8.decode(value,{stream:true}))){
    const data=JSON.parse(frame.data) as {text?:string;message?:CopilotMessage};
    if(frame.event==='delta'&&typeof data.text==='string')onDelta?.(data.text);
    if(frame.event==='done'&&data.message){await reader.cancel();return data.message;}
    if(frame.event==='error')throw new Error('Copilot could not finish this request. Please try again.');
   }
  }
  throw new Error('The connection was interrupted. Please try again.');
 }finally{clearTimeout(timeout);abort.abort();}
}
