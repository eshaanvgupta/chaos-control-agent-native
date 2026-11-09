import { defineEventHandler,HTTPError } from 'h3';
import { startGuest } from '../../lib/guest';
export default defineEventHandler(async event=>{
  const origin=event.req.headers.get('origin');
  if(!origin||origin!==new URL(event.req.url).origin)throw new HTTPError({status:403,message:'Same-origin guest session required.'});
  await startGuest(event);
  const q=new URL(event.req.url).searchParams;
  const target=q.get('view')==='data'?'/control?view=data':q.has('mission')?`/control?mission=${encodeURIComponent(q.get('mission')!)}`:'/control';
  return new Response(null,{status:303,headers:{location:target}});
});
