# Recruider

**Start with [START-HERE.md](START-HERE.md).** It covers Supabase, Vercel, email, and your first admin account.

## Features

| Area | Implemented |
| --- | --- |
| Landing | Branded product introduction, talent and hiring sections, how it works, FAQs, mobile menu; supplied logos and wordmark |
| Candidate discovery | Drag/swipe cards, pass/interest, job search, company browse, job details |
| Candidate profile | Name, sector, skills, portfolio paragraph, challenge history, earned badges, incoming recruiter interest |
| Challenges | Global and recruiter challenges, sector filter, one submission per candidate per challenge |
| Recruiter discovery | Candidate swipe deck, search by name/sector/skill, portfolios, badge evidence, position picker |
| Recruiter workspace | Job creation, editing, closing/reopening, company profile, jobs grouped by sector, custom challenges and submissions |
| Matching | Database-created mutual matches for the same candidate and job; idempotent repeated decisions |
| Chat | Participant-only messages, Realtime updates, reconnect polling, earlier message loading, retry-safe message IDs |
| Admin | Dashboard, counts, review queue, challenge search, archive/restore/delete, badge awards, backend data tables |
| Accounts | Dedicated branded login and signup pages, candidate/recruiter selection, confirmation/resend, password reset, show/hide password, logout, persisted sessions |
| Usability | Responsive mobile navigation, subtle scroll reveals and interaction feedback, reduced-motion support, keyboard focus, dialog focus trap/Escape, loading/error/empty states, duplicate-submit prevention |

## Changes needed to turn the prototype into a real app

- Demo account buttons are replaced by real authentication in production.
- Public admin access is replaced by database-controlled role assignment.
- All real data persists in Supabase.
- Profile edits have an explicit Save button.
- Match percentages are no longer random. The original circular stamp now says **overlap**: 60 points for the same sector, plus up to 40 for the fraction of listed skills appearing in the job text. Its tooltip explains the formula. It is a browsing hint, not a prediction or hiring assessment. Recruiter cards use the first open job; no open job means no score.
- A recruiter can revisit a candidate via search and select another position. Existing matches/chats remain after later swipe changes or job closure.
- Companies are linked by recruiter profile ID, so changing a company name updates its jobs consistently. Each recruiter account has its own company profile; shared company/team management was not part of the supplied prototype.
- Recruiters can edit/close jobs and archive their own challenges.
- Challenge portfolios retain archived submissions.

The source HTML is unchanged at its original location. Its shared theme and workspace styles are in `src/styles.css`; the workspace additions are in `src/production.css`. All UI colors reference the supplied Corporate Minimalism Ink Display and Bright Pastel Accent tokens. Space Grotesk, Plus Jakarta Sans, and JetBrains Mono are served locally from `public/fonts`, with their licenses included. Public pages are in `src/Marketing.tsx` and `src/marketing.css`; the supplied, unmodified brand images are in `public/brand`.

## Architecture

Vite + React + TypeScript → Supabase Auth, Postgres, and Realtime. Vercel serves static assets. No application server, Docker, paid AI API, separate backend hosting, storage bucket, or service-role key is needed for these features.

Portfolios and challenge submissions are text-based, matching the original. File uploads, payments, interview scheduling, resume parsing, and AI ranking were not in the prototype and are not included.

- `src/App.tsx`: role-based screens and forms.
- `src/Marketing.tsx`: landing, login, signup, confirmation, and password recovery pages.
- `src/marketing.css`: responsive public-page design.
- `src/motion.ts` and `src/motion.css`: lightweight viewport reveals, page transitions, and interaction feedback.
- `public/brand`: your supplied symbol, wordmark, and combined lockup.
- `src/Chat.tsx`: private chat interface.
- `src/gateway.ts`: real Supabase operations.
- `src/types.ts`: shared data contracts.
- `src/demo.ts` and `src/demo-data.json`: local demo only.
- `supabase/migrations/001_initial.sql`: schema, constraints, RLS, auth profile trigger, atomic swipe/match functions, Realtime, initial badges/challenges.
- `supabase/promote-admin.sql`: owner-run admin assignment.
- `vercel.json`: hosting and security headers.

The Supabase project URL currently supports hosted `https://<project>.supabase.co` projects. For a custom Supabase API domain, adjust URL validation in `gateway.ts` and the connect-src hosts in `vercel.json`.

## Data access

All application tables require authentication. Candidates can edit only their own profiles and see their own submissions and swipes. Recruiters can browse candidate portfolios, including submitted challenge text; candidates should use submissions as shareable work samples. Other candidates cannot browse these portfolios.

Recruiters can edit only their own jobs and archive their own challenges. Only admins can review submissions, award badges, or delete empty challenges. Badges and roles cannot be self-assigned. Contact emails stay in Supabase Auth, outside public profile queries.

Only match participants can read or send message text. Admin tables get aggregate message counts through a separate function; they cannot read chat bodies through the application API.

Matching uses database transactions, a per-candidate advisory lock, and a unique candidate/job constraint. Both interest orders are supported, including concurrent requests. Existing matches are retained as conversation history.

## Commands

```sh
npm ci
npm run setup        # enter your public Supabase project values
npm run dev          # local app with Supabase
npm run demo         # original samples, browser-local only
npm run check        # PostgreSQL tests + TypeScript + production build
npm run test:ui      # browser workflows (Google Chrome by default)
npm run test:auth    # real Supabase client with intercepted test responses
npm run build
npm run preview
```

Node.js 24 is pinned in package.json. Runtime versions are locked in package-lock.json. Browser tests use Chrome; install it or set `PLAYWRIGHT_CHANNEL=chromium` after running `npx playwright install chromium`.

## Verification and limits

See [TEST-REPORT.md](TEST-REPORT.md) for completed checks and their scope. Automated database tests use PGlite (PostgreSQL running locally), including Supabase-style authenticated roles. Auth transport tests intercept HTTP requests and do not prove delivery of real email.

A live Supabase project and Vercel account were not supplied. The hosted deployment, email delivery, and actual multi-device Realtime connection must be checked after configuration using START-HERE.md.

This is a launch-sized implementation. It loads permitted workspace records in deterministic 500-row database batches and filters search locally; a much larger platform should move browsing/search to server-side pagination. Chat loads 100 messages at a time. Background workspace refresh runs every 45 seconds and on window focus; chat checks every 8 seconds as a fallback.

No secrets belong in Vite environment variables. Use only the publishable/public anon key. Supabase RLS, column grants, and database functions enforce the security boundary.





