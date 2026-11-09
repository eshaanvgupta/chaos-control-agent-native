import { optionsSchema, validateSnapshot, type Allocation, type Metrics, type Options, type Plan, type Snapshot, type Strategy } from './model';

const rank={standard:1,high:3,critical:6};
const sum=(xs:number[])=>xs.reduce((a,b)=>a+b,0);
const clone=<T>(x:T):T=>structuredClone(x);
export function evaluate(s:Snapshot,allocations:Allocation[],costCents=0):Metrics{
  let fulfilledOrders=0,onTimeOrders=0,fulfilledUnits=0,lateUnits=0,exposureCents=0;
  for(const o of s.orders){
    const aa=[...o.allocations,...allocations.filter(a=>a.orderId===o.id)];
    const units=sum(aa.map(a=>a.quantity)),onTime=sum(aa.filter(a=>a.arrivalDay<=o.dueDay).map(a=>a.quantity));
    fulfilledUnits+=units; lateUnits+=units-onTime;
    if(units>=o.quantity)fulfilledOrders++;if(onTime>=o.quantity)onTimeOrders++;
    exposureCents+=(o.quantity-onTime)*(s.products.find(p=>p.id===o.sku)?.saleCents??0);
  }
  const service=100*onTimeOrders/s.orders.length;
  const stockouts=s.products.filter(p=>s.orders.some(o=>o.sku===p.id&&o.fulfilled<o.quantity)&&sum(s.inventory.filter(i=>i.sku===p.id).map(i=>i.quantity))===0).length;
  const health=Math.round(0.8*service+0.2*(100*(1-stockouts/s.products.length)));
  return {totalOrders:s.orders.length,fulfilledOrders,onTimeOrders,units:sum(s.orders.map(o=>o.quantity)),fulfilledUnits,lateUnits,costCents,exposureCents,stockouts,health,service:Math.round(service*10)/10,uncertainty:'Deterministic forecast. Lead times, demand and supplier availability are assumptions, not guarantees.',rating:service>=98?'S':service>=90?'A':service>=75?'B':service>=50?'C':'D'};
}

/** Feasible, bounded, deterministic greedy allocation. No global optimality claim. */
export function optimize(input:Snapshot,strategy:Strategy|'BASELINE',rawOptions:Partial<Options>={}):Plan{
  const s=validateSnapshot(clone(input)), options=optionsSchema.parse(rawOptions), end=s.day+options.horizon;
  const stock=clone(s.inventory), suppliers=clone(s.suppliers), used=new Map<string,number>(), throughput=new Map<string,number>(), inbound=new Map<string,number>();
  const allocations:Allocation[]=[];let cost=0;
  const active=(id:string)=>s.warehouses.find(w=>w.id===id&&w.active);
  const remainingLane=(id:string,day:number)=>{const l=s.lanes.find(l=>l.id===id)!;return l.capacity-(used.get(`${id}:${day}`)??0);};
  const orders=[...s.orders].sort((a,b)=>strategy==='ECONOMY'?a.dueDay-b.dueDay||a.id.localeCompare(b.id):(b.priority===a.priority?0:(rank[b.priority]-rank[a.priority])*options.priorityWeight)||a.dueDay-b.dueDay||a.id.localeCompare(b.id));
  for(const o of orders){let needed=o.quantity-o.fulfilled;
    type Candidate={source:string;wh:string;lanes:string[];departures:number[];arrival:number;unitCents:number;purchase:boolean;stockIndex:number;supplierIndex:number};
    const candidates:Candidate[]=[];
    for(const out of s.lanes.filter(l=>l.to===o.zone&&!l.blocked&&active(l.from))){
      const w=active(out.from)!;
      const push=(source:string,lanes:string[],earliestArrival:number,unitCents:number,purchase:boolean,stockIndex:number,supplierIndex:number)=>{
        const travel=lanes.map(id=>s.lanes.find(l=>l.id===id)!.days),totalTravel=sum(travel);
        for(let arrival=earliestArrival;arrival<=end;arrival++){
          let departure=arrival-totalTravel;const departures=travel.map(days=>{const d=departure;departure+=days;return d;});
          candidates.push({source,wh:w.id,lanes,departures,arrival,unitCents,purchase,stockIndex,supplierIndex});
        }
      };
      const si=stock.findIndex(i=>i.warehouseId===w.id&&i.sku===o.sku);
      if(si>=0&&stock[si]!.quantity>0)push(w.id,[out.id],s.day+out.days,out.unitCents,false,si,-1);
      for(const move of s.lanes.filter(l=>strategy!=='BASELINE'&&l.to===w.id&&!l.blocked&&active(l.from)&&l.from!==w.id)){
        const ix=stock.findIndex(i=>i.warehouseId===move.from&&i.sku===o.sku);
        if(ix>=0&&stock[ix]!.quantity>0)push(move.from,[move.id,out.id],s.day+move.days+out.days,move.unitCents+out.unitCents,false,ix,-1);
      }
      if(strategy==='ECONOMY'||!options.allowPurchases)continue;
      for(const [pi,p] of suppliers.entries())if(p.sku===o.sku&&p.quantity>0&&(strategy!=='BASELINE'||p.unitCents<=600)){
        for(const lane of s.lanes.filter(l=>l.from===p.id&&l.to===w.id&&!l.blocked))push(p.id,[lane.id,out.id],s.day+p.leadDays+lane.days+out.days,p.unitCents+lane.unitCents+out.unitCents,true,-1,pi);
      }
    }
    const score=(c:Candidate)=>strategy==='ECONOMY'||strategy==='BASELINE'?c.unitCents+(c.arrival>o.dueDay?100000:0):strategy==='RESCUE'?(c.arrival>o.dueDay?1000000:0)+c.arrival*500+c.unitCents/10:c.unitCents+Math.max(0,c.arrival-o.dueDay)*3000+Math.max(0,c.arrival-s.day)*70;
    candidates.sort((a,b)=>score(a)-score(b)||a.source.localeCompare(b.source)||a.wh.localeCompare(b.wh));
    for(const c of candidates){if(needed===0)break;
      const w=active(c.wh)!,moves=c.source!==c.wh;
      const remainingStock=c.purchase?suppliers[c.supplierIndex]!.quantity:stock[c.stockIndex]!.quantity;
      const sourceWh=active(c.source);
      const sourceKey=`${c.source}:${c.departures[0]}`,destKey=`${w.id}:${c.departures[c.departures.length-1]}`;
      const sourceProcessing=sourceWh?sourceWh.dailyCapacity-(throughput.get(sourceKey)??0):Infinity;
      const destProcessing=w.dailyCapacity-(throughput.get(destKey)??0);
      const storage=moves?w.capacity-sum(s.inventory.filter(i=>i.warehouseId===w.id).map(i=>i.quantity))-(inbound.get(w.id)??0):Infinity;
      const affordable=c.unitCents===0?needed:Math.floor((options.budgetCents-cost)/c.unitCents);
      const q=Math.max(0,Math.min(needed,remainingStock,...c.lanes.map((id,i)=>remainingLane(id,c.departures[i]!)),sourceProcessing,destProcessing,storage,affordable));
      if(!q)continue;
      allocations.push({orderId:o.id,sku:o.sku,quantity:q,source:c.source,warehouseId:c.wh,laneIds:c.lanes,laneDepartures:c.departures,arrivalDay:c.arrival,unitCents:c.unitCents,purchase:c.purchase});
      cost+=q*c.unitCents;needed-=q;
      if(c.purchase)suppliers[c.supplierIndex]!.quantity-=q;else stock[c.stockIndex]!.quantity-=q;
      for(const [i,l] of c.lanes.entries()){const key=`${l}:${c.departures[i]}`;used.set(key,(used.get(key)??0)+q);}
      throughput.set(destKey,(throughput.get(destKey)??0)+q);
      if(moves){inbound.set(w.id,(inbound.get(w.id)??0)+q);if(sourceWh)throughput.set(sourceKey,(throughput.get(sourceKey)??0)+q);}
    }
  }
  const metrics=evaluate(s,allocations,cost);
  const reasons=s.orders.filter(o=>o.fulfilled+sum(allocations.filter(a=>a.orderId===o.id).map(a=>a.quantity))<o.quantity).slice(0,30).map(o=>`${o.id}: insufficient feasible stock, lane/warehouse capacity, arrival window or budget for ${o.sku}.`);
  return {strategy,allocations,metrics,remainingInventory:stock,remainingSuppliers:suppliers,reasons,options,assumptions:['All quantities are discrete units; costs are USD cents.','Lane departures and warehouse processing reserve daily capacity on discrete modeled days.','Incoming transfers/purchases must fit storage without relying on future outbound space.','No stochastic confidence percentage is estimated. Supplier reliability is descriptive input.','Internal simulation only: no supplier purchase or shipment is sent.','Greedy allocation is feasible but is not a proof of global optimality.'],};
}

export function applyPlan(s:Snapshot,p:Plan):Snapshot{
  // Never trust a client-supplied plan: persistence layer re-runs and compares stored allocations.
  const next=clone(s);next.inventory=clone(p.remainingInventory);next.suppliers=clone(p.remainingSuppliers);
  for(const o of next.orders){const aa=p.allocations.filter(a=>a.orderId===o.id);o.allocations.push(...clone(aa));o.fulfilled+=sum(aa.map(a=>a.quantity));}
  next.day+=p.options.horizon;
  return validateSnapshot(next);
}

export const incidentKinds=['supplier-outage','lead-time','demand-spike','warehouse-shutdown','lane-disruption','inventory-damage','stock-shortage','priority-surge','cost-inflation'] as const;
export function disrupt(input:Snapshot,kind:typeof incidentKinds[number],target:string,value:number):Snapshot{
  const s=clone(input); if(!Number.isFinite(value)||value<0)throw new Error('Incident value must be nonnegative');
  let found=false;
  if(kind==='supplier-outage'||kind==='lead-time')for(const p of s.suppliers.filter(p=>p.id===target)){p.leadDays+=Math.ceil(value);found=true;}
  if(kind==='warehouse-shutdown')for(const w of s.warehouses.filter(w=>w.id===target)){w.active=false;found=true;}
  if(kind==='lane-disruption')for(const l of s.lanes.filter(l=>l.id===target)){l.blocked=true;found=true;}
  if(kind==='inventory-damage'||kind==='stock-shortage')for(const i of s.inventory.filter(i=>i.warehouseId===target)){i.quantity=Math.max(0,i.quantity-Math.ceil(i.quantity*Math.min(value,100)/100));found=true;}
  if(kind==='cost-inflation')for(const l of s.lanes.filter(l=>target==='all'||l.id===target)){l.unitCents=Math.round(l.unitCents*(1+value/100));found=true;}
  if(kind==='demand-spike'||kind==='priority-surge'){
    const affected=s.orders.filter(o=>(o.zone===target||target==='all')&&o.fulfilled<o.quantity);
    for(const o of affected){if(kind==='demand-spike')o.quantity+=Math.ceil((o.quantity-o.fulfilled)*value/100);else o.priority='critical';found=true;}
  }
  if(!found)throw new Error(`No matching resource for ${kind}: ${target}`);
  s.incidents.push({kind,target,value,day:s.day}); return validateSnapshot(s);
}

export function risks(s:Snapshot){
  const baseline=optimize(s,'BASELINE',{budgetCents:100000000});
  return {metrics:baseline.metrics,atRiskOrders:s.orders.filter(o=>o.fulfilled+sum(baseline.allocations.filter(a=>a.orderId===o.id&&a.arrivalDay<=o.dueDay).map(a=>a.quantity))<o.quantity).map(o=>o.id),
    warehouses:s.warehouses.map(w=>({...w,stock:sum(s.inventory.filter(i=>i.warehouseId===w.id).map(i=>i.quantity)),affectedOrders:s.orders.filter(o=>o.fulfilled<o.quantity&&!s.inventory.some(i=>i.warehouseId===w.id&&i.sku===o.sku&&i.quantity>=o.quantity-o.fulfilled)).length})),
    supplierRisks:[...new Set(s.suppliers.filter(p=>p.leadDays>5||p.reliability<0.9).map(p=>p.id))],reasons:baseline.reasons};
}
