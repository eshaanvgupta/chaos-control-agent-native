import { createRoot } from 'react-dom/client';
import { useEffect,type MouseEvent,type FormEvent } from 'react';
import { HashRouter,Routes,Route,Link,useNavigate,useLocation } from 'react-router';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Landing from '../app/routes/_index';
import Control from '../app/routes/control';
import { browserAction } from './store';
import {AIService,startAI} from './AIService';
import '../app/chaos.css';
import './pages.css';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:true}}});
function App(){
  const navigate=useNavigate(),location=useLocation();
  useEffect(()=>{const handler=()=>queryClient.invalidateQueries();window.addEventListener('focus',handler);return()=>window.removeEventListener('focus',handler);},[]);
  function click(e:MouseEvent){const anchor=(e.target as Element).closest('a');if(!anchor||e.ctrlKey||e.metaKey||e.shiftKey||anchor.target==='_blank')return;const href=anchor.getAttribute('href')??'';
    if(href==='#how'||href==='#missions'){e.preventDefault();e.stopPropagation();document.getElementById(href.slice(1))?.scrollIntoView({behavior:'smooth'});}
    else if(href.startsWith('/')&&!href.startsWith('//')){e.preventDefault();e.stopPropagation();navigate(href);}
  }
  async function submit(e:FormEvent){const form=e.target as HTMLFormElement,url=new URL(form.action);if(url.pathname!=='/guest/start')return;e.preventDefault();
    startAI({after:()=>{void(async()=>{if(url.searchParams.has('mission')){const w=await browserAction('create-workspace',{mission:url.searchParams.get('mission')});await queryClient.invalidateQueries();navigate(`/control?id=${w.id}`);}else navigate(url.searchParams.get('view')==='data'?'/control?view=data':'/control');})().catch(()=>{});}});
  }
  return <div className="pages-demo" onClickCapture={click} onSubmitCapture={submit}>
    <div className="pages-mode"><span>BROWSER DEMO · DATA SAVED ON THIS DEVICE</span><Link to="/settings/model">Native agent & server setup ↗</Link></div>
    <Routes><Route path="/" element={<Landing/>}/><Route path="/control" element={<Control/>}/><Route path="/home" element={<Control/>}/><Route path="/settings/*" element={<Setup/>}/><Route path="*" element={<Setup/>}/></Routes>
    <AIService/><Toaster theme="dark" richColors position="bottom-right"/>
  </div>;
}
function Setup(){return <main className="cc pages-setup"><Link className="brand" to="/">CHAOS//CONTROL</Link><div className="overline">OLLAMA / FREE LOCAL INFERENCE</div><h1>Your local model.<br/><em>Your operations strategist.</em></h1><p>Ollama is integrated through the full app’s native Agent-Native model runtime. It runs a tool-capable model on your computer without a paid provider API key. The connection, model picker, tool calls and human approvals use the existing native framework.</p><div className="report-actions"><a className="cc-button primary" href="http://localhost:8080/settings/app/ollama" target="_blank" rel="noreferrer">OPEN LOCAL OLLAMA SETUP ↗</a><Link className="cc-button" to="/control">ENTER BROWSER COMMAND CENTER →</Link><a className="cc-button" href="https://github.com/eshaanvgupta/chaos-control-agent-native" target="_blank" rel="noreferrer">FULL SOURCE & SETUP ↗</a></div><h2>Use your own API key</h2><p>The public site offers a read-only operations analyst using your OpenRouter or Groq key. Click Start AI Service, verify your key, choose a model, then open a mission and request analysis. We do not store or save any API keys in this browser flow. Your key stays in tab memory and clears on refresh or disconnect. Questions and mission records go directly to your provider; its pricing, limits and data policies apply.</p><button className="cc-button primary" onClick={()=>startAI()}>START AI SERVICE · USE YOUR KEY</button><h2>Install and launch Ollama locally</h2><pre>git clone https://github.com/eshaanvgupta/chaos-control-agent-native.git{'\n'}cd chaos-control-agent-native{'\n'}corepack enable{'\n'}pnpm install --frozen-lockfile{'\n'}pnpm ollama:setup{'\n'}pnpm dev:ollama</pre><p>The setup helper checks for Ollama, starts a loopback service, and installs qwen3:1.7b. On Windows it can download the official portable runtime into ignored project storage; on macOS or Linux, install Ollama first. Model weights require a separate download. If Ollama is already installed, it is reused.</p><h2>Check or choose a model</h2><pre>pnpm ollama:doctor{'\n'}pnpm ollama:pull -- --model qwen3:1.7b{'\n'}pnpm dev:ollama -- --model qwen3:1.7b</pre><p>In the local app, open Workspace settings → Local Ollama to check the connection and list installed models. Use the native provider dialog to save an endpoint and choose chat models. The model must support tools for native agent investigation and planning. Native provider settings can save credentials; the public browser popup uses memory only.</p><h2>What runs on this public site?</h2><p>This public demo runs the same deterministic operations engine and interface. Workspaces, imported records, plans, approvals, branches and reports persist in this browser’s IndexedDB. They are separate from the full local app’s database.</p><p>GitHub Pages does not run Ollama, the Node backend, shared PostgreSQL, authentication, or the native model runtime. The browser AI analyst connects directly to your selected provider with your own key. There are no shared user accounts. The local setup button opens your own computer’s app; it works after pnpm dev:ollama is running.</p></main>;}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><HashRouter><App/></HashRouter></QueryClientProvider>);
