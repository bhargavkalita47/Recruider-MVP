# Launch Recruider

Your HTML prototype has been converted into a React + TypeScript app with Supabase accounts, PostgreSQL data, private chat, and Vercel hosting. The landing, login, signup, and password recovery pages have been redesigned around your original Recruider logos, with responsive layouts for candidates and hiring teams. The three role workspaces retain the original product features.

**The code is ready to configure and deploy. It has not been connected to your Supabase project or published to Vercel.** No private credentials are included.

## 1. Create the database

1. Create a **new Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor → New query**.
3. Paste the entire contents of [supabase/migrations/001_initial.sql](supabase/migrations/001_initial.sql) and run it once.
4. Open your project's **Connect** dialog or **Settings → API / API Keys**. Copy:
   - Project URL, such as `https://abcdefgh.supabase.co`
   - **Publishable key** (`sb_publishable_...`). A legacy public anon key also works.

The SQL creates every table, permission, matching function, realtime publication, four badge definitions, and three starter challenges. It creates no fake users, job listings, or submissions. Run it in a fresh project, not on top of an existing application database.

## 2. Deploy the app to Vercel

The simplest ongoing setup is a GitHub repository connected to Vercel:

1. Create a GitHub repository and upload the contents of this **recruider** folder, including `src`, `public`, `supabase`, `package.json`, `package-lock.json`, `vercel.json`, and the configuration files. Keep `package.json` at the repository root.
2. At [vercel.com/new](https://vercel.com/new), import that repository.
3. Use framework **Vite**, build command **npm run build**, output directory **dist**, and Node.js **24.x**. These are already configured in the project.
4. Add these two environment variables **before deploying**, using the values from step 1:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key |

5. Click **Deploy**. Save the resulting `https://your-app.vercel.app` URL.

Do not upload `node_modules`, `dist`, `demo-dist`, `auth-test-dist`, test results, or local `.env` files. The supplied ZIP already excludes these. If you upload the whole parent folder, set Vercel's Root Directory to the folder containing `package.json`.

Vite reads these variables at build time. After changing them in Vercel, **redeploy**.

Prefer the terminal? Install Node.js 24, open a terminal in this folder, run `npm ci`, then `npx vercel`. Link the resulting project, add the same two variables in its Vercel settings, and run `npx vercel --prod`.

## 3. Enable signup and password emails

In Supabase, under **Authentication → URL Configuration**:

- **Site URL:** your final Vercel URL.
- **Redirect URLs:** add your exact Vercel URL and `https://your-app.vercel.app/?recovery=1`.
- For local development, optionally add `http://localhost:5173`, `http://localhost:5173/?recovery=1`, and the corresponding `127.0.0.1` URLs.
- If you add a custom domain later, update the Site URL and allow its confirmation and recovery URLs too.

Keep the **Email** provider and **Confirm email** enabled. Configure **custom SMTP** with your email provider before opening signups to the public. Supabase's default sender is for testing and restricts recipients; it is not a public launch email service. Enter SMTP credentials only in Supabase. Verify your sending domain and test with an address outside your Supabase team.

The app supports signup confirmation, resending confirmation emails, login, logout, forgotten passwords, password updates, and expired-link errors.

## 4. Make your admin account

1. Sign up in the deployed app as a candidate using your own email.
2. Confirm the email.
3. Open [supabase/promote-admin.sql](supabase/promote-admin.sql), replace `YOUR_EMAIL_HERE` with that exact email, and run it in Supabase SQL Editor.
4. Sign out and log in again through **Admin access** in the landing-page footer.

There is no shared password or public admin signup. Opening the admin login does not grant privileges. Roles are enforced in the database.

## 5. Check your live app

Use two real accounts, preferably in separate browsers:

1. Recruiter: create a company profile and post a job.
2. Candidate: sign up, confirm email, edit the portfolio, and show interest in that job.
3. Recruiter: find that candidate, choose **Interested**, and select the same job.
4. Both: open **Matches & Chat** and exchange a message; reload and confirm it remains.
5. Candidate: submit a challenge. Admin: review it and award a badge.
6. Check that password reset emails arrive and the reset link opens the password form.

These live checks require your configured project and email sender. The supplied automated tests cover database permissions and matching in PostgreSQL, browser workflows in the local demo, and the real Supabase client against mocked HTTP responses.

## Preview locally

Install [Node.js 24](https://nodejs.org/), then open a terminal in this folder:

```sh
npm ci
npm run demo
```

Open the local URL printed in the terminal. This local demo contains the original sample people and jobs. On the login page, expand **Explore with a sample account** to try an account. The workspace is clearly labeled, saves only in that browser, and lets you switch among all three roles. It never writes to Supabase. The standard production build excludes the demo adapter and sample data.

To connect local development to your actual Supabase project:

```sh
npm run setup
npm run dev
```

The setup command asks for the two public project values and writes an ignored `.env.local` file. Do not enter a Supabase service-role or secret key. Alternatively, copy `.env.example` to `.env.local` and fill it in yourself.

## If something needs fixing

- **Account access is being set up:** the two Vercel variables were missing or invalid at build time. Correct them and redeploy.
- **Cannot load your workspace:** confirm that the SQL migration ran successfully before creating accounts.
- **Email not arriving:** check custom SMTP, the sender domain, Supabase Auth logs, and spam folders. Use **Resend confirmation email** when needed.
- **Email links lead to the wrong site:** fix Site URL and Redirect URLs, then request a new link.
- **No candidates/jobs:** production starts with real accounts only. Create recruiter and candidate accounts first.
- **No match:** both people must show interest in the same job. The recruiter must select a position they own.
- **Chat says it checks every 8 seconds:** it is using the polling fallback. The migration enables Realtime for messages and matches; check Supabase's Realtime settings if it persists.
- **Challenge cannot be deleted:** it has submissions. Archive it to preserve the candidates' work.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Node.js 24 on Vercel](https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

