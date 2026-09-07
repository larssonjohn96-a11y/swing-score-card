-- Generic multiplayer engine. Existing 8-ball RPCs remain intact as the first adapter.
-- Future tests can use these RPCs with arbitrary JSON result payloads.

alter table public.group_sessions
  add column if not exists total_steps integer not null default 40,
  add column if not exists mode text not null default 'turn-based',
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table public.group_sessions drop constraint if exists group_sessions_current_shot_check;
alter table public.group_sessions add constraint group_sessions_current_shot_check check (current_shot between 0 and 500);
alter table public.group_sessions drop constraint if exists group_sessions_current_player_index_check;
alter table public.group_sessions add constraint group_sessions_current_player_index_check check (current_player_index between 0 and 7);
alter table public.group_sessions drop constraint if exists group_sessions_mode_check;
alter table public.group_sessions add constraint group_sessions_mode_check check (mode in ('turn-based','simultaneous'));
alter table public.group_sessions drop constraint if exists group_sessions_total_steps_check;
alter table public.group_sessions add constraint group_sessions_total_steps_check check (total_steps between 1 and 500);

alter table public.group_session_members drop constraint if exists group_session_members_seat_check;
alter table public.group_session_members add constraint group_session_members_seat_check check (seat between 0 and 7);

alter table public.group_session_scores
  add column if not exists result jsonb not null default '{}'::jsonb;
alter table public.group_session_scores drop constraint if exists group_session_scores_shot_index_check;
alter table public.group_session_scores add constraint group_session_scores_shot_index_check check (shot_index between 0 and 499);

create or replace function public.create_multiplayer_session(
  p_test_id text,
  p_member_ids uuid[],
  p_total_steps integer,
  p_mode text default 'turn-based',
  p_config jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  sid uuid;
  friend_id uuid;
  seat_no int:=1;
  host_name text;
  friend_name text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if nullif(trim(p_test_id),'') is null then raise exception 'Missing test id'; end if;
  if p_total_steps<1 or p_total_steps>500 then raise exception 'Invalid total steps'; end if;
  if p_mode not in ('turn-based','simultaneous') then raise exception 'Invalid multiplayer mode'; end if;
  if p_member_ids is null or coalesce(array_length(p_member_ids,1),0)<1 or array_length(p_member_ids,1)>7 then
    raise exception 'Choose 1-7 friends';
  end if;
  if exists(select 1 from unnest(p_member_ids) x group by x having count(*)>1) or uid=any(p_member_ids) then
    raise exception 'Invalid members';
  end if;

  foreach friend_id in array p_member_ids loop
    if not exists(
      select 1 from public.friendships f
      where f.status='accepted'
        and ((f.requester_id=uid and f.addressee_id=friend_id)
          or (f.addressee_id=uid and f.requester_id=friend_id))
    ) then raise exception 'All participants must be accepted friends'; end if;
  end loop;

  -- One active multiplayer game per involved player. This avoids duplicate
  -- GameBook-style sessions and gives every test the same predictable lifecycle.
  update public.group_sessions gs
  set status='cancelled', completed_at=coalesce(completed_at,now())
  where gs.status='active'
    and (
      gs.host_user_id=uid
      or exists(select 1 from public.group_session_members gm where gm.session_id=gs.id and gm.user_id=uid)
      or exists(select 1 from public.group_session_members gm where gm.session_id=gs.id and gm.user_id=any(p_member_ids))
    );

  select coalesce(display_name,'Spelare') into host_name from public.profiles where id=uid;
  host_name:=coalesce(host_name,'Spelare');

  insert into public.group_sessions(host_user_id,test_id,total_steps,mode,config)
  values(uid,p_test_id,p_total_steps,p_mode,coalesce(p_config,'{}'::jsonb))
  returning id into sid;

  insert into public.group_session_members(session_id,user_id,seat,display_name)
  values(sid,uid,0,host_name);

  foreach friend_id in array p_member_ids loop
    select coalesce(display_name,'Spelare') into friend_name from public.profiles where id=friend_id;
    insert into public.group_session_members(session_id,user_id,seat,display_name)
    values(sid,friend_id,seat_no,coalesce(friend_name,'Spelare'));
    seat_no:=seat_no+1;
  end loop;

  return sid;
end $$;
grant execute on function public.create_multiplayer_session(text,uuid[],integer,text,jsonb) to authenticated;

create or replace function public.get_multiplayer_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  s public.group_sessions%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.group_sessions where id=p_session_id;
  if not found then return null; end if;
  if s.host_user_id<>uid and not exists(
    select 1 from public.group_session_members gm where gm.session_id=p_session_id and gm.user_id=uid
  ) then raise exception 'Not a participant'; end if;

  return jsonb_build_object(
    'id',s.id,
    'host_user_id',s.host_user_id,
    'test_id',s.test_id,
    'status',s.status,
    'mode',s.mode,
    'total_steps',s.total_steps,
    'current_step',s.current_shot,
    'current_player_index',s.current_player_index,
    'created_at',s.created_at,
    'completed_at',s.completed_at,
    'config',s.config,
    'members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'session_id',gm.session_id,'user_id',gm.user_id,'seat',gm.seat,'display_name',gm.display_name
      ) order by gm.seat)
      from public.group_session_members gm where gm.session_id=p_session_id
    ),'[]'::jsonb),
    'results',coalesce((
      select jsonb_agg(jsonb_build_object(
        'session_id',gr.session_id,'user_id',gr.user_id,'step_index',gr.shot_index,
        'result',case when gr.result='{}'::jsonb then jsonb_build_object('points',gr.points) else gr.result end,
        'created_at',gr.created_at
      ) order by gr.shot_index,gr.created_at)
      from public.group_session_scores gr where gr.session_id=p_session_id
    ),'[]'::jsonb)
  );
end $$;
grant execute on function public.get_multiplayer_session(uuid) to authenticated;

create or replace function public.record_multiplayer_result(
  p_session_id uuid,
  p_user_id uuid,
  p_step_index integer,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  s public.group_sessions%rowtype;
  expected_user uuid;
  member_count int;
  next_player int;
  next_step int;
  numeric_points int;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.group_sessions where id=p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if not exists(select 1 from public.group_session_members where session_id=p_session_id and user_id=uid) then
    raise exception 'Only participants can register results';
  end if;
  if s.status<>'active' or s.current_shot<>p_step_index then raise exception 'Session state changed'; end if;
  if p_step_index<0 or p_step_index>=s.total_steps then raise exception 'Invalid step'; end if;

  if s.mode='turn-based' then
    select user_id into expected_user from public.group_session_members
    where session_id=p_session_id and seat=s.current_player_index;
    if expected_user is null or expected_user<>p_user_id then raise exception 'Wrong player'; end if;
  elsif p_user_id<>uid then
    raise exception 'Simultaneous results must be registered by the player';
  end if;

  numeric_points:=least(4,greatest(0,coalesce((p_result->>'points')::int,0)));
  insert into public.group_session_scores(session_id,user_id,shot_index,points,result,created_at)
  values(p_session_id,p_user_id,p_step_index,numeric_points,coalesce(p_result,'{}'::jsonb),now())
  on conflict(session_id,user_id,shot_index) do update
    set result=excluded.result, points=excluded.points, created_at=excluded.created_at;

  if s.mode='turn-based' then
    select count(*) into member_count from public.group_session_members where session_id=p_session_id;
    next_player:=s.current_player_index+1;
    next_step:=s.current_shot;
    if next_player>=member_count then next_player:=0; next_step:=s.current_shot+1; end if;
  else
    -- A simultaneous step advances once every member has submitted it.
    select count(*) into member_count from public.group_session_members where session_id=p_session_id;
    if (select count(*) from public.group_session_scores where session_id=p_session_id and shot_index=p_step_index)>=member_count then
      next_step:=s.current_shot+1;
    else
      next_step:=s.current_shot;
    end if;
    next_player:=0;
  end if;

  if next_step>=s.total_steps then
    update public.group_sessions set status='completed',current_shot=s.total_steps,current_player_index=0,completed_at=now()
    where id=p_session_id;
  else
    update public.group_sessions set current_shot=next_step,current_player_index=next_player where id=p_session_id;
  end if;

  return jsonb_build_object(
    'status',case when next_step>=s.total_steps then 'completed' else 'active' end,
    'currentStep',least(next_step,s.total_steps),
    'currentPlayerIndex',next_player
  );
end $$;
grant execute on function public.record_multiplayer_result(uuid,uuid,integer,jsonb) to authenticated;
