-- Multiplayer/group mode for the 8-ball training test.
create table if not exists public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null default 'eight-ball',
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  current_shot integer not null default 0 check (current_shot between 0 and 40),
  current_player_index integer not null default 0 check (current_player_index between 0 and 3),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.group_session_members (
  session_id uuid not null references public.group_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  display_name text not null,
  primary key (session_id,user_id),
  unique (session_id,seat)
);

create table if not exists public.group_session_scores (
  session_id uuid not null references public.group_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  shot_index integer not null check (shot_index between 0 and 39),
  points smallint not null check (points between 0 and 4),
  created_at timestamptz not null default now(),
  primary key (session_id,user_id,shot_index),
  foreign key (session_id,user_id) references public.group_session_members(session_id,user_id) on delete cascade
);

alter table public.group_sessions enable row level security;
alter table public.group_session_members enable row level security;
alter table public.group_session_scores enable row level security;

create or replace function public.is_group_session_member(p_session_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.group_session_members where session_id=p_session_id and user_id=p_user_id)
$$;
create or replace function public.is_group_session_host(p_session_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.group_sessions where id=p_session_id and host_user_id=p_user_id)
$$;
grant execute on function public.is_group_session_member(uuid,uuid) to authenticated;
grant execute on function public.is_group_session_host(uuid,uuid) to authenticated;

drop policy if exists "Participants read group sessions" on public.group_sessions;
create policy "Participants read group sessions" on public.group_sessions for select to authenticated using (host_user_id=auth.uid() or public.is_group_session_member(id,auth.uid()));
drop policy if exists "Host creates group sessions" on public.group_sessions;
create policy "Host creates group sessions" on public.group_sessions for insert to authenticated with check (host_user_id=auth.uid());
drop policy if exists "Participants read group members" on public.group_session_members;
create policy "Participants read group members" on public.group_session_members for select to authenticated using (public.is_group_session_member(session_id,auth.uid()) or public.is_group_session_host(session_id,auth.uid()));
drop policy if exists "Participants read group scores" on public.group_session_scores;
create policy "Participants read group scores" on public.group_session_scores for select to authenticated using (public.is_group_session_member(session_id,auth.uid()) or public.is_group_session_host(session_id,auth.uid()));

create or replace function public.create_eight_ball_group_session(p_member_ids uuid[])
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); sid uuid; friend_id uuid; seat_no int:=1; host_name text; friend_name text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_member_ids is null or coalesce(array_length(p_member_ids,1),0)<1 or array_length(p_member_ids,1)>3 then raise exception 'Choose 1-3 friends'; end if;
  if exists(select 1 from unnest(p_member_ids) x group by x having count(*)>1) or uid=any(p_member_ids) then raise exception 'Invalid members'; end if;
  select coalesce(display_name,'Spelare') into host_name from public.profiles where id=uid; host_name:=coalesce(host_name,'Spelare');
  foreach friend_id in array p_member_ids loop
    if not exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=uid and f.addressee_id=friend_id) or (f.addressee_id=uid and f.requester_id=friend_id))) then raise exception 'All participants must be accepted friends'; end if;
  end loop;
  insert into public.group_sessions(host_user_id) values(uid) returning id into sid;
  insert into public.group_session_members values(sid,uid,0,host_name);
  foreach friend_id in array p_member_ids loop
    select coalesce(display_name,'Spelare') into friend_name from public.profiles where id=friend_id;
    insert into public.group_session_members values(sid,friend_id,seat_no,coalesce(friend_name,'Spelare')); seat_no:=seat_no+1;
  end loop;
  return sid;
end $$;
grant execute on function public.create_eight_ball_group_session(uuid[]) to authenticated;

create or replace function public.record_eight_ball_group_score(p_session_id uuid,p_user_id uuid,p_shot_index integer,p_points integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); s public.group_sessions%rowtype; expected_user uuid; member_count int; next_player int; next_shot int; m record; score_array jsonb; total_score numeric; round_totals jsonb;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_points<0 or p_points>4 or p_shot_index<0 or p_shot_index>39 then raise exception 'Invalid score'; end if;
  select * into s from public.group_sessions where id=p_session_id for update;
  if not found or s.host_user_id<>uid then raise exception 'Only the host can score'; end if;
  if s.status<>'active' or s.current_shot<>p_shot_index then raise exception 'Session state changed'; end if;
  select user_id into expected_user from public.group_session_members where session_id=p_session_id and seat=s.current_player_index;
  if expected_user is null or expected_user<>p_user_id then raise exception 'Wrong player'; end if;
  insert into public.group_session_scores values(p_session_id,p_user_id,p_shot_index,p_points,now()) on conflict do nothing;
  select count(*) into member_count from public.group_session_members where session_id=p_session_id;
  next_player:=s.current_player_index+1; next_shot:=s.current_shot;
  if next_player>=member_count then next_player:=0; next_shot:=s.current_shot+1; end if;
  if next_shot>=40 then
    update public.group_sessions set status='completed',current_shot=40,current_player_index=0,completed_at=now() where id=p_session_id;
    for m in select user_id from public.group_session_members where session_id=p_session_id loop
      select jsonb_agg(points order by shot_index),sum(points) into score_array,total_score from public.group_session_scores where session_id=p_session_id and user_id=m.user_id;
      if jsonb_array_length(coalesce(score_array,'[]'::jsonb))<>40 then raise exception 'Incomplete participant score'; end if;
      select jsonb_build_array(sum(points) filter(where shot_index between 0 and 7),sum(points) filter(where shot_index between 8 and 15),sum(points) filter(where shot_index between 16 and 23),sum(points) filter(where shot_index between 24 and 31),sum(points) filter(where shot_index between 32 and 39)) into round_totals from public.group_session_scores where session_id=p_session_id and user_id=m.user_id;
      insert into public.test_sessions(id,user_id,test_id,category,test_type,played_at,score,test_handicap,metrics,shots,test_version,scoring_version)
      values(gen_random_uuid(),m.user_id,'eight-ball','around-the-green','training',now(),total_score,null,jsonb_build_object('roundTotals',round_totals,'groupSessionId',p_session_id::text),score_array,1,1);
    end loop;
  else update public.group_sessions set current_shot=next_shot,current_player_index=next_player where id=p_session_id;
  end if;
  return jsonb_build_object('status',case when next_shot>=40 then 'completed' else 'active' end,'currentShot',least(next_shot,40),'currentPlayerIndex',next_player);
end $$;
grant execute on function public.record_eight_ball_group_score(uuid,uuid,integer,integer) to authenticated;

alter table public.group_sessions replica identity full;
alter table public.group_session_scores replica identity full;
do $$ begin alter publication supabase_realtime add table public.group_sessions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.group_session_scores; exception when duplicate_object then null; end $$;
