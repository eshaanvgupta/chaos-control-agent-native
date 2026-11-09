import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { getState } from '../server/lib/operations';
export default defineAction({description:'Read current operational records, computed risks, branches, plans and audit events for a private workspace.',schema:z.object({id:z.string().uuid().describe('Workspace UUID')}),http:{method:'GET'},readOnly:true,run:async({id},ctx)=>getState(id,ctx)});
