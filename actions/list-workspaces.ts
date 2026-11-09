import { defineAction } from '@agent-native/core/action';
import { eq,desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb,schema } from '../server/db';
import { identity } from '../server/lib/operations';
export default defineAction({description:'List the current caller’s private operations workspaces.',schema:z.object({}),http:{method:'GET'},readOnly:true,run:async(_,ctx)=>getDb().select({id:schema.workspaces.id,name:schema.workspaces.name,revision:schema.workspaces.revision}).from(schema.workspaces).where(eq(schema.workspaces.ownerEmail,identity(ctx))).orderBy(desc(schema.workspaces.createdAt)).limit(30)});
