create table if not exists public.coach_groups (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_groups_coach_idx
  on public.coach_groups(coach_id, created_at desc);

create table if not exists public.coach_group_members (
  group_id uuid not null references public.coach_groups(id) on delete cascade,
  relationship_id uuid not null references public.coach_relationships(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, player_id)
);

create index if not exists coach_group_members_player_idx
  on public.coach_group_members(player_id, group_id);

create table if not exists public.coach_group_focus_blocks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.coach_groups(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  primary_focus text not null,
  secondary_focus text,
  why_text text,
  coach_note text,
  recommendations jsonb not null default '[]'::jsonb,
  start_date date not null default current_date,
  end_date date not null,
  status text not null default 'active' check (status in ('active','completed','extended')),
  extended_from uuid references public.coach_group_focus_blocks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_group_focus_blocks_dates check (end_date >= start_date)
);

create index if not exists coach_group_focus_blocks_group_idx
  on public.coach_group_focus_blocks(group_id, start_date desc);
create index if not exists coach_group_focus_blocks_coach_idx
  on public.coach_group_focus_blocks(coach_id, start_date desc);

alter table public.coach_groups enable row level security;
alter table public.coach_group_members enable row level security;
alter table public.coach_group_focus_blocks enable row level security;

create policy "coaches manage own groups"
on public.coach_groups for all
to authenticated
using (auth.uid() = coach_id)
with check (auth.uid() = coach_id);

create policy "players can view their groups"
on public.coach_groups for select
to authenticated
using (
  exists (
    select 1 from public.coach_group_members m
    where m.group_id = coach_groups.id and m.player_id = auth.uid()
  )
);

create policy "coaches manage group members"
on public.coach_group_members for all
to authenticated
using (
  exists (
    select 1 from public.coach_groups g
    where g.id = group_id and g.coach_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.coach_groups g
    join public.coach_relationships r on r.id = relationship_id
    where g.id = group_id
      and g.coach_id = auth.uid()
      and r.coach_id = auth.uid()
      and r.player_id = player_id
      and r.status = 'accepted'
  )
);

create policy "players view own group membership"
on public.coach_group_members for select
to authenticated
using (player_id = auth.uid());

create policy "group focus visible to coach and members"
on public.coach_group_focus_blocks for select
to authenticated
using (
  auth.uid() = coach_id
  or exists (
    select 1 from public.coach_group_members m
    where m.group_id = coach_group_focus_blocks.group_id
      and m.player_id = auth.uid()
  )
);

create policy "coaches create group focus"
on public.coach_group_focus_blocks for insert
to authenticated
with check (
  auth.uid() = coach_id
  and exists (
    select 1 from public.coach_groups g
    where g.id = group_id and g.coach_id = auth.uid()
  )
);

create policy "coaches update group focus"
on public.coach_group_focus_blocks for update
to authenticated
using (auth.uid() = coach_id)
with check (auth.uid() = coach_id);

create policy "coaches delete group focus"
on public.coach_group_focus_blocks for delete
to authenticated
using (auth.uid() = coach_id);
