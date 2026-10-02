import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Gateway, Snapshot, AuthUser, ProfileInput, Role, JobInput, ChallengeInput, Decision, Message } from './types';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && !!key && !key.includes('YOUR_');
const client: SupabaseClient | null = valid ? createClient(url, key) : null;
const db = () => {
  if (!client) throw new Error('Connect Supabase first. Follow START-HERE.md in your app folder.');
  return client;
};
function checked<T extends { data?: unknown; error: { message: string } | null }>({ data, error }: T): T['data'] {
  if (error) throw new Error(error.message);
  return data;
}
async function userId() {
  const { user } = checked(await db().auth.getUser());
  if (!user) throw new Error('Please sign in again.');
  return user.id;
}
async function rows(table: string) {
  const result: unknown[] = [];
  const keys = table === 'candidate_swipes' ? ['candidate_id', 'job_id'] : table === 'recruiter_swipes' ? ['recruiter_id', 'candidate_id'] : ['id'];
  for (let offset = 0; ; offset += 500) {
    let query = db().from(table).select('*');
    for (const column of keys) query = query.order(column);
    const page = checked(await query.range(offset, offset + 499)) || [];
    result.push(...page);
    if (page.length < 500) return result;
  }
}
const tables = ['profiles', 'jobs', 'challenges', 'submissions', 'badges', 'awards', 'candidate_swipes', 'recruiter_swipes', 'matches'] as const;
export const gateway: Gateway = {
  demo: false, configured: valid,
  async session() {
    if (!client) return null;
    return checked(await client.auth.getSession()).session?.user || null;
  },
  onAuth(fn) {
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange((event, session) => {
      // No awaited Supabase calls inside auth callback (the auth lock is still held).
      fn(session?.user || null, event === 'PASSWORD_RECOVERY');
    });
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) { checked(await db().auth.signInWithPassword({ email, password })); },
  async signUp(email: string, password: string, role: Role, input: ProfileInput) {
    if (role === 'admin') throw new Error('Administrator accounts are assigned by the platform owner.');
    const result = checked(await db().auth.signUp({ email, password, options: {
      emailRedirectTo: window.location.origin,
      data: { role, ...input }
    }}));
    return !!result.session;
  },
  async signOut() { checked(await db().auth.signOut({ scope: 'local' })); },
  async resetPassword(email) {
    checked(await db().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/?recovery=1' }));
  },
  async resendConfirmation(email) { checked(await db().auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })); },
  async updatePassword(password) { checked(await db().auth.updateUser({ password })); },
  async snapshot() {
    const values = await Promise.all(tables.map(rows));
    const data = Object.fromEntries(tables.map((table, i) => [table, values[i]])) as unknown as Snapshot;
    for (const table of ['jobs', 'challenges', 'submissions', 'matches'] as const) {
      data[table].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    }
    return data;
  },
  async saveProfile(id, input) { checked(await db().from('profiles').update(input).eq('id', id).select('id').single()); },
  async postJob(input: JobInput) { checked(await db().from('jobs').insert({ ...input, recruiter_id: await userId() })); },
  async updateJob(id, input) { checked(await db().from('jobs').update(input).eq('id', id).select('id').single()); },
  async setJobActive(id, active) { checked(await db().from('jobs').update({ active }).eq('id', id).select('id').single()); },
  async postChallenge(input: ChallengeInput) { checked(await db().from('challenges').insert({ ...input, posted_by: await userId() })); },
  async archiveChallenge(id, archived) { checked(await db().from('challenges').update({ archived }).eq('id', id).select('id').single()); },
  async deleteChallenge(id) { checked(await db().from('challenges').delete().eq('id', id).select('id').single()); },
  async submitChallenge(id, text) { checked(await db().from('submissions').insert({ challenge_id: id, candidate_id: await userId(), text })); },
  async reviewSubmission(id, reviewed) { checked(await db().from('submissions').update({ reviewed }).eq('id', id).select('id').single()); },
  async awardBadge(candidateId, badgeId) { checked(await db().from('awards').insert({ candidate_id: candidateId, badge_id: badgeId, awarded_by: await userId() })); },
  async candidateSwipe(jobId: string, decision: Decision) {
    return checked(await db().rpc('record_candidate_swipe', { p_job_id: jobId, p_decision: decision })) as string | null;
  },
  async recruiterSwipe(candidateId, decision, jobId) {
    return checked(await db().rpc('record_recruiter_swipe', { p_candidate_id: candidateId, p_decision: decision, p_job_id: jobId })) as string | null;
  },
  async messages(matchId, before) {
    let query = db().from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100);
    if (before) { const [time, id] = before.split('~'); if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(Date.parse(time))) throw new Error('Invalid message cursor.'); query = query.or('created_at.lt.' + time + ',and(created_at.eq.' + time + ',id.lt.' + id + ')'); }
    return (checked(await query) as Message[]).reverse();
  },
  async sendMessage(matchId, text, id) {
    const result = await db().from('messages').insert({ id, match_id: matchId, sender_id: await userId(), text });
    // The same client-generated message id makes a network retry idempotent.
    if (result.error?.code !== '23505') checked(result);
  },
  subscribe(matchId, refresh, status) {
    const channel = db().channel('recruider-' + matchId + '-' + crypto.randomUUID())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: matchId ? 'messages' : 'matches', ...(matchId ? { filter: 'match_id=eq.' + matchId } : {}) }, refresh)
      .subscribe(state => status(state === 'SUBSCRIBED'));
    return () => { void db().removeChannel(channel); };
  }
};
export async function messageCounts(): Promise<Record<string, number>> {
  if (import.meta.env.MODE === 'demo') return {};
  const list = checked(await db().rpc('admin_message_counts')) as { match_id: string; total: number }[];
  return Object.fromEntries(list.map(row => [row.match_id, Number(row.total)]));
}


