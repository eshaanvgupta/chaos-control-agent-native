import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { generatePlans } from '../server/lib/operations';
import { optionsSchema } from '../lib/model';
export default defineAction({description:'TACTICIAN: compute ECONOMY, BALANCED and RESCUE feasible greedy plans with actual allocations, costs and late-order tradeoffs. Does not execute.',schema:z.object({id:z.string().uuid().describe('Workspace UUID'),branchId:z.string().uuid().optional().describe('Optional isolated branch UUID'),options:optionsSchema.default({budgetCents:250000,horizon:14,priorityWeight:3,allowPurchases:true}).describe('Budget, horizon and priority weights')}),run:async({id,branchId,options},ctx)=>generatePlans(id,ctx,options,branchId)});
