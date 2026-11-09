import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root:directory,base:'/chaos-control-agent-native/',publicDir:path.resolve(directory,'../public'),
  resolve:{alias:[
    {find:'@agent-native/core/client/hooks',replacement:path.join(directory,'hooks.ts')},
    {find:'@agent-native/core/client/agent-chat',replacement:path.join(directory,'agent.tsx')},
    {find:'@agent-native/toolkit/app/chat',replacement:path.join(directory,'agent.tsx')},
    {find:'@/components/ui/button',replacement:path.join(directory,'ui.tsx')},
    {find:'@/components/ui/dialog',replacement:path.join(directory,'ui.tsx')},
    {find:'@',replacement:path.resolve(directory,'../app')},
  ]},
  optimizeDeps:{include:['papaparse']},
  build:{outDir:path.resolve(directory,'../dist-pages'),emptyOutDir:true},
  server:{host:'127.0.0.1',port:4173},preview:{host:'127.0.0.1',port:4173},
});
