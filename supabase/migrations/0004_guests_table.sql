-- Migration: add guests table for facial-scan guest users
-- Run after 0003_dispatch_and_authorities.sql

create table if not exists public.guests (
  id text primary key,
  face_descriptor real[] not null,
  created_at timestamptz default now(),
  last_seen timestamptz default now(),
  upgraded_to_citizen boolean default false,
  citizen_user_id uuid references auth.users(id)
);

-- Enable RLS
alter table public.guests enable row level security;

-- Guests can read their own profile
create policy "Guests can read own profile"
  on public.guests for select
  to authenticated
  using (id = current_setting('request.jwt.claims', true)::json->>'guest_id');

-- Guests can update their own last_seen
create policy "Guests can update own last_seen"
  on public.guests for update
  to authenticated
  using (id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  with check (id = current_setting('request.jwt.claims', true)::json->>'guest_id');

-- Service role can insert/update guests (for edge functions)
create policy "Service role can manage guests"
  on public.guests for all
  to authenticated
  using (false); -- Only service role bypasses RLS

-- Index for face descriptor similarity search (using pgvector if available)
-- create index if not exists idx_guests_face_descriptor on public.guests using ivfflat (face_descriptor vector_cosine_ops) with (lists = 100);

-- Add guest_id column to complaints for guest reports
alter table public.complaints
  add column if not exists guest_id text references public.guests(id);

-- Add guest_id to dispatch_alerts for tracking
alter table public.dispatch_alerts
  add column if not exists guest_id text references public.guests(id);