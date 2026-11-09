import { Link } from 'react-router';
export function sendToAgentChat(_options:unknown){window.location.hash='/settings/model';}
export function AgentToggleButton(){return <Link to="/settings/model" aria-label="Agent connection information">Agent setup ↗</Link>;}
