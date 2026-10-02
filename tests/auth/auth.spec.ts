import { test,expect } from '@playwright/test';
const userId='00000000-0000-4000-8000-000000000001';
const profile={id:userId,role:'candidate',name:'Real Adapter User',sector:'Tech',company:'',bio:'Portfolio through Supabase',about:'',skills:[],created_at:'2026-10-01T00:00:00.000Z'};
function token(type='access'){
  const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
  return encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:userId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,type})+'.testsignature';
}
test('real Supabase adapter: signup confirmation, login, role loading, saved profile, logout and reset email',async({page})=>{
  const requests:{path:string;method:string;body:any}[]=[];
  let saved={...profile};
  await page.route('https://recruider-test.supabase.co/**',async route=>{
    const r=route.request(),url=new URL(r.url()),body=r.postDataJSON();
    requests.push({path:url.pathname,method:r.method(),body});
    const json=(v:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)});
    if(url.pathname==='/auth/v1/signup')return json({user:{id:userId,email:body.email,identities:[],aud:'authenticated',role:'authenticated'},session:null});
    if(url.pathname==='/auth/v1/token')return json({access_token:token(),refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,user:{id:userId,email:'candidate@example.test',aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{provider:'email'}}});
    if(url.pathname==='/auth/v1/user')return json({id:userId,email:'candidate@example.test',aud:'authenticated',role:'authenticated'});
    if(url.pathname==='/auth/v1/logout'||url.pathname==='/auth/v1/recover')return json({});
    if(url.pathname==='/rest/v1/profiles'){
      if(r.method()==='PATCH'){saved={...saved,...body};return json({id:userId});}
      return json([saved]);
    }
    if(url.pathname.startsWith('/rest/v1/'))return json([]);
    return json({});
  });
  await page.goto('/');
  await expect(page.getByText('Setup required:',{exact:false})).toHaveCount(0);
  await page.getByRole('button',{name:'Find my next role',exact:false}).click();
  await page.getByLabel('Full name').fill('Real Adapter User');
  await page.getByLabel('Email',{exact:true}).fill('candidate@example.test');
  await page.getByLabel('Password',{exact:true}).fill('test-password-123');
  await page.getByText('Introduce your work',{exact:false}).click();
  await page.getByLabel('Portfolio paragraph',{exact:true}).fill('Signup paragraph');
  await page.getByRole('button',{name:'Create candidate account'}).click();
  await expect(page.getByText('Check your email to confirm your account, then log in here.')).toBeVisible();
  const signup=requests.find(r=>r.path==='/auth/v1/signup')!;
  expect(signup.body.data.role).toBe('candidate');expect(signup.body.data.bio).toBe('Signup paragraph');
  await page.getByRole('button',{name:'Log in',exact:true}).last().click();
  await expect(page.locator('.side-user .name')).toHaveText('Real Adapter User');
  await page.getByRole('button',{name:'Profile',exact:true}).click();
  await page.getByLabel('Portfolio paragraph',{exact:true}).fill('Persist through the real gateway');
  await page.getByRole('button',{name:'Save profile'}).click();
  await expect(page.getByRole('status').filter({hasText:'Profile saved.'})).toBeVisible();
  expect(saved.bio).toBe('Persist through the real gateway');
  await page.reload();await expect(page.getByLabel('Portfolio paragraph',{exact:true})).toHaveValue(saved.bio);
  await page.getByRole('button',{name:'Sign out / switch account'}).click();
  await page.getByRole('button',{name:'Admin access',exact:true}).click();
  await expect(page.getByText('Single shared admin account',{exact:false})).toHaveCount(0);
  await page.getByLabel('Email',{exact:true}).fill('candidate@example.test');
  await page.getByRole('button',{name:'Forgot password?'}).click();
  await page.getByRole('button',{name:'Send reset link'}).click();
  await expect(page.getByText('If this email has an account, a password reset link will arrive shortly.')).toBeVisible();
  expect(requests.some(r=>r.path==='/auth/v1/recover')).toBe(true);
  expect(requests.some(r=>r.path==='/auth/v1/logout')).toBe(true);
  await page.getByRole('button',{name:'← Back to log in'}).click();
  await page.getByRole('button',{name:'Resend confirmation email'}).click();
  await page.getByRole('button',{name:'Send confirmation link'}).click();
  await expect(page.getByText('If your account needs confirmation, a fresh link will arrive shortly.')).toBeVisible();
  expect(requests.some(r=>r.path==='/auth/v1/resend'&&r.body.type==='signup')).toBe(true);
});
test('expired confirmation link shows a recoverable error',async({page})=>{
  await page.goto('/#error=access_denied&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByRole('alert')).toContainText('Email link is invalid or has expired');
});


test('password recovery opens the reset form and updates through Supabase',async({page})=>{
  let updated='';
  await page.route('https://recruider-test.supabase.co/**',async route=>{
    const r=route.request(),url=new URL(r.url());
    const json=(data:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/auth/v1/user'){
      if(r.method()==='PUT')updated=r.postDataJSON().password;
      return json({id:userId,email:'candidate@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}});
    }
    if(url.pathname==='/rest/v1/profiles')return json([profile]);
    return json([]);
  });
  await page.goto('/?recovery=1#access_token='+token()+'&refresh_token=test-refresh&token_type=bearer&expires_in=3600&type=recovery');
  await expect(page.getByRole('heading',{name:'Set a new password'})).toBeVisible();
  await page.getByLabel('New password',{exact:true}).fill('new-test-password-456');
  await page.getByLabel('Confirm password',{exact:true}).fill('different-password');
  await page.getByRole('button',{name:'Save password'}).click();
  await expect(page.getByRole('alert')).toContainText('Passwords do not match');
  await page.getByLabel('Confirm password',{exact:true}).fill('new-test-password-456');
  await page.getByRole('button',{name:'Save password'}).click();
  await expect(page.getByRole('status').filter({hasText:'Password updated.'})).toBeVisible();
  expect(updated).toBe('new-test-password-456');
});

