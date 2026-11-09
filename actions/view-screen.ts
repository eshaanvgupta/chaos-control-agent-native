import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";
import { readAppStateForCurrentTab } from '@agent-native/core/application-state';
import { getState } from '../server/lib/operations';

export default defineAction({
  description:
    "Read the Chat app's current navigation state. Basic navigation is already included in <current-screen>; use this action only when you need a fresh read.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async (_,ctx) => {
    const navigation = await readAppStateForCurrentTab("navigation") ?? await readAppState("navigation");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    const nav=navigation as {workspaceId?:string;selectedNode?:string;branchId?:string}|null;
    if(nav?.workspaceId){const state=await getState(nav.workspaceId,ctx);screen.workspace={id:state.workspace.id,name:state.workspace.name,revision:state.workspace.revision};screen.risks=state.risks;screen.selectedNode=nav.selectedNode;screen.branchId=nav.branchId;screen.nextActions=['detect-operational-risks','generate-recovery-plan','create-scenario-branch'];}

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
