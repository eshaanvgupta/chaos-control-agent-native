import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { getState } from '../server/lib/operations';
import { exportCsv } from '../lib/import';
export default defineAction({description:'Export a private reproducible JSON impact report and spreadsheet-safe CSV of order outcomes, with audit trail and explicit simulation assumptions.',schema:z.object({id:z.string().uuid().describe('Workspace UUID')}),http:{method:'GET'},readOnly:true,run:async({id},ctx)=>{const s=await getState(id,ctx);return {report:{product:'CHAOS//CONTROL',mode:'internal simulation',generatedAt:new Date().toISOString(),...s},csv:exportCsv(s.workspace.snapshot.orders.map(o=>({id:o.id,sku:o.sku,quantity:o.quantity,fulfilled:o.fulfilled,dueDay:o.dueDay,priority:o.priority,zone:o.zone}))) };}});
