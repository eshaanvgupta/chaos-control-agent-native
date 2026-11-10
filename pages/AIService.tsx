import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {availableModels,connect,disconnect,sessionInfo,providers,analyze,type Provider} from './session-ai';
import {browserAction} from './store';

type Intent={message?:string;context?:string;after?:()=>void};
const eventName='chaos:start-ai';
export function startAI(intent:Intent={}){window.dispatchEvent(new CustomEvent(eventName,{detail:intent}));}
export function AIService(){
  const [setup,setSetup]=useState(false),[panel,setPanel]=useState(false),[info,setInfo]=useState(sessionInfo),[provider,setProvider]=useState<Provider>('openrouter'),[key,setKey]=useState(''),[models,setModels]=useState<string[]>([]),[model,setModel]=useState(''),[checking,setChecking]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[draft,setDraft]=useState(''),[answer,setAnswer]=useState(''),[question,setQuestion]=useState('');
  const intent=useRef<Intent>({}),request=useRef<AbortController|null>(null),checkRequest=useRef<AbortController|null>(null),qc=useQueryClient();
  const ready=useRef(info);ready.current=info;
  useEffect(()=>{
    const handler=(event:Event)=>{intent.current=(event as CustomEvent<Intent>).detail??{};setError('');if(ready.current){setPanel(true);if(intent.current.message)setDraft(intent.current.message);intent.current.after?.();intent.current={};}else setSetup(true);};
    const clear=()=>{disconnect();setKey('');setInfo(null);setAnswer('');setDraft('');};
    window.addEventListener(eventName,handler);window.addEventListener('pagehide',clear);
    return()=>{window.removeEventListener(eventName,handler);window.removeEventListener('pagehide',clear);checkRequest.current?.abort();request.current?.abort();disconnect();};
  },[]);
  function resetFields(){checkRequest.current?.abort();setChecking(false);setModels([]);setModel('');setError('');}
  function closeSetup(){checkRequest.current?.abort();setChecking(false);setSetup(false);setKey('');setModels([]);setModel('');setError('');intent.current={};}
  async function verify(e:FormEvent){e.preventDefault();setChecking(true);setError('');const controller=new AbortController();checkRequest.current=controller;try{const list=await availableModels(provider,key,controller.signal);if(controller.signal.aborted)return;setModels(list);setModel('');}catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(checkRequest.current===controller)setChecking(false);}}
  function begin(){try{connect(provider,key,model);setInfo(sessionInfo());setKey('');setSetup(false);setModels([]);setPanel(true);setError('');if(intent.current.message)setDraft(intent.current.message);intent.current.after?.();intent.current={};}catch(e){setError((e as Error).message);}}
  function skip(){const after=intent.current.after;closeSetup();after?.();}
  function end(){request.current?.abort();disconnect();setInfo(null);setPanel(false);setAnswer('');setDraft('');setQuestion('');setError('');setBusy(false);}
  async function send(e:FormEvent){
    e.preventDefault();if(!draft.trim()||busy)return;setBusy(true);setError('');setAnswer('');setQuestion(draft);const controller=new AbortController();request.current=controller;
    try{
      const query=new URLSearchParams(window.location.hash.split('?')[1]??''),id=query.get('id');
      if(!id)throw new Error('Open a mission first so the analyst has simulation records to inspect.');
      const state=await browserAction('get-operational-state',{id});
      const context={workspace:state.workspace,risks:state.risks,plans:state.plans.slice(0,6),branches:state.branches.slice(0,6)};
      const result=await analyze(draft,context,controller.signal);if(!controller.signal.aborted){setAnswer(result);setDraft('');await qc.invalidateQueries({queryKey:['browser-action']});}
    }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(request.current===controller)setBusy(false);}
  }
  return <>
    <button className="ai-launch" onClick={()=>startAI()}>{info?'AI CONNECTED · OPEN ANALYST':'START AI SERVICE · USE YOUR KEY'}</button>
    <Dialog open={setup} onOpenChange={open=>{if(!open)closeSetup();}}><DialogContent className="cc cc-dialog ai-setup">
      <DialogTitle>Bring your own API key.</DialogTitle><DialogDescription>Choose your provider to start the AI service. Your provider bills your account directly; its pricing and rate limits apply.</DialogDescription>
      <div className="ai-privacy"><strong>We do not store or save any API keys.</strong><p>Your key stays only in this tab’s memory and is sent directly to your selected provider over HTTPS. It is never saved to our servers, browser storage, analytics, or project files. Refresh, close this tab, or disconnect to clear it.</p></div>
      <form onSubmit={verify} className="ai-form">
        <label>Provider<select aria-label="AI provider" value={provider} disabled={checking} onChange={e=>{resetFields();setKey('');setProvider(e.target.value as Provider);}}>{Object.entries(providers).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label>
        <label>API key<input autoFocus type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" aria-label="Provider API key" placeholder="Paste your own API key" value={key} disabled={checking} onChange={e=>{resetFields();setKey(e.target.value);}}/></label>
        <a className="ai-key-link" href={providers[provider].keys} target="_blank" rel="noreferrer">Get a {providers[provider].label} API key ↗</a>
        {!models.length&&<button className="cc-button primary" disabled={!key.trim()||checking} type="submit">{checking?'VERIFYING WITH PROVIDER…':'VERIFY KEY & LOAD MODELS'}</button>}
        {!!models.length&&<><label>Model<select aria-label="AI model" value={model} onChange={e=>setModel(e.target.value)}><option value="">Choose a model — provider pricing applies</option>{models.map(m=><option key={m} value={m}>{m}</option>)}</select></label><button className="cc-button primary" disabled={!model} type="button" onClick={begin}>START AI SERVICE</button></>}
      </form>
      {error&&<p role="alert" className="ai-error">{error}</p>}
      <p className="ai-disclosure">When you ask for analysis, the current mission records and your question are sent to that provider. Its data policies apply. The browser analyst explains your simulation; execution still needs your review in Strategy Lab.</p>
      <div className="report-actions"><button className="cc-button" onClick={skip}>CONTINUE WITHOUT AI</button><Link to="/settings/model" onClick={closeSetup}>Use local Ollama instead ↗</Link></div>
    </DialogContent></Dialog>
    <Dialog open={panel} onOpenChange={setPanel}><DialogContent className="cc cc-dialog ai-panel">
      <DialogTitle>Operations analyst</DialogTitle><DialogDescription>{info?`${providers[info.provider].label} · ${info.model} · Session only`:'Start the AI service to connect.'}</DialogDescription>
      <p className="ai-disclosure">Current mission data goes directly to your provider. This analyst is read-only. Numerical plans and human approvals remain in the command center.</p>
      {question&&<div className="ai-question">{question}</div>}{busy&&<p role="status">Analyzing your current simulation…</p>}{answer&&<div className="ai-answer" aria-live="polite">{answer}</div>}{error&&<p role="alert" className="ai-error">{error}</p>}
      <form onSubmit={send} className="ai-form"><label>Ask about this mission<textarea aria-label="Ask the operations analyst" value={draft} maxLength={4000} onChange={e=>setDraft(e.target.value)} placeholder="Which orders are most at risk, and why?" rows={3}/></label><div className="report-actions"><button type="submit" className="cc-button primary" disabled={busy||!draft.trim()||!info}>ANALYZE MISSION</button>{busy&&<button type="button" className="cc-button" onClick={()=>{request.current?.abort();setBusy(false);}}>STOP</button>}<button type="button" className="cc-button" onClick={end}>DISCONNECT & CLEAR KEY</button></div></form>
      <p className="ai-disclosure">We do not store or save any API keys. Refresh or disconnect clears this session.</p>
    </DialogContent></Dialog>
  </>;
}
