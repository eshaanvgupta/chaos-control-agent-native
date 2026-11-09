import { describe,it,expect } from 'vitest';
import { seedSnapshot } from '../lib/seed';
import { applyPlan,disrupt,optimize,risks } from '../lib/engine';
import { validateSnapshot } from '../lib/model';
import { importBundle,templates,safeCell,parseCsv } from '../lib/import';
describe('operations engine invariants',()=>{
  it('seeds internally consistent reproducible data',()=>{const s=seedSnapshot();expect(s).toEqual(seedSnapshot());expect(s.orders).toHaveLength(240);expect(s.warehouses).toHaveLength(3);expect(s.products).toHaveLength(18);expect(()=>validateSnapshot(s)).not.toThrow();});
  it('repeats identical forecasts without mutating the source',()=>{const s=seedSnapshot(),before=structuredClone(s);expect(optimize(s,'BALANCED')).toEqual(optimize(s,'BALANCED'));expect(s).toEqual(before);});
  it.each(['ECONOMY','BALANCED','RESCUE'] as const)('%s preserves inventory, purchase accounting, budget and every daily route capacity',strategy=>{const s=disrupt(seedSnapshot(),'supplier-outage','SUP-1',7),p=optimize(s,strategy,{budgetCents:120000});
    expect(p.metrics.costCents).toBeLessThanOrEqual(120000);expect(p.metrics.costCents).toBe(p.allocations.reduce((n,a)=>n+a.quantity*a.unitCents,0));
    for(const i of p.remainingInventory){const original=s.inventory.find(x=>x.warehouseId===i.warehouseId&&x.sku===i.sku)!;const consumed=p.allocations.filter(a=>!a.purchase&&a.source===i.warehouseId&&a.sku===i.sku).reduce((n,a)=>n+a.quantity,0);expect(i.quantity).toBe(original.quantity-consumed);expect(i.quantity).toBeGreaterThanOrEqual(0);}
    for(const supplier of p.remainingSuppliers){const original=s.suppliers.find(x=>x.id===supplier.id&&x.sku===supplier.sku)!;expect(supplier.quantity).toBe(original.quantity-p.allocations.filter(a=>a.purchase&&a.source===supplier.id&&a.sku===supplier.sku).reduce((n,a)=>n+a.quantity,0));expect(supplier.quantity).toBeGreaterThanOrEqual(0);}
    const laneUse=new Map<string,number>(),processing=new Map<string,number>();
    for(const a of p.allocations){expect(a.arrivalDay).toBeLessThanOrEqual(s.day+p.options.horizon);expect(a.laneIds).toHaveLength(a.laneDepartures.length);for(const [i,id] of a.laneIds.entries()){const lane=s.lanes.find(l=>l.id===id)!;expect(lane.blocked).toBe(false);const day=a.laneDepartures[i]!,key=`${id}:${day}`;laneUse.set(key,(laneUse.get(key)??0)+a.quantity);expect(laneUse.get(key)).toBeLessThanOrEqual(lane.capacity);if(i<a.laneIds.length-1)expect(a.laneDepartures[i+1]).toBeGreaterThanOrEqual(day+lane.days);else expect(a.arrivalDay).toBe(day+lane.days);}
      if(a.purchase){const supplier=s.suppliers.find(x=>x.id===a.source&&x.sku===a.sku)!;expect(a.laneDepartures[0]).toBeGreaterThanOrEqual(s.day+supplier.leadDays);}
      const reserve=(wh:string,day:number)=>{const w=s.warehouses.find(w=>w.id===wh)!;expect(w.active).toBe(true);const key=`${wh}:${day}`;processing.set(key,(processing.get(key)??0)+a.quantity);expect(processing.get(key)).toBeLessThanOrEqual(w.dailyCapacity);};
      reserve(a.warehouseId,a.laneDepartures.at(-1)!);if(!a.purchase&&a.source!==a.warehouseId)reserve(a.source,a.laneDepartures[0]!);
    }
    for(const w of s.warehouses){const inbound=p.allocations.filter(a=>a.warehouseId===w.id&&a.source!==w.id).reduce((n,a)=>n+a.quantity,0);expect(inbound+s.inventory.filter(i=>i.warehouseId===w.id).reduce((n,i)=>n+i.quantity,0)).toBeLessThanOrEqual(w.capacity);}
    expect(()=>validateSnapshot(applyPlan(s,p))).not.toThrow();
  });
  it('never purchases for economy or without permission',()=>{expect(optimize(seedSnapshot(),'ECONOMY').allocations.some(a=>a.purchase)).toBe(false);expect(optimize(seedSnapshot(),'RESCUE',{allowPurchases:false}).allocations.some(a=>a.purchase)).toBe(false);});
  it('respects zero budget and exposes unmet orders',()=>{const p=optimize(seedSnapshot(),'RESCUE',{budgetCents:0});expect(p.allocations).toHaveLength(0);expect(p.reasons.length).toBeGreaterThan(0);});
  it('outage produces measurable on-time impact under normal replenishment policy',()=>{const s=seedSnapshot(),out=disrupt(s,'supplier-outage','SUP-1',7);expect(risks(out).metrics.service).toBeLessThan(risks(s).metrics.service);});
  it('blocks warehouse/route flows and keeps hypothetical snapshots isolated',()=>{const s=seedSnapshot(),b=disrupt(s,'warehouse-shutdown','WH-WEST',1),p=optimize(b,'RESCUE');expect(s.warehouses[0]!.active).toBe(true);expect(p.allocations.some(a=>a.source==='WH-WEST'||a.warehouseId==='WH-WEST')).toBe(false);const lane=s.lanes[0]!,blocked=disrupt(s,'lane-disruption',lane.id,1);expect(optimize(blocked,'RESCUE').allocations.some(a=>a.laneIds.includes(lane.id))).toBe(false);});
  it('supports every crisis and rejects unknown resources',()=>{for(const [kind,target,value] of [['lead-time','SUP-1',7],['demand-spike','all',100],['priority-surge','all',1],['cost-inflation','all',80],['inventory-damage','WH-EAST',30],['stock-shortage','WH-WEST',100]] as const){const s=disrupt(seedSnapshot(),kind,target,value);expect(s.incidents).toHaveLength(1);expect(()=>validateSnapshot(s)).not.toThrow();}expect(()=>disrupt(seedSnapshot(),'warehouse-shutdown','missing',1)).toThrow();});
  it('calculates health transparently',()=>{const s=seedSnapshot(),m=risks(s).metrics;expect(m.health).toBe(Math.round(.8*(100*m.onTimeOrders/m.totalOrders)+.2*100*(1-m.stockouts/s.products.length)));});
});
describe('business data imports',()=>{
  it('round-trips templates and remaps real column headers',()=>{const tables=templates(seedSnapshot());tables.inventory.csv=tables.inventory.csv.replace('warehouseId','warehouse_code');tables.inventory.mapping.warehouseId='warehouse_code';expect(importBundle(tables,'Custom retailer').orders).toHaveLength(240);});
  it('rejects negative inventory, dangling SKUs, overcapacity and duplicates',()=>{const s=seedSnapshot();for(const alter of [(x:typeof s)=>{x.inventory[0]!.quantity=-1;},(x:typeof s)=>{x.orders[0]!.sku='missing';},(x:typeof s)=>{x.warehouses[0]!.capacity=1;},(x:typeof s)=>{x.orders[1]!.id=x.orders[0]!.id;}]){const b=structuredClone(s);alter(b);expect(()=>validateSnapshot(b)).toThrow();}});
  it('rejects malformed CSV, missing columns and inconsistent numeric units',()=>{expect(()=>parseCsv('a,b\n1,2,3')).toThrow();const tables=templates(seedSnapshot());tables.inventory.mapping={};expect(()=>importBundle(tables,'X')).toThrow(/map/);const other=templates(seedSnapshot());other.inventory.csv=other.inventory.csv.replace(',2\r\n',',-2\r\n');expect(()=>importBundle(other,'X')).toThrow();});
  it('neutralizes spreadsheet formulas and limits input sizes',()=>{for(const value of ['=HYPERLINK("bad")','+CMD','-CMD','@SUM','\t=bad'])expect(safeCell(value)).toMatch(/^'/);expect(safeCell('SKU-01')).toBe('SKU-01');expect(()=>parseCsv('x'.repeat(1000001))).toThrow(/1 MB/);});
});
