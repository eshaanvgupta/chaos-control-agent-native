import {useState} from 'react';
import {Link} from 'react-router';
import {useActionMutation,useActionQuery} from '@agent-native/core/client/hooks';
import {ProviderDialog} from '@agent-native/toolkit/app/settings';
import {Button} from '@/components/ui/button';
import {IconCheck,IconMessage,IconPlugConnected,IconRefresh,IconExternalLink} from '@tabler/icons-react';
import {toast} from 'sonner';
export function OllamaSetup(){
  const [open,setOpen]=useState(false),providers=useActionQuery('list-model-providers',{}),check=useActionMutation('check-provider-key');
  const ollama=providers.data?.providers.find(p=>p.provider==='ollama'),connected=!!(ollama?.personal||ollama?.org||ollama?.deploymentConfigured);
  return <div className="cc padded" style={{borderRadius:8,maxWidth:900,margin:'24px auto'}}>
    <div className="overline">OLLAMA / LOCAL MODEL CONNECTION</div><h2>Run your strategist locally.</h2><p>Use the native Agent-Native model runtime with an installed tool-capable Ollama model. Inference runs on the machine hosting this app, with no paid provider key.</p>
    <div className="report-actions"><Button className="cc-button primary" onClick={()=>setOpen(true)}><IconPlugConnected size={17}/>{connected?'MANAGE OLLAMA CONNECTION':'CONNECT OLLAMA'}</Button><Button className="cc-button" disabled={check.isPending} onClick={()=>check.mutateAsync({provider:'ollama'}).catch(error=>toast.error(error instanceof Error?error.message:'Connection check failed.'))}><IconRefresh size={17}/>{check.isPending?'CHECKING…':'CHECK CONNECTION & LIST MODELS'}</Button><Link className="cc-button" to="/settings/model">NATIVE MODEL SETTINGS <IconExternalLink size={16}/></Link></div>
    {check.data&&<section className="panel padded" role="status"><h3>{check.data.ok?'Ollama is reachable':"Ollama needs attention"}</h3><p>{check.data.ok?`${check.data.models.length} installed model(s) found. Choose one in the native provider dialog, then select it in the chat model picker.`:check.data.reason}</p>{check.data.ok&&<div className="mini-table">{check.data.models.map(model=><div key={model}><span>{model}</span><IconCheck size={15}/></div>)}</div>}</section>}
    <h3 style={{marginTop:28}}>One-command setup</h3><pre style={{background:'#0b141b',padding:20,borderRadius:6,overflowX:'auto',lineHeight:2,fontSize:12}}>pnpm ollama:setup{'\n'}pnpm dev:ollama</pre><p>The Windows setup helper downloads the official portable Ollama runtime if missing, starts it on loopback, and installs qwen3:1.7b. Runtime and model weights are separate downloads and remain in ignored .runtime storage. Existing Ollama installations are reused. On macOS or Linux, install Ollama first.</p>
    <h3 style={{marginTop:25}}>Already installed?</h3><pre style={{background:'#0b141b',padding:20,borderRadius:6,overflowX:'auto',lineHeight:2,fontSize:12}}>ollama serve{'\n'}ollama pull qwen3:1.7b{'\n'}pnpm ollama:doctor{'\n'}pnpm dev:ollama</pre><p>Choose another installed tool-capable model with <code>pnpm dev:ollama -- --model your-model:tag</code>. The connection and model picker use the framework’s existing settings and scoped storage.</p>
    <div className="method-note"><IconMessage size={20}/><p>After connection, select a warehouse and ask the native agent to inspect it. Numerical tools remain deterministic, and the human approval gate still applies. GitHub Pages cannot run Ollama: start this full local app to use live model conversation.</p></div>
    <ProviderDialog open={open} onOpenChange={setOpen} mode={ollama?.personal?'manage':'add'} provider="ollama" providers={['ollama']} scope="user" onSaved={()=>{setOpen(false);providers.refetch();toast.success('Ollama connection saved in native settings. Select the installed model in your chat model picker.');}}/>
  </div>;
}
