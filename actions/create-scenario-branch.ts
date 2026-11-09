import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { branch } from '../server/lib/operations';
import { incidentKinds } from '../lib/engine';
export default defineAction({description:'ORACLE: fork an isolated future from current state or a parent branch with optional disruption assumptions. Does not mutate the live model.',schema:z.object({id:z.string().uuid().describe('Workspace UUID'),name:z.string().min(1).max(100).describe('Branch name'),parentId:z.string().uuid().optional().describe('Optional parent branch UUID'),incident:z.object({kind:z.enum(incidentKinds),target:z.string().max(80),value:z.number().min(0).max(1000)}).optional().describe('Optional isolated what-if incident')}),run:async({id,name,parentId,incident},ctx)=>branch(id,name,ctx,parentId,incident)});
