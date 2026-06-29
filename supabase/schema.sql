-- Foil episodes table. Anonymous, device-based: rows are keyed by a random
-- device id stored in the learner's browser. No accounts, no email, no PII.
--
-- Run this in the Supabase SQL editor once, then set SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY in the app's environment.

create table if not exists public.episodes (
  id uuid primary key,
  device_id text not null,
  source text not null,
  source_type text not null,
  created_at timestamptz not null default now(),
  exchanges int not null,
  mastery numeric(3, 2) not null,
  trait_averages jsonb not null,
  strongest text not null,
  weakest text not null,
  turns jsonb
);

create index if not exists episodes_device_created_idx
  on public.episodes (device_id, created_at desc);

-- RLS on with no policies: the anon/public key cannot read or write. Only the
-- server (service role key, used in app/api/episodes/route.ts) bypasses RLS.
alter table public.episodes enable row level security;
