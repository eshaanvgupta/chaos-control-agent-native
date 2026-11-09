import { useMemo,useRef,useState } from 'react';
import type { Snapshot,Allocation } from '../../../lib/model';
import { optimize } from '../../../lib/engine';

export function Network({snapshot,selected,onSelect,product='',priority='',allocations,compact=false}:{snapshot:Snapshot;selected?:string;onSelect?:(id:string)=>void;product?:string;priority?:string;allocations?:Allocation[];compact?:boolean}){
  const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});const drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
  const projected=useMemo(()=>allocations??optimize(snapshot,'BASELINE',{budgetCents:100000000}).allocations,[snapshot,allocations]);
  const nodes=useMemo(()=>{
    const suppliers=[...new Map(snapshot.suppliers.map(s=>[s.id,s])).values()].slice(0,12);
    const zones=[...new Set(snapshot.orders.map(o=>o.zone))].slice(0,12);
    return [
      ...suppliers.map((s,i)=>({id:s.id,name:s.name,type:'supplier',x:130,y:95+i*420/Math.max(1,suppliers.length-1),value:snapshot.suppliers.filter(p=>p.id===s.id&&(!product||p.sku===product)).reduce((a,b)=>a+b.quantity,0),risk:snapshot.suppliers.some(p=>p.id===s.id&&p.leadDays>5),detail:`${s.leadDays}d lead time`})),
      ...snapshot.warehouses.slice(0,12).map((w,i)=>({id:w.id,name:w.name,type:'warehouse',x:460,y:110+i*390/Math.max(1,snapshot.warehouses.length-1),value:snapshot.inventory.filter(p=>p.warehouseId===w.id&&(!product||p.sku===product)).reduce((a,b)=>a+b.quantity,0),risk:!w.active,detail:w.active?`${w.dailyCapacity} units/day`:'SHUTDOWN'})),
      ...zones.map((z,i)=>({id:z,name:z.replace('ZONE-',''),type:'zone',x:795,y:150+i*310/Math.max(1,zones.length-1),value:snapshot.orders.filter(o=>o.zone===z&&(!product||o.sku===product)&&(!priority||o.priority===priority)).reduce((a,b)=>a+b.quantity-b.fulfilled,0),risk:false,detail:'demand zone'})),
    ];
  },[snapshot,product,priority]);
  const visibleAlloc=projected.filter(a=>(!product||a.sku===product)&&(!priority||snapshot.orders.find(o=>o.id===a.orderId)?.priority===priority));
  const activeLanes=new Set(visibleAlloc.flatMap(a=>a.laneIds));
  return <div className={`network ${compact?'compact':''}`}>
    {!compact&&<><div className="map-label"><span className="live-dot"/> OPERATIONAL TWIN <span>/ ABSTRACT NETWORK</span></div><div className="map-controls"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.6,z-.2))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(2,z+.2))}>+</button><button aria-label="Reset camera" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>âŒ–</button></div></>}
    <svg viewBox="0 0 930 650" role="img" aria-label="Interactive abstract operations network, suppliers to warehouses to demand zones" onPointerDown={e=>{if((e.target as Element).closest('[data-node]'))return;drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)setPan({x:drag.current.px+(e.clientX-drag.current.x)/zoom,y:drag.current.py+(e.clientY-drag.current.y)/zoom});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
      <defs>
        <pattern id="twin-grid" width="40" height="24" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)"><path d="M 40 0 L 0 0 0 24" fill="none" stroke="#283a42" strokeWidth=".6"/></pattern>
        <radialGradient id="twin-glow"><stop offset="0" stopColor="#cbff49" stopOpacity=".09"/><stop offset="1" stopColor="#cbff49" stopOpacity="0"/></radialGradient>
        <filter id="node-glow"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <rect width="930" height="650" fill="url(#twin-glow)"/><path d="M0 100 930 25V560L0 650Z" fill="url(#twin-grid)" opacity=".65"/>
      <g transform={`translate(${pan.x} ${pan.y}) translate(465 325) scale(${zoom}) translate(-465 -325)`}>
        <text x="77" y="36" className="svg-eyebrow">01 / SUPPLY</text><text x="397" y="36" className="svg-eyebrow">02 / FULFILLMENT</text><text x="739" y="36" className="svg-eyebrow">03 / DEMAND</text>
        {snapshot.lanes.map(l=>{const a=nodes.find(n=>n.id===l.from),b=nodes.find(n=>n.id===l.to);if(!a||!b)return null;const active=activeLanes.has(l.id),d=`M${a.x} ${a.y} C${a.x+100} ${a.y-30},${b.x-100} ${b.y+30},${b.x} ${b.y}`;return <g key={l.id}><title>{`${l.id}: ${l.blocked?'blocked':`${l.days}d transit · ${l.capacity} units/day · $${(l.unitCents/100).toFixed(2)}/unit`}`}</title><path d={d} className={`lane ${l.blocked?'blocked':active?'flow':''}`} />{active&&!l.blocked&&<path d={d} className="shipment"/>}</g>;})}
        {nodes.map(n=>{const isW=n.type==='warehouse',isS=n.type==='supplier',picked=selected===n.id;return <g key={n.id} data-node={n.id} transform={`translate(${n.x} ${n.y})`} tabIndex={onSelect?0:undefined} role={onSelect?'button':undefined} aria-label={`${n.name}, ${n.value} units, ${n.detail}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(n.id);}}} onClick={()=>onSelect?.(n.id)} className={`world-node ${picked?'selected':''} ${n.risk?'risk':''}`}>
          <title>{`${n.name} · ${n.value} units · ${n.detail}`}</title>
          {n.risk&&<circle r="58" className="shockwave"/>}
          <ellipse cy="25" rx={isW?76:48} ry={isW?30:19} fill={picked?'#cbff4914':'#14232a'} stroke={picked?'#cbff49':n.risk?'#ff6278':'#34494c'} strokeWidth="1.3"/>
          {isW?<g transform="translate(-40 -38)"><path d="M0 16 40 -6 80 16 40 38Z" fill={n.risk?'#6e3440':'#7d9472'}/><path d="M0 16V55L40 78V38Z" fill="#263e39" stroke="#536b58"/><path d="M40 38 80 16V55L40 78Z" fill="#172c2b" stroke="#536b58"/><path d="M51 49 65 41V64L51 72Z" fill={n.risk?'#ff6278':'#cbff49'} opacity=".85"/><path d="m10 30 20 11v7L10 37Zm0 15 20 11v7L10 52Z" fill="#83a078"/><path d="M14 14 40 0 66 14 40 29Z" fill="#364d3c" stroke="#a7bc88" strokeWidth=".7"/></g>:isS?<g><path d="m-22 2 22-14L22 2V25L0 39-22 25Z" fill="#18353c" stroke={n.risk?'#ff6278':'#40e7ff'}/><path d="m-22 2 22 13L22 2M0 15V39" fill="none" stroke="#40e7ff" opacity=".5"/><path d="M-4-12V-35H7v20M-17-4V-25h8v16" fill="#264a51" stroke="#5e8d91"/></g>:<g><circle r="23" fill="#142c2c" stroke="#cbff49" strokeWidth="1.4"/><circle r="31" fill="none" stroke="#536c40" strokeDasharray="3 5"/><path d="m-10 0 7 8 14-17" fill="none" stroke="#cbff49" strokeWidth="2"/></g>}
          <rect x={isW?-57:-48} y="53" width={isW?114:96} height="25" rx="4" fill="#0a131a" stroke={picked?'#cbff49':'#293d43'}/><text y="70" textAnchor="middle" className="node-id">{n.id}</text>
          <text y="95" textAnchor="middle" className="node-name">{n.name}</text><text y="114" textAnchor="middle" className="node-value">{n.value.toLocaleString()} units <tspan fill={n.risk?'#ff6278':'#627a82'}> · {n.detail}</tspan></text>
          {picked&&<path d="m-75-56 12 0m-12 0v12m150-12h-12m12 0v12m-150 98v12h12m138-12v12h-12" fill="none" stroke="#cbff49" strokeWidth="2"/>}
        </g>;})}
      </g>
    </svg>
    {!compact&&<div className="map-legend"><span><i className="lime"/>Projected flow</span><span><i className="coral"/>Disrupted</span><span><i/>Available route</span><small>Drag to pan · select a node to inspect</small></div>}
  </div>;
}
