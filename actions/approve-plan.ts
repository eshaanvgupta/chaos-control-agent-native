import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { approvePlan } from '../server/lib/operations';
export default defineAction({description:'Human-only approval/rejection of an exact versioned internal simulation plan. Agents cannot approve their own plans.',agentTool:false,mcpTool:false,toolCallable:false,schema:z.object({id:z.string().uuid().describe('Workspace UUID'),planId:z.string().uuid().describe('Plan UUID'),approve:z.boolean().describe('true approves, false rejects')}),run:async({id,planId,approve},ctx)=>approvePlan(id,planId,approve,ctx)});
