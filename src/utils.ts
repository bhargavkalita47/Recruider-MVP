import type { Job, Profile } from './types';
export const initials = (name = '') => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const dateLabel = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
export function required(value: FormDataEntryValue | null, label: string, max = 200) {
  const result = String(value ?? '').trim();
  if (!result) throw new Error(label + ' is required.');
  if (result.length > max) throw new Error(label + ' must be ' + max + ' characters or fewer.');
  return result;
}
// An explainable overlap hint, never an assessment of ability or a hiring recommendation.
export function fitScore(candidate: Profile, job?: Job) {
  if (!job) return null;
  const words = (job.title + ' ' + job.blurb + ' ' + job.description).toLowerCase();
  const overlap = candidate.skills.filter(skill => words.includes(skill.toLowerCase())).length;
  return Math.min(100, (candidate.sector === job.sector ? 60 : 0) + (candidate.skills.length ? Math.round(40 * overlap / candidate.skills.length) : 0));
}
export function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Something went wrong. Please try again.';
  if (message.includes('23505') || message.includes('duplicate key')) return 'This has already been saved. Refresh to see the latest version.';
  if (message.includes('Failed to fetch')) return 'Could not connect. Check your connection and try again.';
  return message;
}
