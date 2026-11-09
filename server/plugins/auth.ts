import { createToolkitAuthPlugin } from "@agent-native/toolkit/app/auth/server";
import { guestSession,clearGuest } from '../lib/guest';

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/"],
  publicPaths: ['/', '/guest/start'],
  rootAuth: false,
  marketing: false,
  getAdditionalSession: guestSession,
  getAdditionalBrowserSession: guestSession,
  clearAdditionalSession: clearGuest,
});
