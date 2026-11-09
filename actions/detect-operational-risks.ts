import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { workspace } from '../server/lib/operations';
import { risks } from '../lib/engine';
export default defineAction({description:'SENTINEL: calculate baseline exposure, at-risk order IDs, stockouts, warehouse capacity and supplier evidence. Deterministic, no model call.',schema:z.object({id:z.string().uuid().describe('Workspace UUID')}),http:{method:'GET'},readOnly:true,run:async({id},ctx)=>risks((await workspace(id,ctx)).snapshot)});
