-- Foil episodes. Anonymous, device-based: rows are keyed by a random device id
-- stored in the learner's browser. No accounts, no email, no PII.
--
-- Security model: RLS is ON with NO policies, so the publishable/anon key has no
-- direct table access. All reads/writes go through SECURITY DEFINER functions:
-- you can insert an episode, or read episodes for ONE device id (an unguessable
-- random uuid). This lets the app use only the publishable key (no service-role
-- secret) while keeping every learner's data unreadable without their device id.
--
-- Applied via the Supabase migration `episodes_table_and_rpcs`.

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

alter table public.episodes enable row level security;

create or replace function public.save_episode(
  p_id uuid, p_device_id text, p_source text, p_source_type text,
  p_created_at timestamptz, p_exchanges int, p_mastery numeric,
  p_trait_averages jsonb, p_strongest text, p_weakest text, p_turns jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.episodes(id, device_id, source, source_type, created_at,
    exchanges, mastery, trait_averages, strongest, weakest, turns)
  values (p_id, p_device_id, p_source, p_source_type, p_created_at,
    p_exchanges, p_mastery, p_trait_averages, p_strongest, p_weakest, p_turns)
  on conflict (id) do update set
    mastery = excluded.mastery,
    trait_averages = excluded.trait_averages,
    strongest = excluded.strongest,
    weakest = excluded.weakest,
    turns = excluded.turns,
    exchanges = excluded.exchanges;
end; $$;

create or replace function public.list_episodes_for_device(p_device_id text)
returns setof public.episodes
language sql security definer set search_path = public as $$
  select * from public.episodes
  where device_id = p_device_id
  order by created_at desc
  limit 200;
$$;

revoke all on function public.save_episode(uuid,text,text,text,timestamptz,int,numeric,jsonb,text,text,jsonb) from public;
grant execute on function public.save_episode(uuid,text,text,text,timestamptz,int,numeric,jsonb,text,text,jsonb) to anon, authenticated;
revoke all on function public.list_episodes_for_device(text) from public;
grant execute on function public.list_episodes_for_device(text) to anon, authenticated;
