import { createRoot } from 'react-dom/client';
import { useEffect,type MouseEvent,type FormEvent } from 'react';
import { HashRouter,Routes,Route,Link,useNavigate,useLocation } from 'react-router';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Landing from '../app/routes/_index';
import Control from '../app/routes/control';
import { browserAction } from './store';
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
    if(url.searchParams.has('mission')){const w=await browserAction('create-workspace',{mission:url.searchParams.get('mission')});await queryClient.invalidateQueries();navigate(`/control?id=${w.id}`);}
    else navigate(url.searchParams.get('view')==='data'?'/control?view=data':'/control');
  }
  return <div className="pages-demo" onClickCapture={click} onSubmitCapture={submit}>
    <div className="pages-mode"><span>BROWSER DEMO · DATA SAVED ON THIS DEVICE</span><Link to="/settings/model">Native agent & server setup ↗</Link></div>
    <Routes><Route path="/" element={<Landing/>}/><Route path="/control" element={<Control/>}/><Route path="/home" element={<Control/>}/><Route path="/settings/*" element={<Setup/>}/><Route path="*" element={<Setup/>}/></Routes>
    <Toaster theme="dark" richColors position="bottom-right"/>
  </div>;
}
function Setup(){return <main className="cc pages-setup"><Link className="brand" to="/">CHAOS//CONTROL</Link><div className="overline">GITHUB PAGES / BROWSER EDITION</div><h1>The simulation is local.<br/><em>The full app goes further.</em></h1><p>This public demo runs the same deterministic operations engine and interface as the full application. Workspaces, imported records, plans, approvals, branches and reports persist in this browser’s IndexedDB. Clearing site storage removes them; export reports to keep a copy.</p><p>GitHub Pages does not run the Node backend, shared PostgreSQL, account authentication, or Agent-Native model runtime. This browser demo has no live language model and no shared user accounts. Agent buttons open this setup guide rather than generating fabricated answers.</p><div className="report-actions"><Link className="cc-button primary" to="/control">ENTER BROWSER COMMAND CENTER →</Link><a className="cc-button" href="https://github.com/eshaanvgupta/chaos-control-agent-native" target="_blank" rel="noreferrer">FULL SOURCE & SETUP ↗</a></div><h2>Run the full Agent-Native app</h2><pre>git clone https://github.com/eshaanvgupta/chaos-control-agent-native.git{'\n'}cd chaos-control-agent-native{'\n'}corepack enable{'\n'}pnpm install --frozen-lockfile{'\n'}pnpm dev</pre><p>Open the local URL, then connect Builder.io or optional local Ollama in the native Model settings. Operational tools work without a paid model key. Hosted shared workspaces require persistent PostgreSQL and the documented server deployment.</p></main>;}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><HashRouter><App/></HashRouter></QueryClientProvider>);
