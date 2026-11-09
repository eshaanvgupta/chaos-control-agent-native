import { z } from 'zod';

const id = z.string().trim().min(1).max(80);
const quantity = z.number().int().min(0).max(1_000_000);
const cents = z.number().int().min(0).max(100_000_000);
export const productSchema = z.object({ id, name: z.string().min(1).max(120), saleCents: cents });
export const warehouseSchema = z.object({ id, name: z.string().min(1).max(120), capacity: quantity.positive(), dailyCapacity: quantity.positive(), active: z.boolean() });
export const inventorySchema = z.object({ warehouseId: id, sku: id, quantity });
export const supplierSchema = z.object({ id, name: z.string().min(1).max(120), sku: id, quantity, leadDays: z.number().int().min(0).max(365), unitCents: cents, reliability: z.number().min(0).max(1) });
export const laneSchema = z.object({ id, from: id, to: id, days: z.number().int().min(0).max(90), capacity: quantity, unitCents: cents, blocked: z.boolean() });
export const allocationSchema = z.object({ orderId: id, sku: id, quantity: quantity.positive(), source: id, warehouseId: id, laneIds: z.array(id), laneDepartures:z.array(quantity), arrivalDay: quantity, unitCents: cents, purchase: z.boolean() });
export const orderSchema = z.object({ id, sku: id, quantity: quantity.positive(), dueDay: quantity, priority: z.enum(['standard','high','critical']), zone: id, fulfilled: quantity.default(0), allocations: z.array(allocationSchema).default([]) });
export const snapshotSchema = z.object({
  name: z.string().min(1).max(120), day: quantity, seed: z.number().int(), currency: z.literal('USD'),
  products: z.array(productSchema).min(1).max(200), warehouses: z.array(warehouseSchema).min(1).max(30),
  inventory: z.array(inventorySchema).max(6000), suppliers: z.array(supplierSchema).max(1000),
  lanes: z.array(laneSchema).max(2000), orders: z.array(orderSchema).min(1).max(2000),
  incidents: z.array(z.object({ kind: z.string(), target: z.string(), value: z.number(), day: quantity })).max(100),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Allocation = z.infer<typeof allocationSchema>;
export const strategySchema = z.enum(['ECONOMY','BALANCED','RESCUE']);
export type Strategy = z.infer<typeof strategySchema>;
export const optionsSchema = z.object({
  budgetCents: cents.default(250000).describe('Maximum total modeled operating cost, integer USD cents'),
  horizon: z.number().int().min(1).max(30).default(14).describe('Planning window in days'),
  priorityWeight: z.number().min(0).max(10).default(3).describe('Priority preference weight for the feasible greedy heuristic'),
  allowPurchases: z.boolean().default(true).describe('Allow simulated purchases, never external supplier orders'),
});
export type Options = z.infer<typeof optionsSchema>;
export type Metrics = { totalOrders:number; fulfilledOrders:number; onTimeOrders:number; units:number; fulfilledUnits:number; lateUnits:number; costCents:number; exposureCents:number; stockouts:number; health:number; service:number; uncertainty:string; rating:string };
export type Plan = { strategy:Strategy|'BASELINE'; allocations:Allocation[]; metrics:Metrics; remainingInventory:Snapshot['inventory']; remainingSuppliers:Snapshot['suppliers']; reasons:string[]; assumptions:string[]; options:Options };

export function validateSnapshot(input:unknown):Snapshot {
  const s = snapshotSchema.parse(input);
  for (const [label, rows] of [['products',s.products],['warehouses',s.warehouses],['orders',s.orders],['lanes',s.lanes]] as const) {
    if(new Set(rows.map(r=>r.id)).size!==rows.length) throw new Error(`Duplicate identifier in ${label}`);
  }
  const products = new Set(s.products.map(p=>p.id)), warehouses = new Set(s.warehouses.map(w=>w.id));
  const nodes = new Set([...warehouses,...s.suppliers.map(p=>p.id),...s.orders.map(o=>o.zone)]);
  const invKeys = new Set<string>(), supKeys = new Set<string>();
  for(const i of s.inventory){ const key=`${i.warehouseId}:${i.sku}`; if(invKeys.has(key))throw new Error(`Duplicate inventory ${key}`); invKeys.add(key); if(!warehouses.has(i.warehouseId)||!products.has(i.sku))throw new Error(`Missing inventory reference ${key}`); }
  for(const w of s.warehouses) if(s.inventory.filter(i=>i.warehouseId===w.id).reduce((a,i)=>a+i.quantity,0)>w.capacity)throw new Error(`Warehouse ${w.id} exceeds storage capacity`);
  for(const p of s.suppliers){const key=`${p.id}:${p.sku}`;if(supKeys.has(key))throw new Error(`Duplicate supplier capability ${key}`);supKeys.add(key);if(!products.has(p.sku)||warehouses.has(p.id))throw new Error(`Invalid supplier reference ${p.id}`);}
  for(const o of s.orders) {if(!products.has(o.sku)||o.fulfilled>o.quantity||warehouses.has(o.zone)||s.suppliers.some(p=>p.id===o.zone))throw new Error(`Invalid order ${o.id}`);if(o.allocations.reduce((n,a)=>n+a.quantity,0)!==o.fulfilled)throw new Error(`Order allocation accounting mismatch ${o.id}`);}
  for(const l of s.lanes) if(!nodes.has(l.from)||!nodes.has(l.to)||l.from===l.to)throw new Error(`Missing or invalid lane reference ${l.id}`);
  return s;
}
