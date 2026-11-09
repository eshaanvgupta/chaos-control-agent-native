import {execFileSync} from 'node:child_process';
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'};
const git=(args,extra={})=>execFileSync('git',args,{encoding:'utf8',env,stdio:['pipe','pipe','pipe'],...extra}).trim();
let credential;
try{credential=git(['credential','fill'],{input:'protocol=https\nhost=github.com\nusername=eshaanvgupta\n\n'});}catch{throw new Error('Git Credential Manager has no noninteractive GitHub authorization. Run gh auth login locally, then gh repo create chaos-control-agent-native --public --source . --push.');}
const token=credential.split('\n').find(l=>l.startsWith('password='))?.slice(9);
if(!token)throw new Error('GitHub credential unavailable.');
const request=async(path,method='GET',body)=>{
  const response=await fetch(`https://api.github.com${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:await response.json()};
};
const profile=await request('/user');if(profile.status!==200||profile.data.login!=='eshaanvgupta')throw new Error('Credential owner does not match the authorized GitHub owner.');
const full='eshaanvgupta/chaos-control-agent-native';let repo=await request(`/repos/${full}`);
if(repo.status===404)repo=await request('/user/repos','POST',{name:'chaos-control-agent-native',description:'CHAOS//CONTROL — playable operations intelligence built with Agent-Native. Deterministic recovery planning, isolated futures, human approval.',private:false,auto_init:false});
if(![200,201].includes(repo.status))throw new Error(`GitHub repository creation failed (${repo.status}): ${repo.data.message}`);
if(process.argv.includes('--create-only')){console.log(JSON.stringify({owner:profile.data.login,url:repo.data.html_url,created:repo.status===201}));process.exit(0);}
try{git(['rev-parse','--git-dir']);}catch{git(['init','-b','main']);}
let remote;try{remote=git(['remote','get-url','origin']);}catch{git(['remote','add','origin',repo.data.clone_url]);remote=repo.data.clone_url;}
if(remote!==repo.data.clone_url)throw new Error('Existing origin differs from the authorized repository.');
git(['push','-u','origin','main']);
const local=git(['rev-parse','HEAD']),remoteHead=git(['ls-remote','origin','refs/heads/main']).split(/\s/)[0];
if(local!==remoteHead)throw new Error('Remote commit verification failed.');
console.log(JSON.stringify({url:repo.data.html_url,commit:local,remoteCommit:remoteHead,verified:true}));
