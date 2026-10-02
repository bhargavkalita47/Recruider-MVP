-- Recruider: run once in a NEW Supabase project's SQL Editor.
-- All private data requires an authenticated session. Emails stay in auth.users.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('candidate','recruiter','admin')),
  name text not null check (length(trim(name)) between 1 and 100),
  sector text not null default 'Other' check (sector in ('Tech','Design','Marketing','Product','Other')),
  company text not null default '' check (length(company) <= 120),
  bio text not null default '' check (length(bio) <= 6000),
  about text not null default '' check (length(about) <= 6000),
  skills text[] not null default '{}' check (cardinality(skills) <= 30 and length(array_to_string(skills, ',')) <= 1500),
  created_at timestamptz not null default now()
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  sector text not null check (sector in ('Tech','Design','Marketing','Product','Other')),
  location text not null default 'Remote' check (length(location) <= 160),
  pay text not null default 'Not disclosed' check (length(pay) <= 100),
  blurb text not null check (length(trim(blurb)) between 1 and 300),
  description text not null check (length(trim(description)) between 1 and 15000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid references public.profiles(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 160),
  sector text not null check (sector in ('Tech','Design','Marketing','Product','Other')),
  description text not null check (length(trim(description)) between 1 and 15000),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete restrict,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (length(trim(text)) between 1 and 15000),
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (challenge_id,candidate_id)
);
create table public.badges (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  description text not null
);
create table public.awards (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete restrict,
  awarded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), unique (candidate_id,badge_id)
);
create table public.candidate_swipes (
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  decision text not null check (decision in ('interested','pass')),
  created_at timestamptz not null default now(),
  primary key (candidate_id,job_id)
);
create table public.recruiter_swipes (
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  decision text not null check (decision in ('interested','pass')),
  created_at timestamptz not null default now(),
  check (decision = 'pass' or job_id is not null),
  primary key (recruiter_id,candidate_id)
);
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(), unique(candidate_id,job_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (length(trim(text)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp()
);
create index jobs_owner on public.jobs(recruiter_id);
create index jobs_active_sector on public.jobs(active,sector);
create index challenges_owner on public.challenges(posted_by);
create index submissions_candidate on public.submissions(candidate_id);
create index awards_badge on public.awards(badge_id);
create index swipes_job on public.candidate_swipes(job_id);
create index recruiter_swipes_candidate on public.recruiter_swipes(candidate_id);
create index recruiter_swipes_job on public.recruiter_swipes(job_id);
create index matches_recruiter on public.matches(recruiter_id);
create index matches_job on public.matches(job_id);
create index messages_match_time on public.messages(match_id,created_at desc,id);
create index messages_sender on public.messages(sender_id);

create function private.app_role() returns text language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create function private.handle_new_user() returns trigger language plpgsql security definer set search_path = ''
as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); r text;
begin
  -- Public signup can never create an admin, including forged metadata.
  r := case when m->>'role' = 'recruiter' then 'recruiter' else 'candidate' end;
  insert into public.profiles(id,role,name,sector,company,bio,about)
  values(new.id,r,coalesce(nullif(left(trim(m->>'name'),100),''),'New member'),
    case when m->>'sector' in ('Tech','Design','Marketing','Product','Other') then m->>'sector' else 'Other' end,
    left(coalesce(m->>'company',''),120),left(coalesce(m->>'bio',''),6000),left(coalesce(m->>'about',''),6000));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Serialize both sides on the same candidate: simultaneous interest cannot miss a match.
create function private.try_match(cid uuid,jid uuid) returns uuid language plpgsql security definer set search_path = ''
as $$
declare result uuid; rid uuid;
begin
  select recruiter_id into rid from public.jobs where id=jid;
  if exists(select 1 from public.candidate_swipes where candidate_id=cid and job_id=jid and decision='interested')
    and exists(select 1 from public.recruiter_swipes where recruiter_id=rid and candidate_id=cid and job_id=jid and decision='interested') then
    insert into public.matches(candidate_id,recruiter_id,job_id) values(cid,rid,jid)
      on conflict(candidate_id,job_id) do nothing;
    select id into result from public.matches where candidate_id=cid and job_id=jid;
  end if;
  return result;
end $$;

create function public.record_candidate_swipe(p_job_id uuid,p_decision text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid := auth.uid();
begin
  if private.app_role() is distinct from 'candidate' then raise exception 'Candidate access required'; end if;
  if p_decision not in ('interested','pass') or p_decision is null then raise exception 'Invalid decision'; end if;
  if not exists(select 1 from public.jobs where id=p_job_id and active) then raise exception 'This job is no longer open'; end if;
  perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
  insert into public.candidate_swipes(candidate_id,job_id,decision) values(cid,p_job_id,p_decision)
    on conflict(candidate_id,job_id) do update set decision=excluded.decision;
  return private.try_match(cid,p_job_id);
end $$;

create function public.record_recruiter_swipe(p_candidate_id uuid,p_decision text,p_job_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid := auth.uid();
begin
  if private.app_role() is distinct from 'recruiter' then raise exception 'Recruiter access required'; end if;
  if p_decision not in ('interested','pass') or p_decision is null then raise exception 'Invalid decision'; end if;
  if not exists(select 1 from public.profiles where id=p_candidate_id and role='candidate') then raise exception 'Candidate not found'; end if;
  if p_decision='interested' and p_job_id is null then raise exception 'Choose an open position'; end if;
  if p_job_id is not null and not exists(select 1 from public.jobs where id=p_job_id and recruiter_id=rid and active)
    then raise exception 'Choose one of your open positions'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_candidate_id::text,0));
  insert into public.recruiter_swipes(recruiter_id,candidate_id,job_id,decision)
    values(rid,p_candidate_id,p_job_id,p_decision)
    on conflict(recruiter_id,candidate_id) do update set decision=excluded.decision,job_id=excluded.job_id;
  return private.try_match(p_candidate_id,p_job_id);
end $$;

-- Enable RLS everywhere; authenticated grants below are deliberately column-scoped.
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.challenges enable row level security;
alter table public.submissions enable row level security;
alter table public.badges enable row level security;
alter table public.awards enable row level security;
alter table public.candidate_swipes enable row level security;
alter table public.recruiter_swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles,public.jobs,public.challenges,public.submissions,public.badges,public.awards,
  public.candidate_swipes,public.recruiter_swipes,public.matches,public.messages from anon,authenticated;
grant select on public.profiles,public.jobs,public.challenges,public.submissions,public.badges,public.awards,
  public.candidate_swipes,public.recruiter_swipes,public.matches,public.messages to authenticated;
grant update(name,sector,company,bio,about,skills) on public.profiles to authenticated;
grant insert(recruiter_id,title,sector,location,pay,blurb,description) on public.jobs to authenticated;
grant update(title,sector,location,pay,blurb,description,active) on public.jobs to authenticated;
grant insert(posted_by,title,sector,description) on public.challenges to authenticated;
grant update(archived) on public.challenges to authenticated;
grant delete on public.challenges to authenticated;
grant insert(challenge_id,candidate_id,text) on public.submissions to authenticated;
grant update(reviewed) on public.submissions to authenticated;
grant insert(candidate_id,badge_id,awarded_by) on public.awards to authenticated;
grant insert(id,match_id,sender_id,text) on public.messages to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (
  id=(select auth.uid()) or (select private.app_role())='admin'
  or role='recruiter' or (role='candidate' and (select private.app_role())='recruiter'));
create policy profiles_edit on public.profiles for update to authenticated
  using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy jobs_read on public.jobs for select to authenticated using(true);
create policy jobs_create on public.jobs for insert to authenticated
  with check(recruiter_id=(select auth.uid()) and (select private.app_role())='recruiter');
create policy jobs_edit on public.jobs for update to authenticated
  using(recruiter_id=(select auth.uid()) and (select private.app_role())='recruiter')
  with check(recruiter_id=(select auth.uid()));
create policy challenges_read on public.challenges for select to authenticated using(true);
create policy challenges_create on public.challenges for insert to authenticated
  with check(posted_by=(select auth.uid()) and (select private.app_role()) in ('admin','recruiter'));
create policy challenges_edit on public.challenges for update to authenticated
  using((select private.app_role())='admin' or (posted_by=(select auth.uid()) and (select private.app_role())='recruiter'))
  with check((select private.app_role())='admin' or posted_by=(select auth.uid()));
create policy challenges_delete on public.challenges for delete to authenticated using((select private.app_role())='admin');
create policy submissions_read on public.submissions for select to authenticated
  using(candidate_id=(select auth.uid()) or (select private.app_role()) in ('admin','recruiter'));
create policy submissions_create on public.submissions for insert to authenticated
  with check(candidate_id=(select auth.uid()) and (select private.app_role())='candidate'
    and exists(select 1 from public.challenges c where c.id=challenge_id and not c.archived));
create policy submissions_review on public.submissions for update to authenticated
  using((select private.app_role())='admin') with check((select private.app_role())='admin');
create policy badges_read on public.badges for select to authenticated using(true);
create policy awards_read on public.awards for select to authenticated using(
  candidate_id=(select auth.uid()) or (select private.app_role()) in ('recruiter','admin'));
create policy awards_create on public.awards for insert to authenticated
  with check((select private.app_role())='admin' and awarded_by=(select auth.uid())
    and exists(select 1 from public.profiles p where p.id=candidate_id and p.role='candidate'));
create policy candidate_swipes_read on public.candidate_swipes for select to authenticated
  using(candidate_id=(select auth.uid()) or (select private.app_role())='admin');
create policy recruiter_swipes_read on public.recruiter_swipes for select to authenticated
  using(recruiter_id=(select auth.uid()) or (candidate_id=(select auth.uid()) and decision='interested') or (select private.app_role())='admin');
create policy matches_read on public.matches for select to authenticated
  using(candidate_id=(select auth.uid()) or recruiter_id=(select auth.uid()) or (select private.app_role())='admin');
create policy messages_read on public.messages for select to authenticated using(
  exists(select 1 from public.matches m where m.id=match_id and (m.candidate_id=(select auth.uid()) or m.recruiter_id=(select auth.uid()))));
create policy messages_create on public.messages for insert to authenticated with check(
  sender_id=(select auth.uid()) and exists(select 1 from public.matches m where m.id=match_id and (m.candidate_id=(select auth.uid()) or m.recruiter_id=(select auth.uid()))));

revoke all on function private.app_role(),private.handle_new_user(),private.try_match(uuid,uuid) from public,anon,authenticated;
grant execute on function private.app_role() to authenticated;
revoke all on function public.record_candidate_swipe(uuid,text),public.record_recruiter_swipe(uuid,text,uuid) from public,anon;
grant execute on function public.record_candidate_swipe(uuid,text),public.record_recruiter_swipe(uuid,text,uuid) to authenticated;
-- Admin can count messages for the data table without reading private message bodies.
create function public.admin_message_counts() returns table(match_id uuid,total bigint)
language sql stable security definer set search_path='' as $$
  select match_id,count(*) from public.messages where private.app_role()='admin' group by match_id
$$;
revoke all on function public.admin_message_counts() from public,anon;
grant execute on function public.admin_message_counts() to authenticated;

insert into public.badges(name,description) values
 ('Verified Builder','Completed at least one reviewed challenge with strong execution.'),
 ('Design Sprint Winner','Top submission in a timed design challenge.'),
 ('Growth Hacker','Demonstrated measurable growth thinking in a submission.'),
 ('Challenge Champion','Three or more completed challenges.');

-- Useful launch content from the prototype; no fake users, jobs or submissions.
insert into public.challenges(posted_by,title,sector,description) values
 (null,'Redesign a checkout flow','Design','Pick any e-commerce checkout you find frustrating and redesign it. Write up what was broken and why your version fixes it.'),
 (null,'Build a rate limiter','Tech','Describe (or pseudocode) a token-bucket rate limiter for a public API, including how you would handle bursty traffic.'),
 (null,'30-day growth plan for a DTC brand','Marketing','Sketch a 30-day acquisition plan for a hypothetical DTC skincare brand with a ₹50,000 budget and no existing audience.');

-- Supabase Realtime. Conditional for compatibility with local PostgreSQL tests.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.messages,public.matches;
  end if;
end $$;
commit;

