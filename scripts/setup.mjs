import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { existsSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const target=fileURLToPath(new URL('../.env.local',import.meta.url));
const prompt=createInterface({input:stdin,output:stdout});
try {
  console.log('Connect Recruider to Supabase. Enter public project values only.');
  if(existsSync(target)){
    const answer=await prompt.question('Replace the existing .env.local? (y/N) ');
    if(answer.trim().toLowerCase()!=='y')process.exit(0);
  }
  const url=(await prompt.question('Supabase project URL: ')).trim().replace(/\/$/,'');
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))throw new Error('Use the hosted project URL, such as https://abcdefgh.supabase.co.');
  const key=(await prompt.question('Supabase publishable key: ')).trim();
  let allowed=/^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if(key.startsWith('eyJ')){
    try{allowed=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';}catch{allowed=false;}
  }
  if(!allowed)throw new Error('Use a publishable key or legacy anon key. Never use a service-role or secret key.');
  writeFileSync(target,'VITE_SUPABASE_URL='+url+'\nVITE_SUPABASE_PUBLISHABLE_KEY='+key+'\n',{mode:0o600});
  console.log('Saved .env.local. Run npm run dev. For Vercel, add these same two values in project Environment Variables.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{prompt.close();}

