import Papa from 'papaparse';
import { validateSnapshot, type Snapshot } from './model';
export const csvFields={
  products:['id','name','saleCents'],warehouses:['id','name','capacity','dailyCapacity','active'],
  inventory:['warehouseId','sku','quantity'],suppliers:['id','name','sku','quantity','leadDays','unitCents','reliability'],
  lanes:['id','from','to','days','capacity','unitCents','blocked'],orders:['id','sku','quantity','dueDay','priority','zone'],
} as const;
export type CsvKind=keyof typeof csvFields;
export type CsvBundle=Record<CsvKind,{csv:string;mapping:Record<string,string>}>;
const numeric=new Set(['saleCents','capacity','dailyCapacity','quantity','leadDays','unitCents','reliability','days','dueDay']);
export function parseCsv(csv:string){
  if(csv.length>1_000_000)throw new Error('CSV exceeds the 1 MB per-table limit.');
  const parsed=Papa.parse<Record<string,string>>(csv,{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});
  if(parsed.errors.length)throw new Error(`CSV row ${parsed.errors[0]!.row??'?'}: ${parsed.errors[0]!.message}`);
  if(parsed.data.length>6000)throw new Error('CSV exceeds 6,000 rows.');
  const fields=parsed.meta.fields??[];if(new Set(fields).size!==fields.length||parsed.meta.renamedHeaders&&Object.keys(parsed.meta.renamedHeaders).length)throw new Error('Duplicate CSV column names.');
  return {fields,rows:parsed.data};
}
export function importBundle(bundle:CsvBundle,name:string):Snapshot{
  const result:Record<string,unknown>={name,day:0,seed:42,currency:'USD',incidents:[]};
  for(const kind of Object.keys(csvFields) as CsvKind[]){
    const {rows,fields}=parseCsv(bundle[kind].csv),map=bundle[kind].mapping;
    for(const field of csvFields[kind])if(!map[field]||!fields.includes(map[field]))throw new Error(`${kind}: map the required ${field} column.`);
    result[kind]=rows.map((row,index)=>{
      const r:Record<string,unknown>={};for(const field of csvFields[kind]){
        const value=row[map[field]!] ?.trim();if(value===undefined||value==='')throw new Error(`${kind}, row ${index+2}: ${field} is required.`);
        if(numeric.has(field)){if(!/^\d+(\.\d+)?$/.test(value))throw new Error(`${kind}, row ${index+2}: ${field} must be a nonnegative number.`);r[field]=Number(value);}
        else if(field==='active'||field==='blocked'){if(!['true','false'].includes(value.toLowerCase()))throw new Error(`${kind}, row ${index+2}: ${field} must be true or false.`);r[field]=value.toLowerCase()==='true';}
        else r[field]=value;
      }
      if(kind==='orders'){r.fulfilled=0;r.allocations=[];}return r;
    });
  }
  return validateSnapshot(result);
}
export function safeCell(value:unknown){const s=String(value??'');return /^[=+\-@\t\r\n]/.test(s)?`'${s}`:s;}
export function exportCsv(rows:Record<string,unknown>[]){return Papa.unparse(rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='string'?safeCell(v):v]))));}
export function templates(s:Snapshot):CsvBundle{
  return Object.fromEntries((Object.keys(csvFields) as CsvKind[]).map(kind=>[kind,{csv:exportCsv(s[kind].map(row=>Object.fromEntries(csvFields[kind].map(field=>[field,(row as Record<string,unknown>)[field]])))),mapping:Object.fromEntries(csvFields[kind].map(f=>[f,f]))}])) as CsvBundle;
}
