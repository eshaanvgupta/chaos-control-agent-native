import { seedSnapshot } from '../lib/seed';
import { applyPlan,disrupt,optimize,risks } from '../lib/engine';
import { importBundle,exportCsv,csvFields } from '../lib/import';
import { optionsSchema,validateSnapshot } from '../lib/model';
import type { Snapshot,Plan } from '../lib/model';
type Event={id:string;kind:string;actor:string;revision:number;details:Record<string,unknown>;before?:Snapshot;after?:Snapshot;createdAt:string};
type Branch={id:string;name:string;parentId:string|null;snapshot:Snapshot;baseRevision:number;createdAt:string};
type StoredPlan={id:string;branchId:string|null;baseRevision:number;plan:Plan;approved:boolean;applied:boolean;rejected:boolean;createdAt:string};
type Workspace={id:string;name:string;snapshot:Snapshot;revision:number;createdAt:string};
type Project={workspace:Workspace;events:Event[];branches:Branch[];plans:StoredPlan[]};
type Store={projects:Record<string,Project>};
let connection:Promise<IDBDatabase>|undefined;
function database(){return connection??=new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('chaos-control-pages-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onerror=()=>reject(new Error('Browser storage is unavailable. Enable site storage or use the full application.'));request.onsuccess=()=>resolve(request.result);});}
const uuid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
function project(store:Store,id:string){const p=store.projects[id];if(!p)throw new Error('Workspace not found in this browser.');return p;}
function revision(p:Project,expected:number){if(expected!==p.workspace.revision)throw new Error('Workspace changed. Refresh and recompute the plan.');}
function event(p:Project,kind:string,details:Record<string,unknown>,before?:Snapshot,after?:Snapshot){p.events.unshift({id:uuid(),kind,actor:'human:browser-demo',revision:p.workspace.revision,details,...(before?{before}:{}),...(after?{after}:{}),createdAt:now()});}
function create(store:Store,snapshot:Snapshot){const w={id:uuid(),name:snapshot.name,snapshot,revision:0,createdAt:now()};if(Object.keys(store.projects).length>=30)throw new Error('This browser demo supports up to 30 workspaces. Export existing work before clearing site storage.');const p:Project={workspace:w,events:[],branches:[],plans:[]};store.projects[w.id]=p;event(p,'created',{mode:'browser-only'},undefined,snapshot);return w;}
function change(p:Project,next:Snapshot,kind:string,details:Record<string,unknown>){const before=structuredClone(p.workspace.snapshot);p.workspace.snapshot=validateSnapshot(next);p.workspace.revision++;event(p,kind,details,before,next);return {id:p.workspace.id,revision:p.workspace.revision};}
function execute(store:Store,name:string,args:any):any{
  if(name==='list-workspaces')return Object.values(store.projects).map(p=>({id:p.workspace.id,name:p.workspace.name,revision:p.workspace.revision})).reverse();
  if(name==='create-workspace')return create(store,seedSnapshot(args.mission??'BLACKOUT'));
  if(name==='import-business-data'){const snapshot=importBundle(args.tables,args.name);return args.commit?{workspace:create(store,snapshot),snapshot,fields:csvFields}:{snapshot,fields:csvFields};}
  const p=project(store,args.id),w=p.workspace;
  if(name==='get-operational-state')return {...p,risks:risks(w.snapshot),events:p.events.map(({before,after,...e})=>e)};
  if(name==='detect-operational-risks')return risks(w.snapshot);
  if(name==='simulate-disruption'){revision(p,args.expectedRevision);return change(p,disrupt(w.snapshot,args.kind,args.target,args.value),'disruption',{kind:args.kind,target:args.target,value:args.value});}
  if(name==='generate-recovery-plan'){
    const options=optionsSchema.parse(args.options??{}),b=args.branchId?p.branches.find(b=>b.id===args.branchId):undefined;if(args.branchId&&!b)throw new Error('Branch not found.');
    const rows=(['ECONOMY','BALANCED','RESCUE'] as const).map(strategy=>({id:uuid(),branchId:b?.id??null,baseRevision:b?.baseRevision??w.revision,plan:optimize(b?.snapshot??w.snapshot,strategy,options),approved:false,applied:false,rejected:false,createdAt:now()}));
    if(p.plans.length>300)throw new Error('Demo plan history limit reached. Export this workspace and start a new one.');p.plans.unshift(...rows);event(p,'plans-generated',{planIds:rows.map(p=>p.id),options});return rows;
  }
  if(name==='approve-plan'||name==='apply-approved-plan'){
    const plan=p.plans.find(p=>p.id===args.planId);if(!plan)throw new Error('Plan not found.');
    if(name==='apply-approved-plan'&&plan.applied)return {id:plan.id,applied:true,idempotent:true};
    revision(p,plan.baseRevision);if(plan.applied)throw new Error('Plan already applied.');
    if(name==='approve-plan'){plan.approved=!!args.approve;plan.rejected=!args.approve;event(p,args.approve?'approved':'rejected',{planId:plan.id});return {id:plan.id,approved:plan.approved};}
    if(!plan.approved||plan.rejected)throw new Error('Human approval is required before execution.');
    const source=plan.branchId?p.branches.find(b=>b.id===plan.branchId)?.snapshot:w.snapshot;if(!source)throw new Error('Branch not found.');
    const recomputed=optimize(source,plan.plan.strategy,plan.plan.options);
    if(JSON.stringify(recomputed)!==JSON.stringify(plan.plan))throw new Error('Plan verification failed.');
    const beforeMetrics=risks(w.snapshot).metrics,result=change(p,applyPlan(source,recomputed),'plan-applied',{planId:plan.id,strategy:plan.plan.strategy,metrics:plan.plan.metrics,beforeMetrics,mode:'browser-only simulation'});plan.applied=true;return {...result,applied:true,idempotent:false};
  }
  if(name==='create-scenario-branch'){
    const parent=args.parentId?p.branches.find(b=>b.id===args.parentId):undefined;if(args.parentId&&!parent)throw new Error('Parent branch not found.');if(parent)revision(p,parent.baseRevision);
    if(p.branches.length>=50)throw new Error('This demo supports up to 50 branches per workspace.');
    const source=parent?.snapshot??w.snapshot,b={id:uuid(),name:String(args.name).slice(0,100),parentId:parent?.id??null,snapshot:args.incident?disrupt(source,args.incident.kind,args.incident.target,args.incident.value):structuredClone(source),baseRevision:w.revision,createdAt:now()};p.branches.unshift(b);return b;
  }
  if(name==='undo-operational-change'){revision(p,args.expectedRevision);const previous=p.events.find(e=>e.revision===w.revision&&e.before&&e.after);if(!previous?.before)throw new Error('No reversible change at the current revision.');return change(p,structuredClone(previous.before),'undo',{reversedEventId:previous.id});}
  if(name==='replay-decision'){const e=p.events.find(e=>e.id===args.eventId);if(!e?.after)throw new Error('No replayable snapshot for this event.');const b={id:uuid(),name:`Replay: ${e.kind}`,parentId:null,snapshot:structuredClone(e.after),baseRevision:w.revision,createdAt:now()};p.branches.unshift(b);return b;}
  if(name==='export-impact-report')return {report:{product:'CHAOS//CONTROL',mode:'browser-only internal simulation',generatedAt:now(),...p,risks:risks(w.snapshot)},csv:exportCsv(w.snapshot.orders.map(o=>({id:o.id,sku:o.sku,quantity:o.quantity,fulfilled:o.fulfilled,dueDay:o.dueDay,priority:o.priority,zone:o.zone})))};
  if(name==='compare-scenarios')return {baseline:risks(w.snapshot).metrics,branches:p.branches.map(b=>({id:b.id,name:b.name,metrics:optimize(b.snapshot,'BALANCED').metrics}))};
  throw new Error(`The ${name} action requires the full server application.`);
}
/** IndexedDB read/modify/write transaction: tabs cannot overwrite the same model revision. */
export async function browserAction(name:string,args:any={}){
  const db=await database(),readOnly=['list-workspaces','get-operational-state','detect-operational-risks','compare-scenarios','export-impact-report'].includes(name);
  return new Promise<any>((resolve,reject)=>{
    const tx=db.transaction('state',readOnly?'readonly':'readwrite'),table=tx.objectStore('state'),read=table.get('data');let result:any,failure:Error|undefined;
    read.onsuccess=()=>{try{const store:Store=read.result??{projects:{}};result=execute(store,name,args);if(!readOnly)table.put(store,'data');}catch(e){failure=e instanceof Error?e:new Error('Browser operation failed.');tx.abort();}};
    tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure??new Error('Browser storage transaction was rejected.'));tx.onerror=()=>reject(failure??new Error('Unable to persist this browser operation.'));
  });
}
