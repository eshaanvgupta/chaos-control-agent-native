import { runMigrations } from '@agent-native/core/db';
export default runMigrations([{version:1,name:'chaos-control-operational-store',sql:`
CREATE TABLE IF NOT EXISTS cc_workspaces (id TEXT PRIMARY KEY,owner_email TEXT NOT NULL,name TEXT NOT NULL,snapshot JSONB NOT NULL CHECK(jsonb_typeof(snapshot)='object'),revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS cc_workspaces_owner_idx ON cc_workspaces(owner_email);
CREATE TABLE IF NOT EXISTS cc_branches (id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES cc_workspaces(id),owner_email TEXT NOT NULL,parent_id TEXT REFERENCES cc_branches(id),name TEXT NOT NULL,snapshot JSONB NOT NULL,base_revision INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS cc_branches_workspace_idx ON cc_branches(workspace_id);
CREATE TABLE IF NOT EXISTS cc_plans (id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES cc_workspaces(id),owner_email TEXT NOT NULL,branch_id TEXT REFERENCES cc_branches(id),base_revision INTEGER NOT NULL,plan JSONB NOT NULL,approved BOOLEAN NOT NULL DEFAULT FALSE,applied BOOLEAN NOT NULL DEFAULT FALSE,rejected BOOLEAN NOT NULL DEFAULT FALSE,created_at TEXT NOT NULL,CHECK(NOT(applied AND rejected)),CHECK(NOT(applied AND NOT approved)));
CREATE INDEX IF NOT EXISTS cc_plans_workspace_idx ON cc_plans(workspace_id);
CREATE TABLE IF NOT EXISTS cc_events (id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES cc_workspaces(id),owner_email TEXT NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,revision INTEGER NOT NULL,details JSONB NOT NULL,before JSONB,after JSONB,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS cc_events_workspace_idx ON cc_events(workspace_id,created_at);
CREATE TABLE IF NOT EXISTS cc_guest_sessions (id TEXT PRIMARY KEY,owner_email TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL);
`}],{table:'chaos_control_migrations'});
