-- Migration: satellite detection images and complaint linkage.
-- Run after 0006_guest_anon_policies.sql.

alter table public.detections
  add column if not exists image_url text,
  add column if not exists source text not null default 'sentinel-2',
  add column if not exists region text,
  add column if not exists complaint_id text references public.complaints (id) on delete set null;

-- Public bucket for satellite thumbnails. The worker uploads with the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('detections', 'detections', true, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create index if not exists idx_detections_detected_at on public.detections (detected_at desc);
