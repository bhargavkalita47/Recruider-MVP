
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const ids={candidate:'00000000-0000-4000-8000-000000000001',candidate2:'00000000-0000-4000-8000-000000000002',recruiter:'00000000-0000-4000-8000-000000000003',recruiter2:'00000000-0000-4000-8000-000000000004',admin:'00000000-0000-4000-8000-000000000005',forged:'00000000-0000-4000-8000-000000000006'};
test('PostgreSQL migration, role boundaries, matching and complete hiring workflow', async t=>{
  const db=new PGlite();
  await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;");
  await db.exec(readFileSync(new URL('../supabase/migrations/001_initial.sql',import.meta.url),'utf8').replace(/^\uFEFF/,''));
  for(const [role,id] of Object.entries(ids)){
    await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)",[id,JSON.stringify({role:role.startsWith('recruiter')?'recruiter':role==='forged'?'admin':'candidate',name:role,sector:'Tech',company:role.startsWith('recruiter')?'Company '+role:''})]);
  }
  await db.query("update public.profiles set role='admin' where id=$1",[ids.admin]);
  async function asUser<T=Record<string,unknown>>(who:keyof typeof ids,sql:string,params:unknown[]=[]){
    await db.exec('begin; set local role authenticated;');
    try{
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[who]]);
      const result=await db.query<T>(sql,params);await db.exec('commit;');return result;
    }catch(e){await db.exec('rollback;');throw e;}
  }
  let job:string,job2:string,match:string,challenge:string,submission:string,badge:string;
  await t.test('signup creates real profiles and ignores forged admin metadata',async()=>{
    assert.equal((await db.query<{role:string}>('select role from profiles where id=$1',[ids.forged])).rows[0].role,'candidate');
    await assert.rejects(asUser('candidate',"update profiles set role='admin' where id=$1",[ids.candidate]),/permission denied/);
    await assert.rejects(asUser('candidate',"insert into profiles(id,role,name) values(gen_random_uuid(),'admin','Injected')"),/permission denied/);
  });
  await t.test('anonymous cannot read private data or call swipe functions',async()=>{
    await db.exec('set role anon;');
    try{
      await assert.rejects(db.query('select * from profiles'),/permission denied/);
      await assert.rejects(db.query("select record_candidate_swipe(gen_random_uuid(),'interested')"),/permission denied/);
    }finally{await db.exec('reset role;');}
  });
  await t.test('profile edits are scoped to self and candidates cannot read other candidates',async()=>{
    assert.equal((await asUser('candidate','select * from profiles where id=$1',[ids.candidate2])).rows.length,0);
    assert.equal((await asUser('candidate',"update profiles set name='Hacked' where id=$1 returning id",[ids.recruiter])).rows.length,0);
    await asUser('candidate',"update profiles set bio=$1,skills=array['PostgreSQL'] where id=$2",["<img src=x onerror=alert(1)>",ids.candidate]);
  });
  await t.test('only recruiters can post, edit and close their own jobs',async()=>{
    const input=['Database Engineer','Tech','Remote','18–26L','Build databases','Build PostgreSQL systems'];
    job=(await asUser<{id:string}>('recruiter','insert into jobs(recruiter_id,title,sector,location,pay,blurb,description) values($1,$2,$3,$4,$5,$6,$7) returning id',[ids.recruiter,...input])).rows[0].id;
    job2=(await asUser<{id:string}>('recruiter2','insert into jobs(recruiter_id,title,sector,location,pay,blurb,description) values($1,$2,$3,$4,$5,$6,$7) returning id',[ids.recruiter2,...input])).rows[0].id;
    await assert.rejects(asUser('candidate','insert into jobs(recruiter_id,title,sector,location,pay,blurb,description) values($1,$2,$3,$4,$5,$6,$7)',[ids.candidate,...input]),/row-level security/);
    assert.equal((await asUser('recruiter2',"update jobs set title='Stolen' where id=$1 returning id",[job])).rows.length,0);
    await assert.rejects(asUser('recruiter','update jobs set recruiter_id=$1 where id=$2',[ids.recruiter2,job]),/permission denied/);
  });
  await t.test('only mutual interest in the same job creates one match',async()=>{
    const first=await asUser<{result:string|null}>('candidate',"select record_candidate_swipe($1,'interested') as result",[job]);
    assert.equal(first.rows[0].result,null);
    await assert.rejects(asUser('candidate','insert into matches(candidate_id,recruiter_id,job_id) values($1,$2,$3)',[ids.candidate,ids.recruiter,job]),/permission denied/);
    await assert.rejects(asUser('recruiter2',"select record_recruiter_swipe($1,'interested',$2)",[ids.candidate,job]),/your open positions/);
    const other=await asUser<{result:string|null}>('recruiter2',"select record_recruiter_swipe($1,'interested',$2) as result",[ids.candidate,job2]);assert.equal(other.rows[0].result,null);
    match=(await asUser<{result:string}>('recruiter',"select record_recruiter_swipe($1,'interested',$2) as result",[ids.candidate,job])).rows[0].result;
    assert.ok(match);
    const repeat=await asUser<{result:string}>('candidate',"select record_candidate_swipe($1,'interested') as result",[job]);assert.equal(repeat.rows[0].result,match);
    assert.equal((await db.query('select * from matches')).rows.length,1);
    await assert.rejects(asUser('candidate',"select record_recruiter_swipe($1,'interested',$2)",[ids.candidate2,job]),/Recruiter access/);
    await assert.rejects(asUser('recruiter',"select record_candidate_swipe($1,'interested')",[job]),/Candidate access/);
  });
  await t.test('recruiter-first interest also matches correctly',async()=>{
    await asUser('recruiter',"select record_recruiter_swipe($1,'interested',$2)",[ids.candidate2,job]);
    assert.ok((await asUser<{result:string}>('candidate2',"select record_candidate_swipe($1,'interested') as result",[job])).rows[0].result);
  });
  await t.test('chat is private to the matching people; sender and time cannot be forged',async()=>{
    await asUser('candidate','insert into messages(match_id,sender_id,text) values($1,$2,$3)',[match,ids.candidate,'Hello from candidate']);
    assert.equal((await asUser('recruiter','select * from messages where match_id=$1',[match])).rows.length,1);
    for(const role of ['candidate2','recruiter2','admin'] as const)assert.equal((await asUser(role,'select * from messages where match_id=$1',[match])).rows.length,0);
    await assert.rejects(asUser('candidate2','insert into messages(match_id,sender_id,text) values($1,$2,$3)',[match,ids.candidate2,'Intruder']),/row-level security/);
    await assert.rejects(asUser('candidate','insert into messages(match_id,sender_id,text) values($1,$2,$3)',[match,ids.recruiter,'Spoof']),/row-level security/);
    await assert.rejects(asUser('candidate',"insert into messages(match_id,sender_id,text,created_at) values($1,$2,'Backdated','2020-01-01')",[match,ids.candidate]),/permission denied/);
    assert.equal((await asUser<{total:number}>('admin','select * from admin_message_counts()')).rows[0].total,1);
    assert.equal((await asUser('candidate','select * from admin_message_counts()')).rows.length,0);
  });
  await t.test('challenge submissions are unique and cannot self-review or self-award',async()=>{
    challenge=(await asUser<{id:string}>('admin',"insert into challenges(posted_by,title,sector,description) values($1,'Build a thing','Tech','Explain your solution') returning id",[ids.admin])).rows[0].id;
    submission=(await asUser<{id:string}>('candidate',"insert into submissions(challenge_id,candidate_id,text) values($1,$2,'My solution') returning id",[challenge,ids.candidate])).rows[0].id;
    await assert.rejects(asUser('candidate',"insert into submissions(challenge_id,candidate_id,text) values($1,$2,'Duplicate')",[challenge,ids.candidate]),/duplicate key/);
    assert.equal((await asUser('candidate','update submissions set reviewed=true where id=$1 returning id',[submission])).rows.length,0);
    await assert.rejects(asUser('candidate',"insert into submissions(challenge_id,candidate_id,text,reviewed) values($1,$2,'Fake review',true)",[challenge,ids.candidate2]),/permission denied/);
    badge=(await db.query<{id:string}>('select id from badges limit 1')).rows[0].id;
    await assert.rejects(asUser('candidate','insert into awards(candidate_id,badge_id,awarded_by) values($1,$2,$1)',[ids.candidate,badge]),/row-level security/);
    await asUser('admin','update submissions set reviewed=true where id=$1',[submission]);
    await asUser('admin','insert into awards(candidate_id,badge_id,awarded_by) values($1,$2,$3)',[ids.candidate,badge,ids.admin]);
    assert.equal((await asUser('candidate','select * from awards')).rows.length,1);
  });
  await t.test('archival stops submissions and deletion preserves existing work',async()=>{
    await asUser('admin','update challenges set archived=true where id=$1',[challenge]);
    await assert.rejects(asUser('candidate2',"insert into submissions(challenge_id,candidate_id,text) values($1,$2,'Late')",[challenge,ids.candidate2]),/row-level security/);
    await assert.rejects(asUser('admin','delete from challenges where id=$1',[challenge]),/foreign key/);
    assert.equal((await asUser('candidate','select * from submissions where id=$1',[submission])).rows.length,1);
    await asUser('admin','update challenges set archived=false where id=$1',[challenge]);
    await asUser('candidate2',"insert into submissions(challenge_id,candidate_id,text) values($1,$2,'Restored')",[challenge,ids.candidate2]);
    const empty=(await asUser<{id:string}>('admin',"insert into challenges(posted_by,title,sector,description) values($1,'Delete me','Tech','No submissions') returning id",[ids.admin])).rows[0].id;
    await asUser('admin','delete from challenges where id=$1',[empty]);
    assert.equal((await db.query('select * from challenges where id=$1',[empty])).rows.length,0);
  });
  await t.test('closing a job blocks new interest but retains the existing conversation',async()=>{
    await asUser('recruiter','update jobs set active=false where id=$1',[job]);
    await assert.rejects(asUser('candidate',"select record_candidate_swipe($1,'interested')",[job]),/no longer open/);
    await asUser('recruiter',"insert into messages(match_id,sender_id,text) values($1,$2,'Following up after closing')",[match,ids.recruiter]);
    assert.equal((await asUser('candidate','select * from messages where match_id=$1',[match])).rows.length,2);
  });
  await db.close();
});
