import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd=fileURLToPath(new URL('..',import.meta.url));
const env={...process.env,VITE_SUPABASE_URL:'https://recruider-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test-only-key'};
for(const args of [
  ['node_modules/vite/bin/vite.js','build','--configLoader','native','--outDir','auth-test-dist'],
  ['node_modules/@playwright/test/cli.js','test','--config','tests/auth.config.ts']
]){
  const result=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}

