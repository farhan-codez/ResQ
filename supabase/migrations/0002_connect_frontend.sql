-- ResQ 0002: schema the frontend needs (auth profiles, richer complaints, timeline, detections, storage, RLS).
-- Safe on a fresh project (after 0001) and on one where 0001 already ran. Run in the Supabase SQL editor.

-- ---------- complaints: columns the UI uses ----------
alter table public.complaints alter column id drop default;
alter table public.complaints alter column id type text using id::text;
alter table public.complaints alter column id set default 'RQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

alter table public.complaints
  add column if not exists place text not null default 'Ghana',
  add column if not exists region text not null default 'Ghana',
  add column if not exists photos text[] not null default '{}',
  add column if not exists reporter_name text,
  add column if not exists reporter_id uuid references auth.users (id) on delete set null,
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists assigned_team text;

alter table public.complaints drop constraint if exists complaints_status_check;
alter table public.complaints add constraint complaints_status_check check (status in ('pending', 'investigating', 'resolved'));

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Citizen',
  email text not null default '',
  role text not null default 'citizen' check (role in ('citizen', 'regulator')),
  ghana_card_path text,
  verification text not null default 'pending' check (verification in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), 'Citizen'),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_regulator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'regulator');
$$;

alter table public.profiles enable row level security;
drop policy if exists "profiles read own or regulator" on public.profiles;
create policy "profiles read own or regulator" on public.profiles for select using (id = auth.uid() or public.is_regulator());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- users can never change their own role or verification
revoke update on public.profiles from anon, authenticated;
grant update (full_name, ghana_card_path) on public.profiles to authenticated;

-- ---------- complaints: RLS ----------
alter table public.complaints enable row level security;
drop policy if exists "Allow public insert" on public.complaints;
drop policy if exists "complaints insert signed in" on public.complaints;
create policy "complaints insert signed in" on public.complaints for insert to authenticated
  with check (status = 'pending' and assigned_team is null and (reporter_id is null or reporter_id = auth.uid()));
drop policy if exists "complaints regulators update" on public.complaints;
create policy "complaints regulators update" on public.complaints for update to authenticated
  using (public.is_regulator()) with check (public.is_regulator());
revoke update on public.complaints from anon, authenticated;
grant update (status, assigned_team) on public.complaints to authenticated;

-- ---------- timeline (written only by triggers) ----------
create table if not exists public.complaint_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id text not null references public.complaints (id) on delete cascade,
  created_at timestamptz not null default now(),
  label text not null,
  by_name text not null,
  status text check (status in ('pending', 'investigating', 'resolved'))
);
create index if not exists idx_events_complaint on public.complaint_events (complaint_id, created_at);
alter table public.complaint_events enable row level security;
drop policy if exists "events public read" on public.complaint_events;
create policy "events public read" on public.complaint_events for select using (true);

create or replace function public.log_complaint_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.complaint_events (complaint_id, label, by_name, status)
    values (new.id, 'Report submitted', case when new.is_anonymous then 'Anonymous' else coalesce(new.reporter_name, 'Citizen') end, 'pending');
  else
    if new.status is distinct from old.status then
      insert into public.complaint_events (complaint_id, label, by_name, status)
      values (new.id, 'Status changed to ' || initcap(new.status), 'Regulator desk', new.status);
    end if;
    if new.assigned_team is distinct from old.assigned_team and new.assigned_team is not null then
      insert into public.complaint_events (complaint_id, label, by_name)
      values (new.id, 'Assigned to ' || new.assigned_team, 'Regulator desk');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists complaints_log_events on public.complaints;
create trigger complaints_log_events after insert or update on public.complaints for each row execute function public.log_complaint_events();

-- ---------- satellite detections (written by the Earth Engine worker with the service role key) ----------
create table if not exists public.detections (
  id text primary key,
  name text not null,
  detected_at timestamptz not null default now(),
  confidence float8 not null,
  area_ha float8 not null,
  points jsonb not null
);
alter table public.detections enable row level security;
drop policy if exists "detections public read" on public.detections;
create policy "detections public read" on public.detections for select using (true);

-- ---------- realtime ----------
do $$
declare t text;
begin
  foreach t in array array['complaints', 'complaint_events'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('report-photos', 'report-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('ghana-cards', 'ghana-cards', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report photos upload own folder" on storage.objects;
create policy "report photos upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ghana card upload own folder" on storage.objects;
create policy "ghana card upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'ghana-cards' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ghana card read own or regulator" on storage.objects;
create policy "ghana card read own or regulator" on storage.objects for select to authenticated
  using (bucket_id = 'ghana-cards' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_regulator()));

-- Make someone a regulator (run manually, replacing the email):
--   update public.profiles set role = 'regulator' where email = 'someone@gmail.com';
