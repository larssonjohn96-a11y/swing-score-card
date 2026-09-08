alter table public.player_snapshots
  add column if not exists comparison_profile jsonb not null default '{}'::jsonb;
