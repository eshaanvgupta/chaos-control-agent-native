import { createGetDb } from '@agent-native/core/db';
import { registerIdentityColumns } from '@agent-native/core/org';
import * as schema from './schema';
registerIdentityColumns([{table:'cc_guest_sessions',column:'owner_email',emailChange:'rekey',offboard:'delete',reason:'Guest bearer sessions must never transfer to a successor.'}]);
export const getDb=createGetDb(schema);
export { schema };
