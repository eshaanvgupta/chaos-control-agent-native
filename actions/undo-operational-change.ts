import { defineAction } from '@agent-native/core/action';
import { z } from 'zod';
import { undo } from '../server/lib/operations';
export default defineAction({description:'Restore the previous internal operational snapshot with an audit event. Cannot reverse any real-world purchase or shipment. Existing approvals become stale.',schema:z.object({id:z.string().uuid().describe('Workspace UUID'),expectedRevision:z.number().int().min(1).describe('Current workspace revision')}),run:async({id,expectedRevision},ctx)=>undo(id,expectedRevision,ctx)});
