import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { getState } from '../server/lib/operations';
import { optimize } from '../lib/engine';
export default defineAction({description:'ORACLE: compare persisted scenario branch forecasts against the current baseline with exact service/cost deltas and assumptions.',schema:z.object({id:z.string().uuid().describe('Workspace UUID')}),http:{method:'GET'},readOnly:true,run:async({id},ctx)=>{const s=await getState(id,ctx),base=s.risks.metrics;return {baseline:base,branches:s.branches.map(b=>{const plan=optimize(b.snapshot,'BALANCED');return {id:b.id,name:b.name,stale:b.baseRevision!==s.workspace.revision,metrics:plan.metrics,deltaService:plan.metrics.service-base.service,deltaCostCents:plan.metrics.costCents-base.costCents,assumptions:plan.assumptions};})};}});
