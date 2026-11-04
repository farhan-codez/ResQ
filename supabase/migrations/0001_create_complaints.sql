-- ResQ — Complaints table migration
-- Run this in your Supabase project SQL Editor, then enable Realtime for the table
-- (Database → Replication → toggle public.complaints)

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  title text not null,
  description text,
  latitude float8 not null,
  longitude float8 not null,
  severity text check (severity in ('low', 'medium', 'high')) not null default 'medium',
  status text default 'pending' not null,
  is_satellite_verified boolean default false not null
);

-- Indexes
create index if not exists idx_complaints_created_at on public.complaints (created_at desc);
create index if not exists idx_complaints_severity on public.complaints (severity);
create index if not exists idx_complaints_status on public.complaints (status);

-- Enable Realtime so new inserts push instantly to the dashboard
alter publication supabase_realtime add table public.complaints;

-- Row Level Security: public read + insert (community reporting)
alter table public.complaints enable row level security;

create policy "Allow public read access" on public.complaints
  for select using (true);

create policy "Allow public insert" on public.complaints
  for insert with check (true);