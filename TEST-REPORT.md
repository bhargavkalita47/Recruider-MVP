# Verification — 2 October 2026

## Passed

- **TypeScript and production build:** `npm run check`.
- **PostgreSQL integration tests:** 10 checks inside one suite (11 reported test nodes), using PGlite. The actual migration runs before the checks.
  - Signup profile creation and forged admin metadata rejection.
  - Anonymous access denial.
  - Profile ownership and candidate privacy.
  - Job ownership, posting restrictions, and immutable ownership.
  - Same-job mutual matching, both interest orders, and duplicate prevention.
  - Chat participant isolation, sender spoofing prevention, immutable server timestamps.
  - Admin-only aggregate chat counts without message body access.
  - Unique submissions, blocked self-review and self-award.
  - Admin review and badge award, archive/restore, deletion protection.
  - Job closure prevents new interest and retains existing chat.
- **Browser workflows:** 7 passed in Google Chrome.
  - Candidate/recruiter mutual match, two-way chat, reload persistence, safe rendering of HTML-like text.
  - Challenge submission, admin review, badge award, profile save and reload.
  - Job create/edit/close/reopen, searchable results, challenge archive/restore/delete, all admin tables.
  - Desktop and 390px mobile layout, no page-level horizontal overflow, pointer swipe.
  - Branded landing navigation, candidate/recruiter signup routes, refresh persistence, show/hide password, and FAQ expansion.
  - Mobile menu, landing and account forms, forgot-password navigation, and browser back.
  - Scroll reveals complete when sections enter view, and reduced-motion mode keeps content and account navigation usable.
- **Supabase client transport tests:** 3 passed against intercepted HTTP responses using the actual Supabase JavaScript client.
  - Signup metadata and email confirmation state, password login, role loading, profile write/reload, logout, reset-email request.
  - Expired confirmation-link error display.
  - Recovery-link handling, password confirmation validation, password update.
- **Production dependency audit:** zero reported vulnerabilities at the time of verification.
- **Theme revision:** all interface colors reference the supplied theme tokens. The three requested font families are bundled locally with their licenses. The supplied logo now keeps its proportions and fits its header, footer, sidebar, and account-page containers. Desktop and mobile screenshots were reviewed after the change.
- **Visual review:** redesigned desktop and mobile landing/signup pages, desktop login, desktop candidate deck, and mobile candidate deck inspected from browser screenshots.

The configured production build is split into app, React, and Supabase chunks (approximately 149 KB combined JavaScript compressed, plus about 12 KB compressed CSS). Demo fixtures and the demo adapter are excluded from the production build.

## Not verified against a live service

No live Supabase project credentials, SMTP configuration, or Vercel project were supplied. Consequently, hosted deployment, real email delivery, managed Supabase Realtime connectivity, and two-device synchronization have not been verified.

Database tests emulate the Supabase auth schema and authenticated roles in real PostgreSQL. They do not boot Supabase's hosted Auth/Realtime services. Browser workflow tests use the explicitly labeled local demo. HTTP auth tests mock server responses. The tests do not replace the live launch checks in START-HERE.md.

The mutual-match functions use a per-candidate transaction lock and a uniqueness constraint. Tests verify both sequential interest orders and idempotency; they do not load-test concurrent hosted traffic.

## Repeat

```sh
npm ci
npm run check
npm run test:ui
npm run test:auth
```

Browser tests use an installed Google Chrome. For bundled Chromium, install it with Playwright and set `PLAYWRIGHT_CHANNEL=chromium`.




