import {startAI} from './AIService';
export function sendToAgentChat(options:{message?:string;context?:string}){startAI(options);}
export function AgentToggleButton(){return <button onClick={()=>startAI()} aria-label="Start AI service">AI / YOUR KEY ↗</button>;}
