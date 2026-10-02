import { Landing, AuthPage, ResetPasswordPage, Brand, parseAuthRoute, authPath, type AuthMode } from './Marketing';
import Chat from './Chat';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { AuthUser, Gateway, Snapshot, Profile, Role, Job, Challenge, Submission, Decision, JobInput } from './types';
import { emptySnapshot, sectors } from './types';
import { dateLabel, errorText, fitScore, initials, required } from './utils';
import { messageCounts } from './gateway';

type ModalState = { type: 'job'; job: Job } | { type: 'candidate' | 'portfolio' | 'position'; candidate: Profile } | { type: 'edit-job'; job: Job } | { type: 'delete'; challenge: Challenge };
interface AppContext {
  api: Gateway; data: Snapshot; me: Profile; busy: boolean;
  act: (action: () => Promise<unknown>, message?: string, reload?: boolean) => Promise<boolean>;
  refresh: () => Promise<void>; navigate: (page: string) => void;
  modal: (value: ModalState | null) => void;
}
const Context = createContext<AppContext>(null!);
export const useApp = () => useContext(Context);
function Empty({ children }: { children: ReactNode }) { return <div className="empty-note">{children}</div>; }
function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) { return <section className={'panel ' + className}>{title && <h3>{title}</h3>}{children}</section>; }
function Btn({ children, onClick, kind = '', type = 'button', disabled = false, small = false }: { children: ReactNode; onClick?: () => void; kind?: string; type?: 'button' | 'submit'; disabled?: boolean; small?: boolean }) {
  const context = useContext(Context);
  return <button type={type} disabled={disabled || context?.busy} className={'btn ' + (kind ? 'btn-' + kind : '') + (small ? ' btn-sm' : '')} onClick={onClick}>{children}</button>;
}
function Field({ label, name, value = '', type = 'text', max = 200, required: needed = false, placeholder = '' }: { label: string; name: string; value?: string; type?: string; max?: number; required?: boolean; placeholder?: string }) {
  return <div className="field"><label htmlFor={name}>{label}</label>{type === 'textarea'
    ? <textarea id={name} name={name} defaultValue={value} required={needed} maxLength={max} placeholder={placeholder} />
    : <input id={name} name={name} defaultValue={value} required={needed} maxLength={max} type={type} minLength={type === 'password' ? 8 : undefined} autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : undefined} placeholder={placeholder} />}</div>;
}
function Sector({ value = 'Tech' }: { value?: string }) { return <div className="field"><label htmlFor="sector">Sector</label><select name="sector" id="sector" defaultValue={value}>{sectors.map(s => <option key={s}>{s}</option>)}</select></div>; }
function Tabs({ options, value, change }: { options: [string, string][]; value: string; change: (value: string) => void }) {
  return <div className="tabbar" aria-label="View options">{options.map(([id, label]) => <button key={id} type="button" aria-pressed={value === id} className={value === id ? 'active' : ''} onClick={() => change(id)}>{label}</button>)}</div>;
}
function Search({ value, change, placeholder }: { value: string; change: (v: string) => void; placeholder: string }) { return <div className="search-row"><input aria-label={placeholder} value={value} placeholder={placeholder} onChange={e => change(e.target.value)} /></div>; }
const nav: Record<Role, [string, string][]> = {
  candidate: [['home','Home'],['challenges','Open Challenges'],['matches','Matches & Chat'],['profile','Profile']],
  recruiter: [['home','Home'],['post-job','+ Post a job'],['post-challenge','Post a challenge'],['matches','Matches & Chat'],['profile','Profile']],
  admin: [['dashboard','Dashboard'],['challenges','Challenges'],['badges','Award badges'],['data','Backend data']]
};
const titles: Record<string, [string, string]> = {
  'candidate-home': ['Candidate home','Browse open roles, search by job or company, and swipe to show interest.'],
  'candidate-challenges': ['Open challenges','Take on a challenge to build proof-of-work into your portfolio.'],
  'candidate-profile': ['Your profile','Edit your info and portfolio paragraph — this is what recruiters see.'],
  'recruiter-home': ['Find candidates','Browse the swipe deck or search directly by name or skill.'],
  'recruiter-post-job': ['Post a job','This will appear in candidate browse, search, and your company page.'],
  'recruiter-post-challenge': ['Post a custom challenge','Create a challenge for candidates to show what they can do.'],
  'recruiter-profile': ['Company profile','Manage your company information and open positions.'],
  'admin-dashboard': ['Admin dashboard','Platform-wide overview and review queue.'],
  'admin-challenges': ['Challenges','Create, monitor, review, archive, and manage platform challenges.'],
  'admin-badges': ['Award badges','Recognise strong challenge submissions and surface verified proof-of-work.'],
  'admin-data': ['Backend data','Inspect saved profiles, jobs, challenges, submissions, and matches.']
};

export default function App({ api }: { api: Gateway }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [boot, setBoot] = useState(true);
  const [data, setData] = useState<Snapshot>(emptySnapshot);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [page, setPage] = useState(location.hash.slice(1));
  const [modal, setModal] = useState<ModalState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const lock = useRef(false);
  const request = useRef(0);
  const userRef = useRef(user); userRef.current = user;
  const refresh = useCallback(async () => {
    const id = userRef.current?.id;
    if (!id) return;
    const token = ++request.current;
    const next = await api.snapshot();
    if (token !== request.current || id !== userRef.current?.id) return;
    if (!next.profiles.some(p => p.id === id)) throw new Error('Your account profile is missing. Ask the platform owner to check the database setup.');
    setData(next); setLoaded(true); setLoadError('');
  }, [api]);
  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const callbackError = params.get('error_description') || new URLSearchParams(location.search).get('error_description');
    if (callbackError) { setNotice({ text: callbackError, error: true }); history.replaceState(null, '', location.pathname); }
    const stop = api.onAuth((next, resetting) => {
      setUser(prev => prev?.id === next?.id ? prev : next);
      if (resetting) setRecovery(true);
    });
    api.session().then(setUser).catch(e => setLoadError(errorText(e))).finally(() => setBoot(false));
    const hash = () => setPage(location.hash.slice(1));
    window.addEventListener('hashchange', hash);
    return () => { stop(); window.removeEventListener('hashchange', hash); };
  }, [api]);
  useEffect(() => {
    ++request.current;
    setLoaded(false); setData(emptySnapshot()); setModal(null); setLoadError('');
    if (user) { void refresh().catch(e => setLoadError(errorText(e))); }
  }, [user?.id, refresh]);
  useEffect(() => {
    if (!user || !loaded) return;
    const update = () => { if (!document.hidden) void refresh().catch(() => {}); };
    const timer = window.setInterval(update, 45000);
    window.addEventListener('focus', update);
    const stop = api.subscribe('', update, () => {});
    return () => { clearInterval(timer); window.removeEventListener('focus', update); stop(); };
  }, [user?.id, loaded, refresh, api]);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const navigate = (next: string) => { location.hash = next; setPage(next); setModal(null); window.scrollTo(0,0); };
  const act = async (action: () => Promise<unknown>, message = '', reload = true) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setNotice(null);
    try {
      const outcome = await action();
      if (typeof outcome === "string" && outcome) message = "It is a match! Chat unlocked.";
      if (reload && userRef.current) {
        try { await refresh(); } catch { setNotice({ text: 'Saved, but the view could not refresh. Use Refresh to load the latest data.', error: true }); return true; }
      }
      if (message) setNotice({ text: message, error: false });
      return true;
    } catch (e) { setNotice({ text: errorText(e), error: true }); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const me = data.profiles.find(p => p.id === user?.id);
  const logout = () => void act(async () => { await api.signOut(); setRecovery(false); navigate(''); }, '', false);
  const toast = notice && <div className={'toast ' + (notice.error ? 'toast-error' : '')} role={notice.error ? 'alert' : 'status'}>{notice.text}<button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>;
  const access = parseAuthRoute(page);
  const chooseAuth = (role: Role, mode: AuthMode = 'signup') => navigate(authPath(role, mode));
  let body: ReactNode;
  if (boot) body = <div className="landing"><div role="status">Opening Recruider…</div></div>;
  else if (recovery) body = <ResetPasswordPage api={api} busy={busy} act={act} done={() => { setRecovery(false); history.replaceState(null,'',location.pathname); }} cancel={logout} />;
  else if (user && !loaded) body = <div className="landing"><div className="auth-box"><h3>{loadError ? 'Unable to load your workspace' : 'Loading your workspace…'}</h3>{loadError && <><p role="alert">{loadError}</p><button className="btn btn-primary" onClick={() => void refresh().catch(e => setLoadError(errorText(e)))}>Retry</button></>}<button className="btn btn-ghost" onClick={logout}>Sign out</button></div></div>;
  else if (!user || !me) body = access
    ? <AuthPage api={api} role={access.role} mode={access.mode} choose={chooseAuth} back={() => navigate('')} busy={busy} act={act} />
    : <Landing choose={chooseAuth} />;
  else {
    const active = nav[me.role].some(([id]) => id === page) ? page : nav[me.role][0][0];
    const [title, description] = active === 'matches' ? ['Matches & chat','Chat unlocks once you and the other person both show interest in the same role.'] : titles[me.role + '-' + active];
    body = <Context.Provider value={{ api, data, me, busy, act, refresh, navigate, modal: setModal }}>
      <div className="app-shell" inert={modal ? true : undefined}>
        <aside className="sidebar"><div className="brand"><Brand onClick={()=>navigate(me.role==='admin'?'dashboard':'home')}/></div><div className="side-user"><div className="avatar">{initials(me.name)}</div><div><div className="name">{me.name}</div><div className="role">{me.role}{me.company ? ' • ' + me.company : ''}</div></div></div>
          <nav aria-label="Main navigation">{nav[me.role].map(([id, label]) => <button key={id} className={'nav-item ' + (active === id ? 'active' : '')} aria-current={active === id ? 'page' : undefined} onClick={() => navigate(id)}>{label}</button>)}</nav>
          <div className="sidebar-foot"><Btn small kind="ghost" onClick={logout}>Sign out / switch account</Btn></div>
        </aside>
        <main className="main"><header className="page-head"><div><h2>{title}</h2><div className="desc">{description}</div></div><Btn small kind="ghost" onClick={() => void act(refresh, 'Up to date.', false)}>↻ Refresh</Btn></header>
          <div key={me.id + active}>
            {active === 'matches' ? <Chat /> : me.role === 'candidate' ? (active === 'home' ? <CandidateHome /> : active === 'challenges' ? <CandidateChallenges /> : <CandidateProfile />)
              : me.role === 'recruiter' ? (active === 'home' ? <RecruiterHome /> : active === 'post-job' ? <Panel className="form-panel"><JobForm /></Panel> : active === 'post-challenge' ? <Panel className="form-panel"><ChallengeForm /></Panel> : <RecruiterProfile />)
              : active === 'dashboard' ? <AdminDashboard /> : active === 'challenges' ? <AdminChallenges /> : active === 'badges' ? <AdminBadges /> : <AdminData />}
          </div>
        </main>
      </div>{modal && <Modal value={modal} close={() => setModal(null)} />}
    </Context.Provider>;
  }
  return <>{api.demo && user && <div className="demo-banner">LOCAL DEMO • sample data saved only in this browser</div>}{body}{toast}{busy && user && !recovery && <div className="save-status" role="status">Saving…</div>}</>;
}

function BadgeList({ candidate, light = false }: { candidate: Profile; light?: boolean }) {
  const { data } = useApp();
  const badges = data.awards.filter(a => a.candidate_id === candidate.id).map(a => data.badges.find(b => b.id === a.badge_id)).filter(Boolean);
  return badges.length ? <div className={light ? 'skill-tags' : ''}>{badges.map(b => <span className={light ? 'skill-tag' : 'badge-chip'} key={b!.id} title={b!.description}>★ {b!.name}</span>)}</div> : <Empty>No badges yet.</Empty>;
}
function CandidateSubmissions({ id }: { id: string }) {
  const { data } = useApp();
  const list = data.submissions.filter(s => s.candidate_id === id);
  return list.length ? <>{list.map(s => <div className="sub-item" key={s.id}><div className="sub-title">{data.challenges.find(c => c.id === s.challenge_id)?.title}</div><div className="sub-text preserve">{s.text}</div><div className="muted">{s.reviewed ? 'Reviewed' : 'Pending review'} • {dateLabel(s.created_at)}</div></div>)}</> : <Empty>No submissions yet — check Open Challenges.</Empty>;
}
function SwipeButtons({ decide }: { decide: (d: Decision) => void }) {
  const { busy } = useApp();
  return <div className="card-actions"><button disabled={busy} className="swipe-btn pass" onClick={() => decide('pass')}>✕ Not interested</button><button disabled={busy} className="swipe-btn like" onClick={() => decide('interested')}>♥ Interested</button></div>;
}
function Fit({ candidate, job }: { candidate: Profile; job?: Job }) {
  const score = fitScore(candidate, job);
  return <div className="stamp" title="Profile overlap: 60 points for the same sector and up to 40 for listed skills mentioned in the job. This is a browsing hint, not an assessment of ability."><b>{score === null ? '—' : score + '%'}</b><small>overlap</small></div>;
}
function Dossier({ children, behind, decide }: { children: ReactNode; behind?: boolean; decide: (d: Decision) => void }) {
  const { busy } = useApp();
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [offset,setOffset] = useState(0);
  const finish = () => { const x = offset; start.current = null; setOffset(0); if (!busy && Math.abs(x)>100) decide(x>0 ? 'interested' : 'pass'); };
  return <div className={'dossier-card ' + (behind ? 'behind' : 'top')} aria-hidden={behind || undefined} inert={behind ? true : undefined}
    style={!behind && offset ? { transform: 'translateX(' + offset + 'px) rotate(' + offset/18 + 'deg)' } : undefined}
    onPointerDown={e => { if (behind || busy || e.button !== 0 || (e.target as Element).closest('button,input,a')) return; start.current={x:e.clientX,y:e.clientY,id:e.pointerId}; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={e => { if (start.current?.id === e.pointerId) setOffset(e.clientX-start.current.x); }}
    onPointerUp={() => { if (start.current) finish(); }} onPointerCancel={() => { start.current=null;setOffset(0); }}>
    {children}
  </div>;
}
function JobRow({ job }: { job: Job }) {
  const { me, data, modal } = useApp();
  const owner = data.profiles.find(p => p.id === job.recruiter_id);
  const decision = data.candidate_swipes.find(s => s.candidate_id === me.id && s.job_id === job.id)?.decision;
  return <button className="list-row row-button" onClick={() => modal({ type:'job',job })}><span className="lr-stamp">{fitScore(me,job)}%</span><span className="lr-main"><h4>{job.title}</h4><span className="lr-sub">{owner?.company} • {job.location} • {job.pay}</span><span className="lr-meta">{job.sector}{decision ? ' • ' + (decision === 'interested' ? 'You showed interest' : 'Passed') : ''}</span></span></button>;
}
function CandidateHome() {
  const { me, data, api, act, modal } = useApp();
  const [tab,setTab] = useState('browse'); const [query,setQuery] = useState(''); const [company,setCompany] = useState<string | null>(null);
  const jobs = data.jobs.filter(j => j.active);
  const deck = jobs.filter(j => !data.candidate_swipes.some(s => s.candidate_id === me.id && s.job_id === j.id)).slice(0,2);
  const decide = (job: Job,d: Decision) => void act(() => api.candidateSwipe(job.id,d), d === 'interested' ? 'Interest saved. Mutual interest unlocks Matches & Chat.' : 'Passed.');
  const companies = data.profiles.filter(p => p.role === 'recruiter' && jobs.some(j => j.recruiter_id === p.id));
  const visible = jobs.filter(j => (!company || j.recruiter_id===company) && (j.title+' '+j.sector+' '+data.profiles.find(p=>p.id===j.recruiter_id)?.company).toLowerCase().includes(query.toLowerCase()));
  return <><Tabs options={[['browse','Browse'],['jobs','Search jobs'],['companies','Companies']]} value={tab} change={v=>{setTab(v);setCompany(null);setQuery('');}} />
    {tab === 'browse' ? <div className="deck-wrap"><div className="deck">{deck.length ? [...deck].reverse().map(j=><Dossier key={j.id} behind={deck[0].id!==j.id} decide={d=>decide(j,d)}><Fit candidate={me} job={j}/><div className="sector-pill">{j.sector}</div><h3>{j.title}</h3><div className="card-sub">{data.profiles.find(p=>p.id===j.recruiter_id)?.company} • {j.location}</div><div className="perforation"/><div className="card-meta"><span>{j.pay}</span><span>•</span><span>{j.location}</span></div><div className="card-desc">{j.blurb}</div><button className="card-link" onClick={()=>modal({type:'job',job:j})}>Read full description →</button><SwipeButtons decide={d=>decide(j,d)} /></Dossier>) : <div className="deck-empty">You've been through every open role.<br/>Check back later or use Search jobs to revisit a decision.</div>}</div><div className="deck-hint">Drag the card, or use the buttons below</div></div>
    : tab==='companies' && !company ? <div className="grid-companies">{companies.length ? companies.map(c=><button className="company-card row-button" key={c.id} onClick={()=>setCompany(c.id)}><h4>{c.company}</h4><div className="lr-meta">{c.sector} • {jobs.filter(j=>j.recruiter_id===c.id).length} open roles</div></button>) : <Empty>No companies with open roles yet.</Empty>}</div>
    : <>{company && <><Btn kind="ghost" small onClick={()=>setCompany(null)}>← All companies</Btn><h3 className="spaced">{data.profiles.find(p=>p.id===company)?.company} open positions</h3><p className="muted">{data.profiles.find(p=>p.id===company)?.about}</p></>}<Search value={query} change={setQuery} placeholder="Search by job title, company, or sector…" />{visible.length ? visible.map(j=><JobRow key={j.id} job={j}/>) : <Empty>No roles match that search.</Empty>}</>}
  </>;
}
function CandidateChallenges() {
  const { data, me } = useApp();
  const [sector,setSector] = useState('All');
  const list = data.challenges.filter(c => !c.archived && (sector==='All'||c.sector===sector));
  return <><div className="field filter-field"><label htmlFor="challenge-sector">Filter by sector</label><select id="challenge-sector" value={sector} onChange={e=>setSector(e.target.value)}>{['All',...sectors].map(s=><option key={s}>{s}</option>)}</select></div>{list.length ? list.map(ch=><ChallengeCard key={ch.id} challenge={ch} submission={data.submissions.find(s=>s.challenge_id===ch.id&&s.candidate_id===me.id)}/>) : <Empty>No open challenges in this sector yet.</Empty>}</>;
}
function ChallengeCard({ challenge: ch, submission }: { challenge: Challenge; submission?: Submission }) {
  const { data, api, act } = useApp();
  const poster = data.profiles.find(p=>p.id===ch.posted_by);
  const [text,setText]=useState('');
  return <Panel><div className="space-between"><div><div className="eyebrow">{ch.sector} • posted by {poster?.role==='recruiter' ? poster.company : 'Recruider'}</div><h3 className="spaced">{ch.title}</h3></div>{submission && <span className="badge-chip">✓ {submission.reviewed?'Reviewed':'Submitted'}</span>}</div><p className="muted preserve">{ch.description}</p>
    {submission ? <div className="submission-box"><div className="eyebrow">Your submission</div><p className="preserve">{submission.text}</p></div> : <form onSubmit={e=>{e.preventDefault();void act(async()=>{await api.submitChallenge(ch.id,required(text,'Submission',15000));setText('');},'Challenge submitted.');}}><div className="field"><label htmlFor={'submission-'+ch.id}>Your submission</label><textarea id={'submission-'+ch.id} required maxLength={15000} value={text} onChange={e=>setText(e.target.value)} placeholder="Write your submission as a short paragraph…"/></div><Btn type="submit" kind="primary" small>Submit challenge</Btn></form>}
  </Panel>;
}
function ProfileForm({ children }: { children?: ReactNode }) {
  const { me, api, act } = useApp();
  return <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(async()=>{
    const skills=String(f.get('skills')||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(skills.length>30) throw new Error('List up to 30 skills.');
    await api.saveProfile(me.id,{name:required(f.get('name'),'Name',100),sector:String(f.get('sector')),company:me.role==='recruiter'?required(f.get('company'),'Company',120):me.company,bio:String(f.get('bio')??me.bio).trim(),about:String(f.get('about')??me.about).trim(),skills:me.role==='candidate'?skills:me.skills});
  },'Profile saved.');}}>
    {me.role==='candidate' ? <div className="two-col"><Panel title="Basic info"><Field name="name" label="Name" value={me.name} required max={100}/><Sector value={me.sector}/><Field name="skills" label="Skills (comma separated)" value={me.skills.join(', ')} max={1500}/></Panel><Panel title={'Portfolio paragraph • '+me.sector}><Field name="bio" label="Portfolio paragraph" type="textarea" value={me.bio} max={6000}/><div className="eyebrow">This paragraph is what recruiters see as your portfolio.</div><div className="spaced"><Btn kind="primary" type="submit">Save profile</Btn></div></Panel></div>
    : <Panel title="Company info"><div className="two-col"><Field name="name" label="Contact name" value={me.name} required max={100}/><Field name="company" label="Company" value={me.company} required max={120}/></div><Sector value={me.sector}/><Field name="about" label="About" type="textarea" value={me.about} max={6000}/><Btn type="submit" kind="primary">Save profile</Btn></Panel>}{children}
  </form>;
}
function CandidateProfile() {
  const { me, data, api, act } = useApp();
  const interested=data.recruiter_swipes.filter(s=>s.candidate_id===me.id&&s.decision==='interested');
  return <><ProfileForm/><Panel title="Badges earned"><BadgeList candidate={me}/></Panel><Panel title="Challenges completed"><CandidateSubmissions id={me.id}/></Panel><Panel title="Companies that showed interest">{interested.length ? interested.map(s=>{
    const job=data.jobs.find(j=>j.id===s.job_id), recruiter=data.profiles.find(p=>p.id===s.recruiter_id);
    const matched=data.matches.some(m=>m.candidate_id===me.id&&m.job_id===s.job_id);
    return <div className="list-row" key={s.recruiter_id}><div className="lr-stamp">{initials(recruiter?.company)}</div><div className="lr-main"><h4>{recruiter?.company}</h4><div className="lr-sub">Interested in you for {job?.title}</div></div>{matched?<span className="badge-chip">Matched</span>:job?.active?<Btn small kind="primary" onClick={()=>void act(()=>api.candidateSwipe(job.id,'interested'),'It is a match! Chat unlocked.')}>Show interest back</Btn>:<span className="badge-chip">Role closed</span>}</div>;
  }):<Empty>No companies have shown interest yet.</Empty>}</Panel></>;
}
function RecruiterHome() {
  const { me,data,api,act,modal }=useApp();
  const [tab,setTab]=useState('browse'),[query,setQuery]=useState('');
  const candidates=data.profiles.filter(p=>p.role==='candidate');
  const deck=candidates.filter(c=>!data.recruiter_swipes.some(s=>s.recruiter_id===me.id&&s.candidate_id===c.id)).slice(0,2);
  const myJob=data.jobs.find(j=>j.recruiter_id===me.id&&j.active);
  const decide=(c:Profile,d:Decision)=>d==='interested'?modal({type:'position',candidate:c}):void act(()=>api.recruiterSwipe(c.id,'pass',null),'Passed.');
  const visible=candidates.filter(c=>(c.name+' '+c.sector+' '+c.skills.join(' ')).toLowerCase().includes(query.toLowerCase()));
  return <><Tabs options={[['browse','Browse'],['search','Search candidates']]} value={tab} change={setTab}/>
    {tab==='browse'?<div className="deck-wrap"><div className="deck">{deck.length?[...deck].reverse().map(c=><Dossier key={c.id} behind={deck[0].id!==c.id} decide={d=>decide(c,d)}><Fit candidate={c} job={myJob}/><div className="sector-pill">{c.sector}</div><h3>{c.name}</h3><div className="card-sub">{c.skills.slice(0,3).join(' • ')||'Skills not listed'}</div><div className="perforation"/><div className="card-desc">{c.bio||'No portfolio paragraph yet.'}</div><BadgeList candidate={c} light/><SwipeButtons decide={d=>decide(c,d)}/><button className="card-link" onClick={()=>modal({type:'portfolio',candidate:c})}>See portfolio →</button></Dossier>):<div className="deck-empty">You've reviewed every candidate.<br/>Check back later or use Search candidates to revisit a decision.</div>}</div><div className="deck-hint">Drag left to pass, right to show interest</div>{myJob&&<div className="muted">Overlap hint uses your first open role: {myJob.title}.</div>}</div>
    : <><Search value={query} change={setQuery} placeholder="Search by name, sector, or skill…"/>{visible.length?visible.map(c=><button className="list-row row-button" key={c.id} onClick={()=>modal({type:'candidate',candidate:c})}><div className="lr-stamp">{initials(c.name)}</div><div className="lr-main"><h4>{c.name}</h4><div className="lr-sub">{c.sector} • {c.skills.join(', ')||'Skills not listed'}</div><div className="lr-meta">{data.recruiter_swipes.find(s=>s.recruiter_id===me.id&&s.candidate_id===c.id)?.decision||'Not reviewed yet'}</div></div></button>):<Empty>No candidates match that search.</Empty>}</>}
  </>;
}
function JobForm({ job, done }: { job?: Job; done?: () => void }) {
  const { api,act,navigate }=useApp();
  return <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(async()=>{
    const input:JobInput={title:required(f.get('title'),'Job title',160),sector:String(f.get('sector')),location:String(f.get('location')).trim()||'Remote',pay:String(f.get('pay')).trim()||'Not disclosed',blurb:required(f.get('blurb'),'Short blurb',300),description:required(f.get('description'),'Description',15000)};
    if(job) await api.updateJob(job.id,input); else await api.postJob(input);
    if(done) done(); else navigate('profile');
  },job?'Job updated.':'Job posted.');}}>
    <Field name="title" label="Job title" required max={160} value={job?.title} placeholder="e.g. Backend Engineer"/><Sector value={job?.sector}/><Field name="location" label="Location" max={160} value={job?.location} placeholder="Remote / City"/><Field name="pay" label="Pay range" max={100} value={job?.pay} placeholder="₹18–26L/yr"/><Field name="blurb" label="Short blurb (shown on swipe card)" required max={300} value={job?.blurb}/><Field name="description" label="Full description" type="textarea" required max={15000} value={job?.description}/><Btn type="submit" kind="primary">{job?'Save job':'Post job'}</Btn>
  </form>;
}
function ChallengeForm() {
  const {api,act,me,navigate}=useApp();
  const [version,setVersion]=useState(0);
  return <form key={version} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(async()=>{await api.postChallenge({title:required(f.get('title'),'Title',160),sector:String(f.get('sector')),description:required(f.get('description'),'Description',15000)});setVersion(v=>v+1);if(me.role==='recruiter')navigate('profile');},'Challenge posted.');}}>
    <Field name="title" label="Challenge title" max={160} required/><Sector/><Field name="description" label="Description" type="textarea" max={15000} required/><Btn type="submit" kind="primary">{me.role==='admin'?'Post challenge':'Post custom challenge'}</Btn>
  </form>;
}
function RecruiterProfile() {
  const {me,data,api,act,navigate,modal}=useApp();
  const jobs=data.jobs.filter(j=>j.recruiter_id===me.id), challenges=data.challenges.filter(c=>c.posted_by===me.id);
  return <><ProfileForm/><Panel title="Posted jobs — by sector">{jobs.length?sectors.filter(s=>jobs.some(j=>j.sector===s)).map(s=><div className="sector-group" key={s}><h4>{s}</h4>{jobs.filter(j=>j.sector===s).map(j=><div className="list-row" key={j.id}><div className="lr-stamp">{initials(j.title)}</div><div className="lr-main"><h4>{j.title}</h4><div className="lr-sub">{j.location} • {j.pay} • {j.active?'Open':'Closed'}</div></div><div className="row-flex"><Btn small kind="ghost" onClick={()=>modal({type:'edit-job',job:j})}>Edit</Btn><Btn small onClick={()=>void act(()=>api.setJobActive(j.id,!j.active),j.active?'Job closed. Existing chats remain available.':'Job reopened.')}>{j.active?'Close':'Reopen'}</Btn></div></div>)}</div>):<Empty>You haven't posted any jobs yet.</Empty>}<Btn kind="primary" small onClick={()=>navigate('post-job')}>+ Post a job</Btn></Panel><Panel title="Your challenges">{challenges.length?challenges.map(ch=><div key={ch.id} className="sub-item"><div className="space-between"><div><div className="sub-title">{ch.title}</div><div className="sub-text">{ch.sector} • {ch.archived?'Archived':'Active'} • {data.submissions.filter(s=>s.challenge_id===ch.id).length} submissions</div></div><Btn small onClick={()=>void act(()=>api.archiveChallenge(ch.id,!ch.archived),ch.archived?'Challenge restored.':'Challenge archived.')}>{ch.archived?'Restore':'Archive'}</Btn></div>{data.submissions.filter(s=>s.challenge_id===ch.id).map(s=><div className="submission-box spaced" key={s.id}><strong>{data.profiles.find(p=>p.id===s.candidate_id)?.name}</strong><p className="preserve">{s.text}</p><span className="muted">{s.reviewed?'Reviewed':'Pending admin review'}</span></div>)}</div>):<Empty>No custom challenges yet.</Empty>}</Panel></>;
}


function ReviewRow({ submission: s }: { submission: Submission }) {
  const { data,api,act }=useApp();
  const candidate=data.profiles.find(p=>p.id===s.candidate_id);
  return <div className="list-row"><div className="lr-stamp">{initials(candidate?.name)}</div><div className="lr-main"><h4>{candidate?.name}</h4><div className="lr-sub">{data.challenges.find(c=>c.id===s.challenge_id)?.title}</div><div className="sub-text preserve">{s.text}</div><div className="lr-meta">{dateLabel(s.created_at)} • {s.reviewed?'Reviewed':'Pending review'}</div></div><Btn small kind={s.reviewed?'ok':'primary'} onClick={()=>void act(()=>api.reviewSubmission(s.id,!s.reviewed),s.reviewed?'Returned to review queue.':'Submission reviewed.')}>{s.reviewed?'Mark pending':'Mark reviewed'}</Btn></div>;
}
function AdminDashboard() {
  const { data,navigate }=useApp();
  const pending=data.submissions.filter(s=>!s.reviewed), active=data.challenges.filter(c=>!c.archived);
  const stats=[['Candidates',data.profiles.filter(p=>p.role==='candidate').length],['Recruiters',data.profiles.filter(p=>p.role==='recruiter').length],['Open jobs',data.jobs.filter(j=>j.active).length],['Active challenges',active.length],['Pending reviews',pending.length],['Mutual matches',data.matches.length]];
  return <><div className="stat-row">{stats.map(([label,count])=><div className="stat-box" key={label}><div className="val">{count}</div><div className="lbl">{label}</div></div>)}</div><div className="two-col"><Panel title="Review queue">{pending.length?pending.slice().reverse().slice(0,5).map(s=><ReviewRow key={s.id} submission={s}/>):<Empty>Nothing waiting for review.</Empty>}<Btn kind="ghost" small onClick={()=>navigate('challenges')}>Open challenge manager →</Btn></Panel><Panel title="Challenge health">{[[active.length+' active','Visible to candidates and accepting submissions.'],[(data.challenges.length-active.length)+' archived','Hidden from challenge browsing but retained in portfolios and admin records.'],[data.submissions.length+' total submissions',pending.length+' pending review • '+(data.submissions.length-pending.length)+' reviewed.']].map(([label,text])=><div className="sub-item" key={label}><div className="sub-title">{label}</div><div className="sub-text">{text}</div></div>)}</Panel></div><Panel title="Recent submissions">{data.submissions.length?data.submissions.slice().reverse().slice(0,6).map(s=><div className="sub-item" key={s.id}><div className="sub-title">{data.profiles.find(p=>p.id===s.candidate_id)?.name} → {data.challenges.find(c=>c.id===s.challenge_id)?.title}</div><div className="sub-text preserve">{s.text}</div><div className="muted">{s.reviewed?'Reviewed':'Pending review'} • {dateLabel(s.created_at)}</div></div>):<Empty>No submissions yet.</Empty>}</Panel></>;
}
function AdminChallenges() {
  const { data,api,act,modal }=useApp();
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('active');
  const list=data.challenges.filter(ch=>(ch.title+' '+ch.sector+' '+data.profiles.find(p=>p.id===ch.posted_by)?.company).toLowerCase().includes(query.toLowerCase())&&(filter==='all'||(filter==='active'?!ch.archived:ch.archived)));
  return <><Panel title="Post a global challenge" className="wide-form"><ChallengeForm/></Panel><Panel title="Challenge manager"><div className="space-between"><Search value={query} change={setQuery} placeholder="Search challenges…"/><Tabs options={[['active','Active'],['archived','Archived'],['all','All']]} value={filter} change={setFilter}/></div>{list.length?list.map(ch=>{
    const subs=data.submissions.filter(s=>s.challenge_id===ch.id),poster=data.profiles.find(p=>p.id===ch.posted_by);
    return <section className="submission-box spaced" key={ch.id}><div className="space-between"><div><div className="eyebrow">{ch.sector} • {poster?.role==='recruiter'?poster.company:'Recruider'} • {ch.archived?'Archived':'Active'}</div><h3 className="spaced">{ch.title}</h3><p className="muted preserve">{ch.description}</p></div><div><span className="badge-chip">{subs.length} submissions</span><span className="badge-chip">{subs.filter(s=>!s.reviewed).length} pending</span><span className="badge-chip">{subs.filter(s=>s.reviewed).length} reviewed</span></div></div><div className="row-flex"><Btn small kind="primary" onClick={()=>void act(()=>api.archiveChallenge(ch.id,!ch.archived),ch.archived?'Challenge restored.':'Challenge archived.')}>{ch.archived?'Restore':'Archive'}</Btn>{subs.length===0&&<Btn small kind="danger" onClick={()=>modal({type:'delete',challenge:ch})}>Delete</Btn>}</div><div className="eyebrow spaced">Submissions</div>{subs.length?subs.map(s=><ReviewRow key={s.id} submission={s}/>):<Empty>No submissions for this challenge yet.</Empty>}</section>;
  }):<Empty>No challenges match this filter.</Empty>}</Panel></>;
}
function AdminBadges() {
  const { data,api,act }=useApp();
  const candidates=data.profiles.filter(p=>p.role==='candidate');
  return <><Panel title="Award a badge" className="form-panel"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(async()=>{
    const cid=required(f.get('candidate'),'Candidate'),bid=required(f.get('badge'),'Badge');
    if(data.awards.some(a=>a.candidate_id===cid&&a.badge_id===bid)) throw new Error('This candidate already has that badge.');
    await api.awardBadge(cid,bid);
  },'Badge awarded.');}}><div className="field"><label htmlFor="candidate">Candidate</label><select id="candidate" name="candidate" required>{candidates.map(c=><option key={c.id} value={c.id}>{c.name} • {c.sector} ({data.awards.filter(a=>a.candidate_id===c.id).length} badges)</option>)}</select></div><div className="field"><label htmlFor="badge">Badge</label><select name="badge" id="badge" required>{data.badges.map(b=><option key={b.id} value={b.id}>{b.name} — {b.description}</option>)}</select></div><Btn type="submit" kind="primary" disabled={!candidates.length}>Award badge</Btn></form></Panel><Panel title="Badge catalog">{data.badges.map(b=><div key={b.id} className="sub-item"><div className="sub-title">{b.name}</div><div className="sub-text">{b.description}</div></div>)}</Panel><Panel title="Current badge holders">{candidates.filter(c=>data.awards.some(a=>a.candidate_id===c.id)).map(c=><div className="list-row" key={c.id}><div className="lr-stamp">{initials(c.name)}</div><div className="lr-main"><h4>{c.name}</h4><BadgeList candidate={c}/></div></div>)}{!data.awards.length&&<Empty>No badges awarded yet.</Empty>}</Panel></>;
}
function Table({ title, columns, rows }: { title: string; columns: string[]; rows: ReactNode[][] }) {
  return <Panel title={title+' ('+rows.length+')'}><div className="table-scroll"><table className="data-table"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={columns.length}>No records yet.</td></tr>}</tbody></table></div></Panel>;
}
function AdminData() {
  const {data,api}=useApp();
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [countError,setCountError]=useState(false);
  useEffect(()=>{let active=true;if(!api.demo)void messageCounts().then(c=>{if(active)setCounts(c);}).catch(()=>{if(active)setCountError(true);});return()=>{active=false;};},[data.matches,api.demo]);
  const profile=(id:string)=>data.profiles.find(p=>p.id===id);
  return <><Table title="Candidates" columns={['ID','Name','Sector','Badges']} rows={data.profiles.filter(p=>p.role==='candidate').map(p=>[p.id,p.name,p.sector,data.awards.filter(a=>a.candidate_id===p.id).length])}/><Table title="Recruiters" columns={['ID','Name','Company','Sector']} rows={data.profiles.filter(p=>p.role==='recruiter').map(p=>[p.id,p.name,p.company,p.sector])}/><Table title="Jobs" columns={['ID','Title','Company','Sector','Location','Status']} rows={data.jobs.map(j=>[j.id,j.title,profile(j.recruiter_id)?.company,j.sector,j.location,j.active?'Open':'Closed'])}/><Table title="Challenges" columns={['ID','Title','Sector','Posted by','Status','Submissions']} rows={data.challenges.map(c=>[c.id,c.title,c.sector,(c.posted_by&&profile(c.posted_by)?.company)||'Recruider',c.archived?'Archived':'Active',data.submissions.filter(s=>s.challenge_id===c.id).length])}/><Table title="Submissions" columns={['ID','Candidate','Challenge','Status','Submitted']} rows={data.submissions.map(s=>[s.id,profile(s.candidate_id)?.name,data.challenges.find(c=>c.id===s.challenge_id)?.title,s.reviewed?'Reviewed':'Pending',dateLabel(s.created_at)])}/><Table title="Matches" columns={['Candidate','Recruiter','Job','Messages']} rows={data.matches.map(m=>[profile(m.candidate_id)?.name,profile(m.recruiter_id)?.company,data.jobs.find(j=>j.id===m.job_id)?.title,api.demo?'Demo':countError?'Unavailable':counts[m.id]||0])}/></>;
}
function Modal({ value, close }: { value: ModalState; close: () => void }) {
  const { me,data,api,act,modal,navigate,busy }=useApp();
  const box=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement;
    box.current?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape')close();
      if(e.key!=='Tab')return;
      const targets=box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]');
      if(!targets?.length){e.preventDefault();return;}
      const first=targets[0],last=targets[targets.length-1];
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===box.current)){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    document.addEventListener('keydown',key);
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',key);previous?.focus();};
  },[]);
  let body:ReactNode;
  if(value.type==='job'){
    const j=data.jobs.find(j=>j.id===value.job.id)||value.job;
    const decision=data.candidate_swipes.find(s=>s.job_id===j.id&&s.candidate_id===me.id)?.decision;
    body=<><div className="sector-pill">{j.sector}</div><h3 id="modal-title">{j.title}</h3><div className="m-sub">{data.profiles.find(p=>p.id===j.recruiter_id)?.company} • {j.location} • {j.pay}</div><div className="card-desc preserve">{j.description}</div>{me.role==='candidate'&&j.active&&<SwipeButtons decide={d=>void act(async()=>{const result=await api.candidateSwipe(j.id,d);close();return result;},'Decision saved. Check Matches & Chat for mutual interest.')}/>}<div className="eyebrow spaced">{!j.active?'This role is closed.':decision?'You already marked this: '+decision:''}</div></>;
  }else if(value.type==='edit-job'){
    body=<><h3 id="modal-title">Edit job</h3><JobForm job={value.job} done={close}/></>;
  }else if(value.type==='delete'){
    body=<><h3 id="modal-title">Delete challenge?</h3><p className="card-desc">“{value.challenge.title}” will be permanently removed. Challenges with submissions can only be archived.</p><div className="row-flex spaced"><Btn kind="danger" onClick={()=>void act(async()=>{await api.deleteChallenge(value.challenge.id);close();},'Challenge deleted.')}>Delete challenge</Btn><Btn onClick={close}>Keep challenge</Btn></div></>;
  }else{
    const c=value.candidate;
    if(value.type==='position'){
      const jobs=data.jobs.filter(j=>j.recruiter_id===me.id&&j.active);
      body=<><h3 id="modal-title">Which position is this for?</h3><div className="m-sub">Choose one of your open roles to send interest with.</div>{jobs.length?jobs.map(j=><button disabled={busy} className="list-row row-button" key={j.id} onClick={()=>void act(async()=>{const result=await api.recruiterSwipe(c.id,'interested',j.id);close();return result;},'Interest sent. Mutual interest unlocks Matches & Chat.')}><div className="lr-stamp">{initials(j.title)}</div><div className="lr-main"><h4>{j.title}</h4><div className="lr-sub">{j.sector} • {j.location}</div></div></button>):<><Empty>Post a job first before showing interest.</Empty><Btn kind="primary" onClick={()=>navigate('post-job')}>Post a job</Btn></>}</>;
    }else{
      body=<><div className="sector-pill">{c.sector}{value.type==='portfolio'?' portfolio':''}</div><h3 id="modal-title">{c.name}</h3><div className="m-sub">{c.skills.join(' • ')||'No skills listed'}</div><div className="portfolio-block"><p className="preserve">{c.bio||'No portfolio paragraph yet.'}</p></div>{value.type==='portfolio'?<><div className="eyebrow spaced">Badges</div><BadgeList candidate={c} light/><div className="eyebrow spaced">Challenges completed</div><CandidateSubmissions id={c.id}/></>:<button className="card-link" onClick={()=>modal({type:'portfolio',candidate:c})}>See full portfolio →</button>}{me.role==='recruiter'&&<SwipeButtons decide={d=>d==='interested'?modal({type:'position',candidate:c}):void act(async()=>{await api.recruiterSwipe(c.id,'pass',null);close();},'Passed.')}/>}</>;
    }
  }
  return <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}><div className={'modal '+(value.type==='edit-job'?'modal-dark':'')} ref={box} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}><button className="modal-close" aria-label="Close dialog" onClick={close}>×</button>{body}</div></div>;
}

