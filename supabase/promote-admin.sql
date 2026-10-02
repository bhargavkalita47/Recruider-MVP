-- Run in Supabase SQL Editor after creating and confirming your own account.
-- Replace YOUR_EMAIL_HERE with the exact account email. This is never called from the browser.
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('YOUR_EMAIL_HERE')
)
returning id, name, role;

-- Sign out and sign in again. One returned row confirms the role assignment.

