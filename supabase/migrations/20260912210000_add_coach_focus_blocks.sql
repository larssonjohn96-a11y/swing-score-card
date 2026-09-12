create table if not exists public.coach_focus_blocks (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coach_relationships(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  primary_focus text not null,
  secondary_focus text,
  why_text text,
  coach_note text,
  recommendations jsonb not null default '[]'::jsonb,
  start_date date not null default current_date,
  end_date date not null,
  status text not null default 'active' check (status in ('active','completed','extended')),
  extended_from uuid references public.coach_focus_blocks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_focus_blocks_dates check (end_date >= start_date)
);

create index if not exists coach_focus_blocks_coach_player_idx
  on public.coach_focus_blocks(coach_id, player_id, start_date desc);
create index if not exists coach_focus_blocks_relationship_idx
  on public.coach_focus_blocks(relationship_id, start_date desc);

alter table public.coach_focus_blocks enable row level security;

create policy "focus blocks visible to participants"
on public.coach_focus_blocks for select
to authenticated
using (auth.uid() = coach_id or auth.uid() = player_id);

create policy "coaches create focus blocks"
on public.coach_focus_blocks for insert
to authenticated
with check (
  auth.uid() = coach_id
  and exists (
    select 1 from public.coach_relationships r
    where r.id = relationship_id
      and r.coach_id = auth.uid()
      and r.player_id = player_id
      and r.status = 'accepted'
  )
);

create policy "coaches update focus blocks"
on public.coach_focus_blocks for update
to authenticated
using (auth.uid() = coach_id)
with check (auth.uid() = coach_id);

create policy "coaches delete focus blocks"
on public.coach_focus_blocks for delete
to authenticated
using (auth.uid() = coach_id);
