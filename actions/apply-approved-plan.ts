import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { executePlan } from '../server/lib/operations';
export default defineAction({description:'Execute only a human-approved, current-revision plan in the INTERNAL simulation and verify it. Advances modeled time by the plan horizon; no external purchases/shipments. Repeated execution is idempotent.',schema:z.object({id:z.string().uuid().describe('Workspace UUID'),planId:z.string().uuid().describe('Approved plan UUID')}),run:async({id,planId},ctx)=>executePlan(id,planId,ctx)});
