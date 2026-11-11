-- Promote an existing ResQ account to the regulator role.
--
-- How to use:
--   1. Create the account first (sign up in the app or Authentication > Users).
--   2. Replace the email below with that account's email.
--   3. Run this in the Supabase SQL editor.
--
-- For a demo regulator, sign up with regulator@resq.gov.gh and run:
--   update public.profiles set role = 'regulator' where email = 'regulator@resq.gov.gh';

update public.profiles
set role = 'regulator'
where email = 'regulator@resq.gov.gh';

-- Check the result:
--   select id, email, role from public.profiles where role = 'regulator';
--
-- To return an account to a citizen:
--   update public.profiles set role = 'citizen' where email = 'regulator@resq.gov.gh';
