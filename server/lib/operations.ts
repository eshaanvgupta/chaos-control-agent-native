import { fail, type ActionRunContext } from '@agent-native/core/action';
import { isDeepStrictEqual } from 'node:util';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { applyPlan, disrupt, optimize, risks, type incidentKinds } from '../../lib/engine';
import { optionsSchema, validateSnapshot, type Options, type Snapshot } from '../../lib/model';
import { seedSnapshot } from '../../lib/seed';

export function identity(ctx?:ActionRunContext){return ctx?.userEmail??fail('Sign in or start a private guest session.',{statusCode:401,errorCode:'unauthenticated'});}
export async function workspace(id:string,ctx?:ActionRunContext){
  const owner=identity(ctx);const [w]=await getDb().select().from(schema.workspaces).where(and(eq(schema.workspaces.id,id),eq(schema.workspaces.ownerEmail,owner))).limit(1);
  return w??fail('Workspace not found or access denied.',{statusCode:404,errorCode:'not_found'});
}
export async function createWorkspace(mission:string,ctx?:ActionRunContext,input?:Snapshot){
  const ownerEmail=identity(ctx);const count=await getDb().select({id:schema.workspaces.id}).from(schema.workspaces).where(eq(schema.workspaces.ownerEmail,ownerEmail)).limit(30);
  if(count.length>=30)fail('Workspace limit reached (30). Export your data before creating more.',{statusCode:429,errorCode:'limit'});
  const snapshot=input?validateSnapshot(input):seedSnapshot(mission);const w={id:crypto.randomUUID(),ownerEmail,name:snapshot.name,snapshot,revision:0,createdAt:new Date().toISOString()};
  await getDb().transaction(async tx=>{await tx.insert(schema.workspaces).values(w);await tx.insert(schema.events).values({id:crypto.randomUUID(),workspaceId:w.id,ownerEmail,actor:ctx?.caller??'unknown',kind:input?'import':'created',revision:0,details:{mission,seed:snapshot.seed},after:snapshot,createdAt:w.createdAt});});
  return w;
}
export async function getState(id:string,ctx?:ActionRunContext){
  const w=await workspace(id,ctx),db=getDb();
  const [branches,plans,events]=await Promise.all([
    db.select().from(schema.branches).where(and(eq(schema.branches.workspaceId,id),eq(schema.branches.ownerEmail,w.ownerEmail))).orderBy(desc(schema.branches.createdAt)).limit(50),
    db.select().from(schema.plans).where(and(eq(schema.plans.workspaceId,id),eq(schema.plans.ownerEmail,w.ownerEmail))).orderBy(desc(schema.plans.createdAt)).limit(60),
    db.select({id:schema.events.id,kind:schema.events.kind,actor:schema.events.actor,revision:schema.events.revision,details:schema.events.details,createdAt:schema.events.createdAt}).from(schema.events).where(and(eq(schema.events.workspaceId,id),eq(schema.events.ownerEmail,w.ownerEmail))).orderBy(desc(schema.events.createdAt)).limit(100),
  ]);
  return {workspace:w,risks:risks(w.snapshot),branches,plans,events};
}
export async function mutateSnapshot(id:string,expectedRevision:number,ctx:ActionRunContext|undefined,kind:string,transform:(s:Snapshot)=>Snapshot,details:Record<string,unknown>={}){
  const w=await workspace(id,ctx);if(w.revision!==expectedRevision)fail('Workspace changed. Refresh and recompute before retrying.',{statusCode:409,errorCode:'stale_revision'});
  const next=validateSnapshot(transform(structuredClone(w.snapshot)));
  return getDb().transaction(async tx=>{
    const [saved]=await tx.update(schema.workspaces).set({snapshot:next,revision:w.revision+1,name:next.name}).where(and(eq(schema.workspaces.id,id),eq(schema.workspaces.ownerEmail,w.ownerEmail),eq(schema.workspaces.revision,expectedRevision))).returning();
    if(!saved)fail('A concurrent change won the race. Refresh first.',{statusCode:409,errorCode:'stale_revision'});
    await tx.insert(schema.events).values({id:crypto.randomUUID(),workspaceId:id,ownerEmail:w.ownerEmail,actor:ctx?.caller??'unknown',kind,revision:saved.revision,details,before:w.snapshot,after:next,createdAt:new Date().toISOString()});
    return {id,revision:saved.revision};
  });
}
export async function generatePlans(id:string,ctx:ActionRunContext|undefined,options:Options,branchId?:string){
  const w=await workspace(id,ctx);let snapshot=w.snapshot,baseRevision=w.revision;
  if(branchId){const [branch]=await getDb().select().from(schema.branches).where(and(eq(schema.branches.id,branchId),eq(schema.branches.workspaceId,id),eq(schema.branches.ownerEmail,w.ownerEmail))).limit(1);if(!branch)fail('Branch not found.',{statusCode:404});snapshot=branch.snapshot;baseRevision=branch.baseRevision;}
  const rows=(['ECONOMY','BALANCED','RESCUE'] as const).map(strategy=>({id:crypto.randomUUID(),workspaceId:id,ownerEmail:w.ownerEmail,branchId:branchId??null,baseRevision,plan:optimize(snapshot,strategy,options),approved:false,applied:false,rejected:false,createdAt:new Date().toISOString()}));
  await getDb().transaction(async tx=>{await tx.insert(schema.plans).values(rows);await tx.insert(schema.events).values({id:crypto.randomUUID(),workspaceId:id,ownerEmail:w.ownerEmail,actor:ctx?.caller??'unknown',kind:'plans-generated',revision:w.revision,details:{planIds:rows.map(r=>r.id),branchId:branchId??null,options},createdAt:new Date().toISOString()});});return rows;
}
export async function findPlan(id:string,planId:string,ctx?:ActionRunContext){
  const w=await workspace(id,ctx);const [p]=await getDb().select().from(schema.plans).where(and(eq(schema.plans.id,planId),eq(schema.plans.workspaceId,id),eq(schema.plans.ownerEmail,w.ownerEmail))).limit(1);
  if(!p)fail('Plan not found.',{statusCode:404});return {w,p};
}
export async function approvePlan(id:string,planId:string,approve:boolean,ctx?:ActionRunContext){
  if(!['frontend','http','cli'].includes(ctx?.caller??''))fail('A human must approve or reject this plan in Strategy Lab. The agent cannot approve its own plan.',{statusCode:403,errorCode:'human_approval_required'});
  const {w,p}=await findPlan(id,planId,ctx);if(p.baseRevision!==w.revision||p.applied)fail('Plan is stale or already applied.',{statusCode:409,errorCode:'stale_plan'});
  return getDb().transaction(async tx=>{const [saved]=await tx.update(schema.plans).set({approved:approve,rejected:!approve}).where(and(eq(schema.plans.id,planId),eq(schema.plans.applied,false))).returning();if(!saved)fail('Plan changed concurrently.',{statusCode:409});await tx.insert(schema.events).values({id:crypto.randomUUID(),workspaceId:id,ownerEmail:w.ownerEmail,actor:`human:${ctx?.caller}`,kind:approve?'approved':'rejected',revision:w.revision,details:{planId},createdAt:new Date().toISOString()});return {id:planId,approved:approve};});
}
export async function executePlan(id:string,planId:string,ctx?:ActionRunContext){
  const {w,p}=await findPlan(id,planId,ctx);
  if(p.applied)return {id:planId,applied:true,idempotent:true};
  if(!p.approved||p.rejected)fail('Human approval is required before execution.',{statusCode:403,errorCode:'approval_required'});
  if(w.revision!==p.baseRevision)fail('Approval is stale. Recompute and approve against the current revision.',{statusCode:409,errorCode:'stale_plan'});
  let source=w.snapshot;
  if(p.branchId){const [b]=await getDb().select().from(schema.branches).where(and(eq(schema.branches.id,p.branchId),eq(schema.branches.ownerEmail,w.ownerEmail))).limit(1);if(!b)fail('Branch no longer exists.',{statusCode:404});source=b.snapshot;}
  const recomputed=optimize(source,p.plan.strategy,optionsSchema.parse(p.plan.options));
  if(!isDeepStrictEqual(recomputed,p.plan))fail('Stored plan failed deterministic verification.',{statusCode:409,errorCode:'plan_integrity'});
  const after=applyPlan(source,recomputed);
  return getDb().transaction(async tx=>{
    const [saved]=await tx.update(schema.workspaces).set({snapshot:after,revision:w.revision+1}).where(and(eq(schema.workspaces.id,id),eq(schema.workspaces.ownerEmail,w.ownerEmail),eq(schema.workspaces.revision,p.baseRevision))).returning();
    if(!saved)fail('Concurrent execution rejected. Refresh the workspace.',{statusCode:409,errorCode:'stale_plan'});
    const [marked]=await tx.update(schema.plans).set({applied:true}).where(and(eq(schema.plans.id,planId),eq(schema.plans.applied,false),eq(schema.plans.approved,true),eq(schema.plans.rejected,false))).returning();if(!marked)fail('Approval changed during execution.',{statusCode:409});
    await tx.insert(schema.events).values({id:crypto.randomUUID(),workspaceId:id,ownerEmail:w.ownerEmail,actor:ctx?.caller??'unknown',kind:'plan-applied',revision:saved.revision,details:{planId,strategy:p.plan.strategy,metrics:p.plan.metrics,beforeMetrics:risks(w.snapshot).metrics,mode:'internal-simulation'},before:w.snapshot,after,createdAt:new Date().toISOString()});
    return {id:planId,applied:true,idempotent:false,revision:saved.revision,metrics:risks(after).metrics};
  });
}
export async function undo(id:string,expectedRevision:number,ctx?:ActionRunContext){
  const w=await workspace(id,ctx);const [event]=await getDb().select().from(schema.events).where(and(eq(schema.events.workspaceId,id),eq(schema.events.ownerEmail,w.ownerEmail),eq(schema.events.revision,expectedRevision))).orderBy(desc(schema.events.createdAt)).limit(10).then(rows=>rows.filter(e=>e.before&&e.after));
  if(!event?.before)fail('No reversible operational change at this revision.',{statusCode:409,errorCode:'nothing_to_undo'});
  return mutateSnapshot(id,expectedRevision,ctx,'undo',()=>event.before!,{reversedEventId:event.id,scope:'Internal model only; does not reverse external shipments or purchases.'});
}
export async function branch(id:string,name:string,ctx:ActionRunContext|undefined,parentId?:string,incident?:{kind:typeof incidentKinds[number];target:string;value:number}){
  const w=await workspace(id,ctx);let source=w.snapshot;
  if(parentId){const [p]=await getDb().select().from(schema.branches).where(and(eq(schema.branches.id,parentId),eq(schema.branches.workspaceId,id),eq(schema.branches.ownerEmail,w.ownerEmail))).limit(1);if(!p)fail('Parent branch not found.',{statusCode:404});if(p.baseRevision!==w.revision)fail('Parent branch is stale; fork from the current model.',{statusCode:409});source=p.snapshot;}
  const snapshot=incident?disrupt(source,incident.kind,incident.target,incident.value):structuredClone(source);
  const row={id:crypto.randomUUID(),workspaceId:id,ownerEmail:w.ownerEmail,parentId:parentId??null,name,snapshot,baseRevision:w.revision,createdAt:new Date().toISOString()};await getDb().insert(schema.branches).values(row);return row;
}
