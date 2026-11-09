import { boolean, integer, jsonb, pgTable, text, index } from 'drizzle-orm/pg-core';
import type { Plan, Snapshot } from '../../lib/model';

export const workspaces=pgTable('cc_workspaces',{
  id:text('id').primaryKey(), ownerEmail:text('owner_email').notNull(), name:text('name').notNull(),
  snapshot:jsonb('snapshot').$type<Snapshot>().notNull(), revision:integer('revision').notNull().default(0), createdAt:text('created_at').notNull(),
},t=>[index('cc_workspaces_owner_idx').on(t.ownerEmail)]);
export const branches=pgTable('cc_branches',{
  id:text('id').primaryKey(),workspaceId:text('workspace_id').notNull().references(()=>workspaces.id),ownerEmail:text('owner_email').notNull(),
  parentId:text('parent_id'),name:text('name').notNull(),snapshot:jsonb('snapshot').$type<Snapshot>().notNull(),baseRevision:integer('base_revision').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('cc_branches_workspace_idx').on(t.workspaceId)]);
export const plans=pgTable('cc_plans',{
  id:text('id').primaryKey(),workspaceId:text('workspace_id').notNull().references(()=>workspaces.id),ownerEmail:text('owner_email').notNull(),
  branchId:text('branch_id').references(()=>branches.id),baseRevision:integer('base_revision').notNull(),plan:jsonb('plan').$type<Plan>().notNull(),
  approved:boolean('approved').notNull().default(false),applied:boolean('applied').notNull().default(false),rejected:boolean('rejected').notNull().default(false),createdAt:text('created_at').notNull(),
},t=>[index('cc_plans_workspace_idx').on(t.workspaceId)]);
export const events=pgTable('cc_events',{
  id:text('id').primaryKey(),workspaceId:text('workspace_id').notNull().references(()=>workspaces.id),ownerEmail:text('owner_email').notNull(),
  actor:text('actor').notNull(),kind:text('kind').notNull(),revision:integer('revision').notNull(),
  details:jsonb('details').$type<Record<string,unknown>>().notNull(),before:jsonb('before').$type<Snapshot>(),after:jsonb('after').$type<Snapshot>(),createdAt:text('created_at').notNull(),
},t=>[index('cc_events_workspace_idx').on(t.workspaceId,t.createdAt)]);
export const guestSessions=pgTable('cc_guest_sessions',{
  id:text('id').primaryKey(),ownerEmail:text('owner_email').notNull(),tokenHash:text('token_hash').notNull().unique(),expiresAt:text('expires_at').notNull(),
});
