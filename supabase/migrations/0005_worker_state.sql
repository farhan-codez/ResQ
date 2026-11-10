-- Migration: add worker_state table for detection worker
-- Run after 0004_guests_table.sql

create table if not exists public.worker_state (
  worker_name text primary key,
  last_run timestamptz not null,
  processed_count integer default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.worker_state enable row level security;

-- Only service role can manage worker state
create policy "Service role can manage worker state"
  on public.worker_state for all
  to authenticated
  using (false); -- Only service role bypasses RLS

-- Insert initial state for detection worker
insert into public.worker_state (worker_name, last_run, processed_count)
values ('detection-worker', now() - interval '24 hours', 0)
on conflict (worker_name) do nothing;

-- Add trigger to auto-update updated_at
create or replace function update_worker_state_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger update_worker_state_timestamp
  before update on public.worker_state
  for each row execute function update_worker_state_timestamp();