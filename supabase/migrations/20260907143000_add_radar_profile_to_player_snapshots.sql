alter table public.player_snapshots
  add column if not exists radar_profile jsonb not null default '{}'::jsonb;
