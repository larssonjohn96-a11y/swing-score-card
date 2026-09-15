-- SG4 append-only shot bank v1.
create table if not exists public.shot_sessions (
  session_id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null,
  activity_type text not null check (activity_type in ('test','training','match','game','other')),
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('started','completed','abandoned')),
  schema_version smallint not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shot_events (
  event_id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('shot_recorded','shot_voided')),
  schema_version smallint not null default 1,
  session_id text not null references public.shot_sessions(session_id),
  sequence integer not null check (sequence > 0),
  played_at timestamptz not null,
  recorded_at timestamptz not null,
  source text not null,
  activity_type text not null check (activity_type in ('test','training','match','game','other')),
  skill text not null check (skill in ('putting','chip','approach','bunker','driver','speed')),
  payload jsonb not null,
  context jsonb not null default '{}'::jsonb,
  target_event_id text,
  reason text,
  created_at timestamptz not null default now(),
  constraint shot_void_contract check (
    (event_type = 'shot_recorded' and target_event_id is null)
    or (event_type = 'shot_voided' and target_event_id is not null and reason is not null)
  )
);

create index if not exists shot_events_user_played_idx on public.shot_events(user_id, played_at desc);
create index if not exists shot_events_session_idx on public.shot_events(session_id, sequence);

alter table public.shot_sessions enable row level security;
alter table public.shot_events enable row level security;

create policy "read own shot sessions" on public.shot_sessions
  for select to authenticated using (auth.uid() = user_id);
create policy "append own shot sessions" on public.shot_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "read own shot events" on public.shot_events
  for select to authenticated using (auth.uid() = user_id);
create policy "append own shot events" on public.shot_events
  for insert to authenticated with check (auth.uid() = user_id);

-- No UPDATE or DELETE policies are intentionally granted. Corrections append shot_voided events.
