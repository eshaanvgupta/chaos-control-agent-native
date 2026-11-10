import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {Readable,Transform} from 'node:stream';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=path.join(root,'.runtime','ollama');
export const DEFAULT_MODEL='qwen3:1.7b';
export function argumentsFor(argv){
  const mode=argv[0]??'doctor',at=argv.indexOf('--model'),model=at<0?DEFAULT_MODEL:argv[at+1];
  if(!['doctor','setup','dev','pull','serve'].includes(mode))throw new Error('Use doctor, setup, dev, pull, or serve.');
  if(!model||! /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,120}$/.test(model))throw new Error('Provide a valid Ollama model tag with --model.');
  return {mode,model};
}
export function endpointFor(value='http://127.0.0.1:11434'){
  const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('Ollama endpoint must be an HTTP(S) origin without credentials, query, or fragment.');
  if(url.pathname!=='/')throw new Error('Use the Ollama origin, without /api or /v1.');return url.origin;
}
export async function probeOllama(endpoint,model,fetcher=fetch){
  let response;try{response=await fetcher(`${endpoint}/api/tags`,{signal:AbortSignal.timeout(4000)});}catch{return {ok:false,status:'unreachable',endpoint,model,models:[],message:'Ollama is not reachable. Run pnpm ollama:setup or start ollama serve.'};}
  if(!response.ok)return {ok:false,status:'provider-error',endpoint,model,models:[],message:`Ollama returned HTTP ${response.status}.`};
  let payload;try{payload=await response.json();}catch{return {ok:false,status:'invalid-response',endpoint,model,models:[],message:'The endpoint did not return Ollama model metadata.'};}
  if(!Array.isArray(payload.models))return {ok:false,status:'invalid-response',endpoint,model,models:[],message:'The endpoint is missing its models list.'};
  const models=payload.models.map(p=>p.name).filter(n=>typeof n==='string');
  if(!models.includes(model))return {ok:false,status:'model-missing',endpoint,model,models,message:`Model ${model} is not installed. Run pnpm ollama:pull -- --model ${model}.`};
  try{const detail=await fetcher(`${endpoint}/api/show`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model}),signal:AbortSignal.timeout(5000)});const metadata=detail.ok?await detail.json():null;const capabilities=Array.isArray(metadata?.capabilities)?metadata.capabilities:[];
    return {ok:capabilities.includes('tools'),status:capabilities.includes('tools')?'ready':'tool-support-unverified',endpoint,model,models,capabilities,message:capabilities.includes('tools')?'Ollama and the tool-capable model are ready.':'The installed model does not report tool capability. Select a tool-capable model in native Model settings.'};
  }catch{return {ok:false,status:'model-check-failed',endpoint,model,models,message:'Could not verify model tool support. Retry after Ollama finishes loading.'};}
}
function executable(){
  const local=path.join(runtime,process.platform==='win32'?'ollama.exe':'ollama');if(fs.existsSync(local))return local;
  const found=spawnSync(process.platform==='win32'?'where.exe':'which',['ollama'],{encoding:'utf8',windowsHide:true});return found.status===0?found.stdout.trim().split(/\r?\n/)[0]:null;
}
async function installPortable(){
  if(executable())return;
  if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Install Ollama from https://ollama.com/download for your operating system, then rerun pnpm ollama:setup.');
  const releaseResponse=await fetch('https://api.github.com/repos/ollama/ollama/releases/latest');if(!releaseResponse.ok)throw new Error(`Ollama release lookup failed: HTTP ${releaseResponse.status}`);
  const release=await releaseResponse.json(),asset=release.assets.find(a=>a.name==='ollama-windows-amd64.zip');if(!asset)throw new Error('The official Windows archive is unavailable. Install from https://ollama.com/download/windows.');
  fs.mkdirSync(runtime,{recursive:true});const archive=path.join(runtime,'runtime.zip'),partial=archive+'.partial';
  console.log(`Downloading official Ollama ${release.tag_name}: ${(asset.size/1e9).toFixed(2)} GB. Model weights are a separate download.`);
  if(!fs.existsSync(archive)){
    const response=await fetch(asset.browser_download_url);if(!response.ok||!response.body)throw new Error(`Ollama download failed: HTTP ${response.status}. Install from https://ollama.com/download/windows, then rerun.`);
    const hash=createHash('sha256');let bytes=0,last=0;
    await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,encoding,next){hash.update(chunk);bytes+=chunk.length;if(bytes-last>100_000_000){last=bytes;console.log(`Downloaded ${(bytes/1e9).toFixed(2)} / ${(asset.size/1e9).toFixed(2)} GB`);}next(null,chunk);}}),fs.createWriteStream(partial));
    if(bytes!==asset.size)throw new Error('The Ollama archive download is incomplete. Retry setup.');
    const digest=hash.digest('hex');if(asset.digest?.startsWith('sha256:')&&digest!==asset.digest.slice(7))throw new Error('Official archive checksum did not match. Installation stopped.');fs.renameSync(partial,archive);
  }
  const target=runtime.replaceAll("'","''"),source=archive.replaceAll("'","''");
  const extracted=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${source}' -DestinationPath '${target}' -Force`],{stdio:'inherit',windowsHide:true});if(extracted.status!==0||!executable())throw new Error('Portable Ollama extraction failed. Install the official application, then retry.');
  console.log('Ollama installed inside this project’s ignored .runtime directory.');
}
async function ensureServer(endpoint,install=false){
  try{if((await fetch(`${endpoint}/api/version`,{signal:AbortSignal.timeout(1200)})).ok)return;}catch{}
  const url=new URL(endpoint);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Start the configured remote Ollama service yourself; this helper only starts a loopback server.');
  if(install)await installPortable();const binary=executable();if(!binary)throw new Error('Ollama is not installed. Run pnpm ollama:setup, or install https://ollama.com/download and retry.');
  fs.mkdirSync(path.join(root,'.runtime','models'),{recursive:true});
  const log=fs.openSync(path.join(root,'.runtime','ollama-server.log'),'a');
  const child=spawn(binary,['serve'],{cwd:root,env:{...process.env,OLLAMA_HOST:url.host,OLLAMA_MODELS:path.join(root,'.runtime','models'),OLLAMA_CONTEXT_LENGTH:'32768',OLLAMA_NUM_PARALLEL:'1'},stdio:['ignore',log,log],detached:true,windowsHide:true});child.unref();fs.closeSync(log);
  for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,500));try{if((await fetch(`${endpoint}/api/version`,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}}
  throw new Error('Ollama did not become ready. Inspect .runtime/ollama-server.log.');
}
async function pull(endpoint,model){
  console.log(`Installing ${model} from the Ollama registry. This downloads model weights; no paid API key is used.`);
  const response=await fetch(`${endpoint}/api/pull`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,stream:true})});if(!response.ok||!response.body)throw new Error(`Model download failed: HTTP ${response.status}`);
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',last='';
  for(;;){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});const lines=pending.split('\n');pending=lines.pop()??'';for(const line of lines.filter(Boolean)){const progress=JSON.parse(line);if(progress.error)throw new Error(progress.error);const status=progress.total?`${progress.status}: ${Math.floor(100*(progress.completed??0)/progress.total/10)*10}%`:progress.status;if(status!==last){console.log(status);last=status;}}}
}
export async function main(argv=process.argv.slice(2)){
  const {mode,model}=argumentsFor(argv),endpointAt=argv.indexOf('--endpoint'),endpoint=endpointFor(endpointAt<0?undefined:argv[endpointAt+1]);
  if(mode==='doctor'){const status=await probeOllama(endpoint,model);console.log(JSON.stringify(status,null,2));if(!status.ok)process.exitCode=1;return;}
  await ensureServer(endpoint,mode==='setup');
  if(mode==='serve'){console.log(`Ollama is listening at ${endpoint}`);return;}
  let status=await probeOllama(endpoint,model);if(['setup','pull'].includes(mode)&&status.status==='model-missing'){await pull(endpoint,model);status=await probeOllama(endpoint,model);}
  if(!status.ok)throw new Error(status.message);
  console.log(`Verified ${model} with tool support at ${endpoint}.`);
  if(mode!=='dev'){console.log('Start the native agent app with pnpm dev:ollama.');return;}
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'node_modules','@agent-native','core','package.json'),'utf8')),entry=path.join(root,'node_modules','@agent-native','core',typeof pkg.bin==='string'?pkg.bin:pkg.bin['agent-native']);
  const child=spawn(process.execPath,[entry,'dev','--port','8080'],{cwd:root,env:{...process.env,AGENT_ENGINE:'ai-sdk:ollama',AGENT_MODEL:model,OLLAMA_BASE_URL:endpoint},stdio:'inherit',windowsHide:true});child.on('exit',code=>{process.exitCode=code??1;});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(`Ollama setup: ${error.message}`);process.exitCode=1;});
