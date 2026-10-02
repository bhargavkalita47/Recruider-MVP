// Local demonstration adapter. Imported only by "npm run demo"; excluded from production.
import seed from './demo-data.json';
import type { AuthUser, Gateway, Snapshot, Role, Message } from './types';
const key='recruider-demo-v1';
type DemoState={data:Snapshot;messages:Message[];emails:Record<string,string>};
function initial():DemoState{return structuredClone(seed) as DemoState;}
let state:DemoState;
try{state=JSON.parse(localStorage.getItem(key)||'null')||initial();}catch{state=initial();}
let current:string|null=sessionStorage.getItem(key+'-user');
const listeners=new Set<(user:AuthUser|null,recovery:boolean)=>void>();
const subscriptions=new Set<()=>void>();
const persist=()=>{localStorage.setItem(key,JSON.stringify(state));subscriptions.forEach(fn=>fn());};
const auth=()=>{if(current)sessionStorage.setItem(key+'-user',current);else sessionStorage.removeItem(key+'-user');listeners.forEach(fn=>fn(current?{id:current}:null,false));};
const me=()=>{const p=state.data.profiles.find(p=>p.id===current);if(!p)throw new Error('Please log in.');return p;};
const requireRole=(...roles:Role[])=>{if(!roles.includes(me().role))throw new Error('Access denied.');};
const id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
const mutate=(fn:()=>void)=>{fn();persist();};
function match(candidateId:string,jobId:string|null){
  const job=state.data.jobs.find(j=>j.id===jobId);
  if(!job)return null;
  const c=state.data.candidate_swipes.some(s=>s.candidate_id===candidateId&&s.job_id===jobId&&s.decision==='interested');
  const r=state.data.recruiter_swipes.some(s=>s.recruiter_id===job.recruiter_id&&s.candidate_id===candidateId&&s.job_id===jobId&&s.decision==='interested');
  if(!c||!r)return null;
  let m=state.data.matches.find(m=>m.candidate_id===candidateId&&m.job_id===jobId);
  if(!m){m={id:id(),candidate_id:candidateId,recruiter_id:job.recruiter_id,job_id:job.id,created_at:now()};state.data.matches.push(m);}
  return m.id;
}
export const demoGateway:Gateway={
  demo:true,configured:true,
  async session(){return current?{id:current}:null;},
  onAuth(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async demoLogin(userId){current=userId;auth();},
  async signIn(email){const found=Object.entries(state.emails).find(([,v])=>v.toLowerCase()===email.toLowerCase());if(!found)throw new Error('Use a sample account in the local demo.');current=found[0];auth();},
  async signUp(email,_password,role,input){if(role==='admin')throw new Error('Admin signup is disabled.');if(Object.values(state.emails).includes(email))throw new Error('Email already exists in this demo.');const userId=id();state.data.profiles.push({id:userId,role,...input,created_at:now()});state.emails[userId]=email;persist();current=userId;auth();return true;},
  async signOut(){current=null;auth();},
  async resetPassword(){throw new Error('Email reset is available in the Supabase app. Use sample logins in this demo.');},
  async resendConfirmation(){throw new Error('Confirmation emails require Supabase. Use sample logins in this demo.');},
  async updatePassword(){throw new Error('Password updates require Supabase.');},
  async snapshot(){return structuredClone(state.data);},
  async saveProfile(userId,input){if(userId!==me().id)throw new Error('Access denied.');mutate(()=>Object.assign(me(),input));},
  async postJob(input){requireRole('recruiter');mutate(()=>state.data.jobs.push({id:id(),recruiter_id:me().id,...input,active:true,created_at:now()}));},
  async updateJob(jobId,input){const job=state.data.jobs.find(j=>j.id===jobId&&j.recruiter_id===me().id);if(!job)throw new Error('Job not found.');mutate(()=>Object.assign(job,input));},
  async setJobActive(jobId,active){const job=state.data.jobs.find(j=>j.id===jobId&&j.recruiter_id===me().id);if(!job)throw new Error('Job not found.');mutate(()=>{job.active=active;});},
  async postChallenge(input){requireRole('admin','recruiter');mutate(()=>state.data.challenges.push({id:id(),posted_by:me().id,...input,archived:false,created_at:now()}));},
  async archiveChallenge(challengeId,archived){const ch=state.data.challenges.find(c=>c.id===challengeId);if(!ch||(me().role!=='admin'&&ch.posted_by!==me().id))throw new Error('Access denied.');mutate(()=>{ch.archived=archived;});},
  async deleteChallenge(challengeId){requireRole('admin');if(state.data.submissions.some(s=>s.challenge_id===challengeId))throw new Error('Archive a challenge with submissions.');mutate(()=>{state.data.challenges=state.data.challenges.filter(c=>c.id!==challengeId);});},
  async submitChallenge(challengeId,text){requireRole('candidate');if(!state.data.challenges.some(c=>c.id===challengeId&&!c.archived))throw new Error('Challenge closed.');if(state.data.submissions.some(s=>s.challenge_id===challengeId&&s.candidate_id===me().id))throw new Error('Already submitted.');mutate(()=>state.data.submissions.push({id:id(),challenge_id:challengeId,candidate_id:me().id,text,reviewed:false,created_at:now()}));},
  async reviewSubmission(submissionId,reviewed){requireRole('admin');mutate(()=>{state.data.submissions.find(s=>s.id===submissionId)!.reviewed=reviewed;});},
  async awardBadge(candidateId,badgeId){requireRole('admin');if(state.data.awards.some(a=>a.candidate_id===candidateId&&a.badge_id===badgeId))throw new Error('Already awarded.');mutate(()=>state.data.awards.push({id:id(),candidate_id:candidateId,badge_id:badgeId,awarded_by:me().id,created_at:now()}));},
  async candidateSwipe(jobId,decision){requireRole('candidate');const cid=me().id;const row=state.data.candidate_swipes.find(s=>s.candidate_id===cid&&s.job_id===jobId);if(row)row.decision=decision;else state.data.candidate_swipes.push({candidate_id:cid,job_id:jobId,decision});const result=match(cid,jobId);persist();return result;},
  async recruiterSwipe(candidateId,decision,jobId){requireRole('recruiter');const rid=me().id;const row=state.data.recruiter_swipes.find(s=>s.recruiter_id===rid&&s.candidate_id===candidateId);if(row)Object.assign(row,{job_id:jobId,decision});else state.data.recruiter_swipes.push({recruiter_id:rid,candidate_id:candidateId,job_id:jobId,decision});const result=match(candidateId,jobId);persist();return result;},
  async messages(matchId,before){const cursor=before?.split('~');return structuredClone(state.messages.filter(m=>m.match_id===matchId&&(!cursor||m.created_at<cursor[0]||(m.created_at===cursor[0]&&m.id<cursor[1]))).slice(-100));},
  async sendMessage(matchId,text,messageId){if(!state.data.matches.some(m=>m.id===matchId&&(m.candidate_id===me().id||m.recruiter_id===me().id)))throw new Error('Match required.');if(state.messages.some(m=>m.id===messageId))return;mutate(()=>state.messages.push({id:messageId,match_id:matchId,sender_id:me().id,text,created_at:now()}));},
  subscribe(_matchId,refresh,status){subscriptions.add(refresh);status(true);return()=>subscriptions.delete(refresh);}
};
window.addEventListener('storage',e=>{if(e.key===key&&e.newValue){state=JSON.parse(e.newValue);subscriptions.forEach(fn=>fn());}});

