-- Migration: add authorities and dispatch_alerts tables
-- Run after 0002_connect_frontend.sql

-- Authorities table: organisations that can be dispatched to incidents
create table if not exists public.authorities (
  id text primary key,
  name text not null,
  type text not null check (type in ('epa', 'minerals_commission', 'forestry', 'nadmo', 'police', 'fire', 'ambulance', 'other')),
  region text not null,
  contact_phone text,
  contact_email text,
  coverage_radius_km integer default 50,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.authorities enable row level security;

-- Regulators can read all authorities
create policy "Regulators can read authorities"
  on public.authorities for select
  to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'regulator');

-- Citizens cannot read authorities (they're internal)
-- (no policy for authenticated citizens = no access)

-- Seed some default authorities
insert into public.authorities (id, name, type, region, contact_phone, contact_email, coverage_radius_km) values
  ('AUTH-MC-WR', 'Minerals Commission Task Force, Western', 'minerals_commission', 'Western', '+233 31 202 1234', 'western@mincom.gov.gh', 80),
  ('AUTH-MC-CR', 'Minerals Commission Task Force, Central', 'minerals_commission', 'Central', '+233 33 219 5678', 'central@mincom.gov.gh', 60),
  ('AUTH-MC-ER', 'Minerals Commission Task Force, Eastern', 'minerals_commission', 'Eastern', '+233 34 202 9876', 'eastern@mincom.gov.gh', 60),
  ('AUTH-EPA-WR', 'EPA Field Unit, Western', 'epa', 'Western', '+233 31 202 5555', 'western@epa.gov.gh', 70),
  ('AUTH-EPA-CR', 'EPA Field Unit, Central', 'epa', 'Central', '+233 33 219 5555', 'central@epa.gov.gh', 60),
  ('AUTH-EPA-ER', 'EPA Field Unit, Eastern', 'epa', 'Eastern', '+233 34 202 5555', 'eastern@epa.gov.gh', 60),
  ('AUTH-FC-AW', 'Forestry Commission Rapid Response, Ashanti-West', 'forestry', 'Ashanti', '+233 32 202 8888', 'ashanti-west@fc.gov.gh', 50),
  ('AUTH-NADMO-WR', 'NADMO Western Regional Office', 'nadmo', 'Western', '+233 31 202 9999', 'western@nadmo.gov.gh', 100),
  ('AUTH-NADMO-CR', 'NADMO Central Regional Office', 'nadmo', 'Central', '+233 33 219 9999', 'central@nadmo.gov.gh', 80),
  ('AUTH-NADMO-ER', 'NADMO Eastern Regional Office', 'nadmo', 'Eastern', '+233 34 202 9999', 'eastern@nadmo.gov.gh', 80),
  ('AUTH-POL-WR', 'Ghana Police Service, Western', 'police', 'Western', '191', 'western@police.gov.gh', 100),
  ('AUTH-POL-CR', 'Ghana Police Service, Central', 'police', 'Central', '191', 'central@police.gov.gh', 80),
  ('AUTH-FIRE-WR', 'Ghana National Fire Service, Western', 'fire', 'Western', '192', 'western@gnfs.gov.gh', 80),
  ('AUTH-FIRE-CR', 'Ghana National Fire Service, Central', 'fire', 'Central', '192', 'central@gnfs.gov.gh', 60),
  ('AUTH-AMB-WR', 'National Ambulance Service, Western', 'ambulance', 'Western', '193', 'western@nas.gov.gh', 100),
  ('AUTH-AMB-CR', 'National Ambulance Service, Central', 'ambulance', 'Central', '193', 'central@nas.gov.gh', 80)
on conflict (id) do nothing;

-- Dispatch alerts: link reports to dispatched authorities
create table if not exists public.dispatch_alerts (
  id text primary key,
  report_id text not null references public.complaints(id) on delete cascade,
  authority_id text not null references public.authorities(id) on delete cascade,
  created_at timestamptz default now(),
  status text not null check (status in ('dispatched', 'acknowledged', 'en_route', 'on_scene', 'closed')) default 'dispatched',
  notes text
);

-- Enable RLS
alter table public.dispatch_alerts enable row level security;

-- Regulators can read all dispatch alerts
create policy "Regulators can read dispatch alerts"
  on public.dispatch_alerts for select
  to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'regulator');

-- Regulators can update alert status
create policy "Regulators can update dispatch alerts"
  on public.dispatch_alerts for update
  to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'regulator');

-- System can insert alerts (via service role key from edge function or server)
create policy "Service role can insert dispatch alerts"
  on public.dispatch_alerts for insert
  to authenticated
  with check (false); -- Only service role bypasses RLS

-- Add voice_note and category to complaints table if not exists
alter table public.complaints
  add column if not exists voice_note text,
  add column if not exists category text;

-- Detection status enum for satellite confirmation pipeline
create type detection_status as enum ('pending_review', 'confirmed', 'dismissed');

-- Add status column to detections if not exists
alter table public.detections
  add column if not exists status detection_status default 'pending_review';

-- Regulators can update detection status (confirm/dismiss)
create policy "Regulators can update detection status"
  on public.detections for update
  to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'regulator');

-- Index for faster dispatch lookups
create index if not exists idx_dispatch_alerts_report on public.dispatch_alerts(report_id);
create index if not exists idx_dispatch_alerts_authority on public.dispatch_alerts(authority_id);
create index if not exists idx_authorities_region_type on public.authorities(region, type);
create index if not exists idx_detections_status on public.detections(status);