# ResQ

Galamsey and water pollution reporting. React + Vite + Tailwind frontend, Supabase backend.

## Run
1. `pnpm install`
2. Put your anon key in `.env` (`VITE_SUPABASE_ANON_KEY`). Without it the app runs in demo mode (seed data, fake sign-in).
3. Supabase SQL editor: run `supabase/migrations/0001_create_complaints.sql`, then `0002_connect_frontend.sql`.
4. Supabase > Authentication: turn **Confirm email** off (signup uploads the Ghana Card right after account creation). For Google sign-in, enable the Google provider and add your site URL to Redirect URLs.
5. `pnpm dev`
6. Make a regulator: `update public.profiles set role = 'regulator' where email = 'you@gmail.com';`

## Backend map
- Auth: Login, Signup, Google, Sign out -> Supabase Auth. Role comes from `profiles.role`.
- Reports: `complaints` (live via realtime). Timeline: `complaint_events` (written by DB trigger).
- Photos: `report-photos` bucket (public). Ghana Card: `ghana-cards` bucket (private).
- Status and team changes: regulators only (RLS).
- Map overlays: `detections` table (filled by the Earth Engine worker with the service role key).
