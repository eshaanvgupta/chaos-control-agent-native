import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'};
const git=(args,options={})=>execFileSync('git',args,{encoding:'utf8',env,stdio:['pipe','pipe','pipe'],...options}).trim();
let credential;try{credential=git(['credential','fill'],{input:'protocol=https\nhost=github.com\nusername=eshaanvgupta\n\n'});}catch{throw new Error('Existing GitHub authorization is required. No token has been written to disk.');}
const token=credential.split('\n').find(l=>l.startsWith('password='))?.slice(9);if(!token)throw new Error('GitHub authorization unavailable.');
const full='eshaanvgupta/chaos-control-agent-native';
async function request(endpoint,method='GET',body){const response=await fetch(`https://api.github.com${endpoint}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});let data;try{data=await response.json();}catch{data={};}return {status:response.status,data};}
const owner=await request('/user');if(owner.status!==200||owner.data.login!=='eshaanvgupta')throw new Error('Authorization does not match the intended GitHub owner.');
if(process.argv.includes('--status')){
  const [pages,build]=await Promise.all([request(`/repos/${full}/pages`),request(`/repos/${full}/pages/builds/latest`)]);
  console.log(JSON.stringify({pagesStatus:pages.status,url:pages.data.html_url,source:pages.data.source,buildStatus:build.data.status,buildCommit:build.data.commit,error:build.data.error?.message}));process.exit(0);
}
const directory=path.resolve('dist-pages');if(!fs.existsSync(path.join(directory,'index.html')))throw new Error('Run pnpm build:pages before publishing.');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'chaos-control-pages-'));
fs.cpSync(directory,temporary,{recursive:true});fs.writeFileSync(path.join(temporary,'.nojekyll'),'');
const run=args=>git(args,{cwd:temporary});run(['init','-b','gh-pages']);run(['config','user.name','eshaanvgupta']);run(['config','user.email','163881203+eshaanvgupta@users.noreply.github.com']);run(['remote','add','origin',`https://github.com/${full}.git`]);
const existing=git(['ls-remote',`https://github.com/${full}.git`,'refs/heads/gh-pages']).split(/\s/)[0];
if(existing){run(['fetch','--depth','1','origin','gh-pages']);run(['update-ref','refs/heads/gh-pages',existing]);}
run(['add','-A']);run(['commit','-m','Deploy playable browser demo to GitHub Pages']);run(['push','-u','origin','gh-pages']);
const commit=run(['rev-parse','HEAD']),remote=run(['ls-remote','origin','refs/heads/gh-pages']).split(/\s/)[0];if(commit!==remote)throw new Error('Pages source push verification failed.');
const current=await request(`/repos/${full}/pages`);
const configured=await request(`/repos/${full}/pages`,current.status===404?'POST':'PUT',{build_type:'legacy',source:{branch:'gh-pages',path:'/'}});
if(![200,201,204].includes(configured.status))throw new Error(`Pages configuration failed (${configured.status}): ${configured.data.message}`);
const site=await request(`/repos/${full}/pages`);if(site.status!==200)throw new Error('Unable to confirm Pages configuration.');
console.log(JSON.stringify({sourceCommit:commit,verifiedRemoteCommit:remote,url:site.data.html_url,status:site.data.status,source:site.data.source}));
