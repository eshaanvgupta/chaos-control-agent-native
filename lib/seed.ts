import { validateSnapshot, type Snapshot } from './model';

export function seedSnapshot(mission='BLACKOUT', seed=42):Snapshot {
  let n=seed>>>0; const rand=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};
  const names=['Orbit headphones','Flux keyboard','Nova mouse','Pulse speaker','Ion charger','Prism camera','Halo watch','Echo earbuds','Core hub','Arc stand','Beam lamp','Wave mic','Link cable','Volt bank','Shift pad','Loop tracker','Zen dock','Ray light'];
  const products=names.map((name,i)=>({id:`SKU-${String(i+1).padStart(2,'0')}`,name,saleCents:3500+i*650}));
  const warehouses=[{id:'WH-WEST',name:'Pacific / West',capacity:1400,dailyCapacity:100,active:true},{id:'WH-CENTRAL',name:'Meridian / Central',capacity:1200,dailyCapacity:80,active:true},{id:'WH-EAST',name:'Atlantic / East',capacity:1600,dailyCapacity:120,active:true}];
  const inventory=warehouses.flatMap((w,j)=>products.map((p,i)=>({warehouseId:w.id,sku:p.id,quantity: i<6 ? (j===0?2:j===1?4:8):8+Math.floor(rand()*13)})));
  const suppliers=Array.from({length:4},(_,j)=>products.filter((_,i)=>j===0?i<9:j===1?i>=6:j===2?i%2===0:i%2===1).map(p=>({id:`SUP-${j+1}`,name:['Helix Industries','Kinetic Supply','Vertex Partners','Aster Logistics'][j],sku:p.id,quantity:j<2?120:28,leadDays:j===0?1:j===1?5:2,unitCents:j<2?400:1250,reliability:j<2?0.95:0.82}))).flat();
  const zones=['ZONE-PACIFIC','ZONE-METRO','ZONE-ATLANTIC'];
  const lanes:Snapshot['lanes']=[];
  for(let j=1;j<=4;j++)for(const w of warehouses)lanes.push({id:`IN-${j}-${w.id}`,from:`SUP-${j}`,to:w.id,days:1,capacity:100,unitCents:100,blocked:false});
  for(const [wi,w] of warehouses.entries())for(const [zi,zone] of zones.entries())lanes.push({id:`OUT-${wi}-${zi}`,from:w.id,to:zone,days:wi===zi?1:3,capacity:wi===zi?110:40,unitCents:wi===zi?180:650,blocked:false});
  for(const w of warehouses)for(const t of warehouses)if(w.id!==t.id)lanes.push({id:`MOVE-${w.id}-${t.id}`,from:w.id,to:t.id,days:1,capacity:75,unitCents:220,blocked:false});
  const orders=Array.from({length:240},(_,i)=>({id:`ORD-${1001+i}`,sku:products[i%18]!.id,quantity:i%18<6?3+Math.floor(rand()*4):1+Math.floor(rand()*3),dueDay:2+Math.floor(rand()*6),priority:(i%9===0?'critical':i%3===0?'high':'standard') as 'standard'|'high'|'critical',zone:zones[i%3]!,fulfilled:0,allocations:[]}));
  return validateSnapshot({name:mission==='BLACKOUT'?'Operation: Blackout':mission==='TSUNAMI'?'The Demand Tsunami':'Cascade Failure',day:0,seed,currency:'USD',products,warehouses,inventory,suppliers,lanes,orders,incidents:[]});
}
