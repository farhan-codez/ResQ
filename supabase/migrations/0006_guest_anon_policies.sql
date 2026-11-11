-- Migration: let guest devices create and refresh their profile.
-- Run after 0004_guests_table.sql.
--
-- Guests have no Supabase account, so the previous authenticated-only policies
-- blocked every insert from the app. The app generates a random guest id and
-- stores only the descriptor, so anon insert/select/update is required.

drop policy if exists "Guests can create profile" on public.guests;
create policy "Guests can create profile"
  on public.guests for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Guests can read profile" on public.guests;
create policy "Guests can read profile"
  on public.guests for select
  to anon, authenticated
  using (true);

drop policy if exists "Guests can update profile" on public.guests;
create policy "Guests can update profile"
  on public.guests for update
  to anon, authenticated
  using (true)
  with check (true);
