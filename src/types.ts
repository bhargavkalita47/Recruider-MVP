export type Role = 'candidate' | 'recruiter' | 'admin';
export type Decision = 'interested' | 'pass';
export const sectors = ['Tech', 'Design', 'Marketing', 'Product', 'Other'] as const;
export interface Profile { id: string; role: Role; name: string; sector: string; company: string; bio: string; about: string; skills: string[]; created_at: string }
export interface Job { id: string; recruiter_id: string; title: string; sector: string; location: string; pay: string; blurb: string; description: string; active: boolean; created_at: string }
export interface Challenge { id: string; posted_by: string | null; title: string; sector: string; description: string; archived: boolean; created_at: string }
export interface Submission { id: string; challenge_id: string; candidate_id: string; text: string; reviewed: boolean; created_at: string }
export interface Badge { id: string; name: string; description: string }
export interface Award { id: string; candidate_id: string; badge_id: string; awarded_by: string; created_at: string }
export interface CandidateSwipe { candidate_id: string; job_id: string; decision: Decision }
export interface RecruiterSwipe { recruiter_id: string; candidate_id: string; job_id: string | null; decision: Decision }
export interface Match { id: string; candidate_id: string; recruiter_id: string; job_id: string; created_at: string }
export interface Message { id: string; match_id: string; sender_id: string; text: string; created_at: string }
export interface Snapshot { profiles: Profile[]; jobs: Job[]; challenges: Challenge[]; submissions: Submission[]; badges: Badge[]; awards: Award[]; candidate_swipes: CandidateSwipe[]; recruiter_swipes: RecruiterSwipe[]; matches: Match[] }
export const emptySnapshot = (): Snapshot => ({ profiles: [], jobs: [], challenges: [], submissions: [], badges: [], awards: [], candidate_swipes: [], recruiter_swipes: [], matches: [] });
export interface AuthUser { id: string; email?: string }
export type ProfileInput = Pick<Profile, 'name' | 'sector' | 'company' | 'bio' | 'about' | 'skills'>;
export type JobInput = Omit<Job, 'id' | 'created_at' | 'recruiter_id' | 'active'>;
export type ChallengeInput = Pick<Challenge, 'title' | 'sector' | 'description'>;
export interface Gateway {
  demo: boolean; configured: boolean;
  session(): Promise<AuthUser | null>;
  onAuth(fn: (user: AuthUser | null, recovery: boolean) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, role: Role, input: ProfileInput): Promise<boolean>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  snapshot(): Promise<Snapshot>;
  saveProfile(id: string, input: ProfileInput): Promise<void>;
  postJob(input: JobInput): Promise<void>;
  updateJob(id: string, input: JobInput): Promise<void>;
  setJobActive(id: string, active: boolean): Promise<void>;
  postChallenge(input: ChallengeInput): Promise<void>;
  archiveChallenge(id: string, archived: boolean): Promise<void>;
  deleteChallenge(id: string): Promise<void>;
  submitChallenge(id: string, text: string): Promise<void>;
  reviewSubmission(id: string, reviewed: boolean): Promise<void>;
  awardBadge(candidateId: string, badgeId: string): Promise<void>;
  candidateSwipe(jobId: string, decision: Decision): Promise<string | null>;
  recruiterSwipe(candidateId: string, decision: Decision, jobId: string | null): Promise<string | null>;
  messages(matchId: string, before?: string): Promise<Message[]>;
  sendMessage(matchId: string, text: string, id: string): Promise<void>;
  subscribe(matchId: string, refresh: () => void, status: (online: boolean) => void): () => void;
  demoLogin?(id: string): Promise<void>;
}
