import { defineAction } from '@agent-native/core/action';
import { buildDeepLink } from '@agent-native/core/server';
import { z } from 'zod';
import { createWorkspace } from '../server/lib/operations';
export default defineAction({description:'Create a seeded private simulation workspace: BLACKOUT, TSUNAMI or CASCADE. Incidents are injected explicitly afterward.',schema:z.object({mission:z.enum(['BLACKOUT','TSUNAMI','CASCADE']).default('BLACKOUT').describe('Mission template; incidents are not yet applied')}),link:({result})=>({url:buildDeepLink({to:`/control?id=${result.id}`,view:'control'}),label:'Enter command center'}),run:async({mission},ctx)=>createWorkspace(mission,ctx)});
