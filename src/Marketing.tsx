
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Gateway, Profile, Role } from './types';
import { sectors } from './types';
import { initials, required } from './utils';
import './marketing.css';

export type AuthMode = 'login' | 'signup' | 'reset' | 'confirm';
type Act = (action: () => Promise<unknown>, message?: string, reload?: boolean) => Promise<boolean>;
type Choose = (role: Role, mode?: AuthMode) => void;
export function parseAuthRoute(page: string): { role: Role; mode: AuthMode } | null {
  if(page==='admin')return {role:'admin',mode:'login'};
  const [mode,role]=page.split('/');
  if(!['login','signup','reset','confirm'].includes(mode))return null;
  return {mode:mode as AuthMode,role:role==='recruiter'?'recruiter':role==='admin'&&mode!=='signup'?'admin':'candidate'};
}
export function authPath(role: Role, mode: AuthMode = 'signup') { return role==='admin'&&mode==='login'?'admin':mode+'/'+(role==='admin'&&mode==='signup'?'candidate':role); }

export function Brand({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const contents=<><span className="brand-symbol"><img src="/brand/symbol.png" alt="" width="3800" height="3800"/></span>{!compact&&<img className="brand-wordmark" src="/brand/wordmark.png" alt="" width="3601" height="511"/>}</>;
  return onClick?<button className="brand-lockup" aria-label="Recruider home" onClick={onClick}>{contents}</button>:<a className="brand-lockup" href="#" aria-label="Recruider home">{contents}</a>;
}
function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{diagonal?<path d="M6 18 18 6M6 6h12v12"/>:<path d="M4 12h15m-6-6 6 6-6 6"/>}</svg>; }
function Check(){return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>;}
function Icon({type}:{type:'work'|'match'|'challenge'|'search'}){
 return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
  {type==='work'?<><rect x="5" y="9" width="22" height="18" rx="4"/><path d="M11 9V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3M5 17c7 4 15 4 22 0M14 16h4v5h-4z"/></>:type==='match'?<><path d="M12 7H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h13l5 3V15"/><path d="m17 8 4 4 8-9M10 15h5m-5 5h9"/></>:type==='challenge'?<><path d="m16 3 4 8 9 2-7 6 2 10-8-5-8 5 2-10-7-6 9-2z"/></>:<><circle cx="13" cy="13" r="9"/><path d="m20 20 8 8M9 13h8m-4-4v8"/></>}
 </svg>;
}
const benefits=['Work that speaks for itself','Interest that goes both ways','Conversations with a purpose'];

export function Landing({ choose }: { choose: Choose }) {
  const [menu,setMenu]=useState(false);
  const jump=(id:string)=>{setMenu(false);document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  return <div className="marketing-page">
    <a className="skip-link" href="#marketing-main">Skip to content</a>
    <header className="marketing-header"><div className="marketing-container header-inner"><Brand/>
      <nav className={'marketing-nav '+(menu?'is-open':'')} aria-label="Website navigation">
        <button onClick={()=>jump('for-talent')}>For talent</button><button onClick={()=>jump('for-teams')}>For teams</button><button onClick={()=>jump('how-it-works')}>How it works</button>
      </nav>
      <div className="header-actions"><button className="text-button" onClick={()=>choose('candidate','login')}>Log in</button><button className="marketing-button small lime" onClick={()=>choose('candidate','signup')}>Get started <Arrow/></button><button className="menu-toggle" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?'×':<><span/><span/></>}</button></div>
    </div></header>
    <main id="marketing-main">
      <section className="hero-section marketing-container">
        <div className="hero-copy"><div className="marketing-eyebrow"><span className="live-dot"/> A new way to find your fit</div>
          <h1>Show the work.<br/>Find your<br/><span>next chapter.</span></h1>
          <p className="hero-description">You’re more than a résumé. Turn what you can do into a portfolio, a meaningful match, and your next opportunity.</p>
          <div className="hero-actions"><button className="marketing-button lime" onClick={()=>choose('candidate','signup')}>Find my next role <Arrow/></button><button className="marketing-button outline" onClick={()=>choose('recruiter','signup')}>I’m hiring <Arrow diagonal/></button></div>
          <div className="hero-note"><span className="mini-check"><Check/></span> Real skills. Mutual interest. Better conversations.</div>
        </div>
        <div className="hero-art" aria-label="Illustration of a skills portfolio and a mutual match">
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-point"/>
          <div className="art-label"><span/> YOUR WORK OPENS DOORS</div>
          <div className="proof-card"><div className="proof-card-top"><span className="proof-avatar">A<span/></span><div><strong>Alex Morgan</strong><span>Product designer</span></div><span className="proof-menu">···</span></div>
            <div className="proof-divider"/><div className="proof-heading"><span>SELECTED WORK</span><span>01 / 03</span></div>
            <div className="work-visual"><div className="mini-window"><div className="mini-window-nav"><span/><i/><i/></div><div className="mini-window-body"><div className="mini-product"/><div className="mini-product-info"><i/><i/><i/><b/></div></div></div><div className="work-caption"><span>CASE STUDY</span><strong>A smoother path<br/>from cart to checkout.</strong><span className="work-arrow">↗</span></div></div>
            <div className="proof-skills"><span>Figma</span><span>Design systems</span><span>Prototyping</span></div>
            <div className="proof-review"><span className="proof-seal"><Check/></span><div><strong>Proof, not just a promise.</strong><span>Challenges bring your skills to life.</span></div></div>
          </div>
          <div className="match-float"><span className="match-icon"><Icon type="match"/></span><div><strong>It goes both ways.</strong><span>Mutual interest unlocks a conversation.</span></div><span className="match-spark">✦</span></div>
          <div className="role-float"><div className="role-float-icon"><Icon type="work"/></div><div><span>YOUR NEXT OPPORTUNITY</span><strong>Product Designer</strong><small>Design team · Remote</small></div><Arrow diagonal/></div>
          <span className="illustration-note">Illustrative profile · Your story goes here</span>
        </div>
      </section>
      <div className="principles-strip"><div className="marketing-container principles-inner"><span>BUILT AROUND WHAT MATTERS</span>{benefits.map(b=><div key={b}><span>✳</span>{b}</div>)}</div></div>

      <section className="how-section marketing-container" id="how-it-works"><div className="section-intro"><div><div className="marketing-eyebrow">LESS FRICTION. MORE POSSIBILITY.</div><h2>A little proof.<br/>A better connection.</h2></div><p>Make your work the starting point.<br/>We’ll give it somewhere to go.</p></div>
        <div className="steps-grid">{[
          ['01','Build a picture of you.','Bring your skills and the story behind your work together in one clear portfolio.','work'],
          ['02','Put your skills to work.','Take on open challenges. Show your thinking, get reviewed, and earn badges for your work.','challenge'],
          ['03','Find the feeling’s mutual.','Explore opportunities, show interest, and start chatting when you both see a fit.','match']
        ].map(([n,title,description,type])=><article className="step-card" key={n}><div className="step-top"><span className="step-icon"><Icon type={type as 'work'|'challenge'|'match'}/></span><span>{n}</span></div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="talent-section" id="for-talent"><div className="marketing-container talent-inner">
        <div className="talent-visual"><div className="talent-visual-label">A PORTFOLIO WITH SOMETHING TO SAY</div><div className="work-stack"><div className="stack-back"/><div className="stack-front"><div className="stack-top"><Icon type="challenge"/><span>OPEN CHALLENGE</span><span>↗</span></div><h3>Good thinking<br/>deserves to<br/>be seen.</h3><div className="stack-lines"><i/><i/><i/></div><div className="stack-bottom"><span>YOUR IDEAS. YOUR APPROACH.</span><span>01</span></div></div><div className="badge-float"><span>✳</span><div><strong>Earn your recognition.</strong><small>Reviewed work. Visible progress.</small></div></div></div></div>
        <div className="audience-copy"><div className="marketing-eyebrow">FOR THE PEOPLE DOING THE WORK</div><h2>Let your talent<br/>do the talking.</h2><p>Whether you’re finding your first role or your next direction, give people a reason to look beyond your job title.</p><ul>{['Tell the story behind what you’ve built.','Grow your portfolio through real challenges.','Explore roles and companies on your terms.'].map(s=><li key={s}><Check/>{s}</li>)}</ul><button className="marketing-button dark" onClick={()=>choose('candidate','signup')}>Build my profile <Arrow/></button></div>
      </div></section>

      <section className="teams-section marketing-container" id="for-teams"><div className="audience-copy"><div className="marketing-eyebrow">FOR TEAMS LOOKING FOR THEIR PEOPLE</div><h2>See the potential.<br/><span>Meet the person.</span></h2><p>Find people through the work they can do. Explore portfolios, create challenges, and start a conversation with candidates who are interested too.</p><ul>{['Post a role and share what you’re building.','Discover skills, portfolios, and reviewed work.','Connect around a specific opportunity.'].map(s=><li key={s}><Check/>{s}</li>)}</ul><button className="marketing-button lime" onClick={()=>choose('recruiter','signup')}>Find great talent <Arrow/></button></div>
        <div className="teams-visual"><div className="talent-search"><Icon type="search"/><span>Your next great hire starts here.</span><span>↗</span></div><div className="talent-result"><span className="result-avatar one">PM</span><div><strong>Product & design</strong><span>Thoughtful experiences. Clear systems.</span><div className="result-tags"><i>Design thinking</i><i>Prototyping</i></div></div><span className="result-check"><Check/></span></div><div className="talent-result"><span className="result-avatar two">DE</span><div><strong>Engineering & technology</strong><span>Practical solutions. Work that holds up.</span><div className="result-tags"><i>Development</i><i>System design</i></div></div><span className="result-check"><Check/></span></div><div className="talent-result"><span className="result-avatar three">GM</span><div><strong>Growth & marketing</strong><span>Fresh ideas. A reason behind every move.</span><div className="result-tags"><i>Strategy</i><i>Analytics</i></div></div><span className="result-check"><Check/></span></div><div className="teams-note"><span className="live-dot"/> Discover the person behind the profile.</div></div>
      </section>

      <section className="faq-section marketing-container"><div><div className="marketing-eyebrow">A FEW THINGS, EXPLAINED.</div><h2>Good questions.<br/>Clear answers.</h2></div><div className="faq-list">{[
        ['What makes Recruider different?','Your portfolio and challenge submissions give recruiters a way to see your skills in action. You can explore roles, show interest, and chat when a recruiter shows interest in you for the same role.'],
        ['Do I need a portfolio to get started?','No. Start with your skills and a short paragraph about your work. You can add to your profile and complete challenges as you go.'],
        ['How does matching work?','Candidates show interest in a job. Recruiters show interest in a candidate and choose one of their open roles. When both choose the same opportunity, a match is created and chat opens.'],
        ['How do challenges and badges work?','Choose an open challenge and submit your response. Platform admins review submissions and award badges to recognise strong work. Reviewed submissions and badges appear in your portfolio.']
      ].map(([q,a])=><details key={q}><summary>{q}<span className="faq-plus">+</span></summary><p>{a}</p></details>)}</div></section>

      <section className="closing-section marketing-container"><div className="closing-content"><div className="marketing-eyebrow">YOUR NEXT CHAPTER IS OUT THERE.</div><h2>Give it something<br/>to start with.</h2><p>A skill. An idea. A piece of work.<br/>Let’s see where it takes you.</p><div className="hero-actions"><button className="marketing-button lime" onClick={()=>choose('candidate','signup')}>Get started <Arrow/></button><button className="closing-secondary" onClick={()=>choose('recruiter','signup')}>Looking to hire? <Arrow diagonal/></button></div></div><div className="closing-symbol"><img src="/brand/symbol.png" alt="" width="3800" height="3800" loading="lazy"/></div></section>
    </main>
    <footer className="marketing-footer marketing-container"><div className="footer-top"><div><Brand/><p>Skills first. People always.</p></div><div><span>FOR YOUR NEXT CHAPTER</span><button onClick={()=>choose('candidate','signup')}>Find a role</button><button onClick={()=>choose('recruiter','signup')}>Find talent</button></div><div><span>GET TO KNOW RECRUIDER</span><button onClick={()=>jump('how-it-works')}>How it works</button><button onClick={()=>choose('candidate','login')}>Log in</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Recruider. Built around potential.</span><button onClick={()=>choose('admin','login')}>Admin access <Arrow diagonal/></button></div></footer>
  </div>;
}

function AuthFrame({children,role='candidate',mode='login',back}:{children:ReactNode;role?:Role;mode?:AuthMode;back:()=>void}){
 const recruiter=role==='recruiter';
 return <div className="access-page"><aside className="access-story"><Brand onClick={back}/><div className="access-story-copy"><div className="marketing-eyebrow"><span className="live-dot"/>{role==='admin'?'THE PEOPLE BEHIND THE PLATFORM':recruiter?'GREAT TEAMS START WITH PEOPLE':'YOUR NEXT CHAPTER STARTS HERE'}</div><h2>{role==='admin'?<>Make good<br/>work <em>count.</em></>:recruiter?<>Find the people.<br/>Build <em>what’s next.</em></>:<>More than<br/>a résumé.<br/><em>A reason<br/>to connect.</em></>}</h2><p>{role==='admin'?'Support the community. Review the work. Help potential find its place.':recruiter?'Discover the skills, thinking, and potential behind your next great hire.':'Bring your skills, your ideas, and the work you’re proud of. There’s a place for all of it here.'}</p></div><div className="access-art"><div className="access-art-ring"/><img src="/brand/lockup.png" alt="Recruider" width="3800" height="4013"/><span className="access-art-dot"/></div><div className="access-story-footer"><span>Skills first. People always.</span><span>↗</span></div></aside>
 <main className={'access-main '+(mode==='signup'?'signup-layout':'')}><div className="access-top"><button onClick={back}><span>←</span> Back to Recruider</button><span>GOOD WORK STARTS HERE.</span></div><div className="access-content">{children}</div><div className="access-bottom"><span>Recruider</span><span>Made for your next chapter.</span></div></main></div>;
}
function PasswordField({label='Password',name='password',signup=false}:{label?:string;name?:string;signup?:boolean}){
 const [show,setShow]=useState(false);
 return <div className="access-field"><label htmlFor={name}>{label}</label><div className="password-input"><input id={name} name={name} type={show?'text':'password'} required minLength={8} maxLength={128} autoComplete={signup?'new-password':'current-password'} placeholder={signup?'Create a strong password':'Enter your password'}/><button type="button" aria-label={show?'Hide '+label.toLowerCase():'Show '+label.toLowerCase()} aria-pressed={show} onClick={()=>setShow(!show)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>{show&&<path d="m3 3 18 18"/>}</svg></button></div>{signup&&<span className="field-hint">Use at least 8 characters.</span>}</div>;
}

export function AuthPage({api,role,mode,choose,back,busy,act}:{api:Gateway;role:Role;mode:AuthMode;choose:Choose;back:()=>void;busy:boolean;act:Act}){
 const [email,setEmail]=useState(''),[message,setMessage]=useState(''),[demoProfiles,setDemoProfiles]=useState<Profile[]>([]);
 const signup=mode==='signup',recruiter=role==='recruiter';
 useEffect(()=>{if(api.demo)void api.snapshot().then(s=>setDemoProfiles(s.profiles.filter(p=>p.role===role)));},[api,role]);
 const change=(r:Role,m:AuthMode)=>{setMessage('');choose(r,m);};
 const title=mode==='reset'?'Forgot your password?':mode==='confirm'?'Let’s confirm your email.':signup?'Your next chapter starts here.':role==='admin'?'Admin sign in.':'Good to see you again.';
 const description=mode==='reset'?'We’ll send you a link to set a new one.':mode==='confirm'?'Enter your email and we’ll send a fresh confirmation link.':signup?'A little about you. A world of possibility ahead.':role==='admin'?'Sign in with your authorised platform account.':'Pick up where you left off. Your next opportunity is waiting.';
 const submit=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();const form=new FormData(e.currentTarget);
  void act(async()=>{
    const address=required(form.get('email'),'Email',254);
    if(mode==='reset'){await api.resetPassword(address);setMessage('If this email has an account, a password reset link will arrive shortly.');return;}
    if(mode==='confirm'){await api.resendConfirmation(address);setMessage('If your account needs confirmation, a fresh link will arrive shortly.');return;}
    const password=String(form.get('password')||'');
    if(mode==='login'){await api.signIn(address,password);return;}
    const signedIn=await api.signUp(address,password,role,{name:required(form.get('name'),'Name',100),sector:String(form.get('sector')),company:recruiter?required(form.get('company'),'Company',120):'',bio:String(form.get('bio')||'').trim(),about:String(form.get('about')||'').trim(),skills:[]});
    if(!signedIn){choose(role,'login');setMessage('Check your email to confirm your account, then log in here.');}
  },'',false);
 };
 return <AuthFrame role={role} mode={mode} back={back}><div className="access-form-head"><div className="access-kicker">{signup?'LET’S MAKE AN INTRODUCTION':mode==='login'?'WELCOME BACK':'A FRESH START'}</div><h1>{title}</h1><p>{description}</p></div>
  {signup&&<div className="account-type" aria-label="Account type"><button disabled={busy} type="button" className={!recruiter?'selected':''} aria-pressed={!recruiter} onClick={()=>change('candidate','signup')}><Icon type="work"/><span><strong>I’m finding work</strong><small>Build my next chapter</small></span><span className="account-radio"/></button><button disabled={busy} type="button" className={recruiter?'selected':''} aria-pressed={recruiter} onClick={()=>change('recruiter','signup')}><Icon type="search"/><span><strong>I’m hiring talent</strong><small>Build my next team</small></span><span className="account-radio"/></button></div>}
  {message&&<div className="access-success" role="status"><Check/><span>{message}</span></div>}
  <form onSubmit={submit} className="access-form"><fieldset disabled={busy||!api.configured}>
    {signup&&<div className="access-field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required maxLength={100} placeholder="Your first and last name"/></div>}
    {signup&&recruiter&&<div className="access-field"><label htmlFor="company">Company</label><input id="company" name="company" autoComplete="organization" required maxLength={120} placeholder="Where you’re building something great"/></div>}
    <div className="access-field"><label htmlFor="email">{signup&&recruiter?'Work email':'Email'}</label><input id="email" name="email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder={recruiter?'you@company.com':'you@example.com'}/></div>
    {(mode==='login'||signup)&&<PasswordField signup={signup}/>}
    {signup&&<><div className="access-field"><label htmlFor="sector">Your field</label><select id="sector" name="sector" defaultValue="Tech">{sectors.map(s=><option key={s}>{s}</option>)}</select></div><details className="profile-intro"><summary>{recruiter?'Add a little about your company':'Introduce your work'}<span>Optional <span>+</span></span></summary><div className="access-field"><label htmlFor={recruiter?'about':'bio'}>{recruiter?'About the company':'Portfolio paragraph'}</label><textarea id={recruiter?'about':'bio'} name={recruiter?'about':'bio'} maxLength={6000} placeholder={recruiter?'What does your company do?':'What have you built, and what do you enjoy working on?'}/><span className="field-hint">You can add more to your profile anytime.</span></div></details></>}
    {mode==='login'&&<div className="forgot-row"><button type="button" className="access-link" onClick={()=>change(role,'reset')}>Forgot password?</button></div>}
    <button className="access-submit" type="submit">{busy?'Please wait…':mode==='reset'?'Send reset link':mode==='confirm'?'Send confirmation link':signup?'Create '+role+' account':'Log in'}<Arrow/></button>
  </fieldset></form>
  {signup?<><div className="signup-note"><Check/> Your profile is yours to build, at your own pace.</div><p className="access-switch">Already have an account? <button disabled={busy} onClick={()=>change(role,'login')}>Log in</button></p></>:mode==='login'?<>{role!=='admin'&&<p className="access-switch">New to Recruider? <button disabled={busy} onClick={()=>change(role,'signup')}>Create an account</button></p>}<button className="resend-button" disabled={busy} onClick={()=>change(role,'confirm')}>Resend confirmation email</button></>:<button className="back-login" disabled={busy} onClick={()=>change(role,'login')}>← Back to log in</button>}
  {!api.configured&&<div className="access-service-note" role="status">Account access is being set up. Please check back soon.</div>}
  {api.demo&&mode==='login'&&<details className="sample-accounts"><summary>Explore with a sample account <span>Local preview only</span></summary>{role!=='admin'&&<div className="sample-roles"><button onClick={()=>choose('candidate','login')} aria-pressed={!recruiter}>Candidates</button><button onClick={()=>choose('recruiter','login')} aria-pressed={recruiter}>Recruiters</button></div>}{demoProfiles.map(p=><div className="quick-login-item" key={p.id}><div className="row-flex"><div className="avatar">{initials(p.name)}</div><div><strong>{p.name}</strong><div>{p.company||p.sector}</div></div></div><button disabled={busy} onClick={()=>void act(()=>api.demoLogin!(p.id),'',false)}>Log in</button></div>)}</details>}
 </AuthFrame>;
}
export function ResetPasswordPage({api,act,busy,done,cancel}:{api:Gateway;act:Act;busy:boolean;done:()=>void;cancel:()=>void}){
 return <AuthFrame back={cancel}><div className="access-form-head"><div className="access-kicker">BACK TO WHAT’S NEXT</div><h1>Set a new password</h1><p>A fresh start. Make this one something only you know.</p></div><form className="access-form" onSubmit={e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);void act(async()=>{const password=required(f.get('password'),'Password',128);if(password!==f.get('confirm'))throw new Error('Passwords do not match.');await api.updatePassword(password);done();},'Password updated.',false);
 }}><fieldset disabled={busy}><PasswordField label="New password" signup/><PasswordField label="Confirm password" name="confirm" signup/><button className="access-submit" type="submit">Save password <Arrow/></button></fieldset></form><button className="back-login" onClick={cancel}>Cancel and sign out</button></AuthFrame>;
}
