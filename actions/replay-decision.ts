import { defineAction,fail } from '@agent-native/core/action';
import { and,eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb,schema } from '../server/db';
import { workspace,branch } from '../server/lib/operations';
export default defineAction({description:'Replay a stored decision into a NEW isolated branch; never overwrite the current model.',schema:z.object({id:z.string().uuid().describe('Workspace UUID'),eventId:z.string().uuid().describe('Audited event UUID')}),run:async({id,eventId},ctx)=>{const w=await workspace(id,ctx);const [e]=await getDb().select().from(schema.events).where(and(eq(schema.events.id,eventId),eq(schema.events.workspaceId,id),eq(schema.events.ownerEmail,w.ownerEmail))).limit(1);if(!e?.after)fail('Event has no replayable snapshot.',{statusCode:404});const row={id:crypto.randomUUID(),workspaceId:id,ownerEmail:w.ownerEmail,parentId:null,name:`Replay: ${e.kind} · r${e.revision}`,snapshot:e.after,baseRevision:w.revision,createdAt:new Date().toISOString()};await getDb().insert(schema.branches).values(row);return row;}});
