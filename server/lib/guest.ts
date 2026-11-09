import { createHash,randomBytes } from 'node:crypto';
import { getCookie,setCookie,deleteCookie,type H3Event } from 'h3';
import { and,eq,gt } from 'drizzle-orm';
import { getDb,schema } from '../db';
const cookie='cc_guest';
export async function guestSession(event:H3Event){
  const token=getCookie(event,cookie);if(!token||!/^([a-f0-9]{64})$/.test(token))return null;
  const hash=createHash('sha256').update(token).digest('hex');
  const [session]=await getDb().select().from(schema.guestSessions).where(and(eq(schema.guestSessions.tokenHash,hash),gt(schema.guestSessions.expiresAt,new Date().toISOString()))).limit(1);
  return session?{email:session.ownerEmail,name:'Guest commander',emailVerified:false}:null;
}
export async function startGuest(event:H3Event){
  if(await guestSession(event))return;
  const token=randomBytes(32).toString('hex'),id=crypto.randomUUID();
  await getDb().insert(schema.guestSessions).values({id,ownerEmail:`guest-${id}@guest.chaos.invalid`,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+86400000*7).toISOString()});
  setCookie(event,cookie,token,{httpOnly:true,sameSite:'lax',secure:new URL(event.req.url).protocol==='https:',path:'/',maxAge:86400*7});
}
export function clearGuest(event:H3Event){deleteCookie(event,cookie,{path:'/'});}
