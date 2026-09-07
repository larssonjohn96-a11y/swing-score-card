-- GameBook-style corrections for 8-ball multiplayer.
-- Any participant can verify/correct a registered shot, and undo only rewinds
-- the most recently registered turn so session order stays deterministic.

create or replace function public.correct_eight_ball_group_score(
  p_session_id uuid,
  p_user_id uuid,
  p_shot_index integer,
  p_points integer
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_points<0 or p_points>4 or p_shot_index<0 or p_shot_index>39 then raise exception 'Invalid score'; end if;
  if not exists(
    select 1 from public.group_session_members
    where session_id=p_session_id and user_id=uid
  ) then raise exception 'Only participants can correct scores'; end if;
  if not exists(
    select 1 from public.group_sessions
    where id=p_session_id and test_id='eight-ball' and status='active'
  ) then raise exception 'Game is not active'; end if;
  if not exists(
    select 1 from public.group_session_scores
    where session_id=p_session_id and user_id=p_user_id and shot_index=p_shot_index
  ) then raise exception 'Score not found'; end if;

  update public.group_session_scores
  set points=p_points,
      result=jsonb_build_object('points',p_points),
      created_at=now()
  where session_id=p_session_id and user_id=p_user_id and shot_index=p_shot_index;
end $$;
grant execute on function public.correct_eight_ball_group_score(uuid,uuid,integer,integer) to authenticated;

create or replace function public.undo_eight_ball_group_score(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  s public.group_sessions%rowtype;
  member_count int;
  previous_player int;
  previous_shot int;
  previous_user uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into s from public.group_sessions where id=p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if s.test_id<>'eight-ball' then raise exception 'Wrong test'; end if;
  if s.status<>'active' then raise exception 'Game is not active'; end if;
  if not exists(
    select 1 from public.group_session_members
    where session_id=p_session_id and user_id=uid
  ) then raise exception 'Only participants can undo'; end if;

  select count(*) into member_count from public.group_session_members where session_id=p_session_id;
  if s.current_shot=0 and s.current_player_index=0 then raise exception 'Nothing to undo'; end if;

  if s.current_player_index>0 then
    previous_player:=s.current_player_index-1;
    previous_shot:=s.current_shot;
  else
    previous_player:=member_count-1;
    previous_shot:=s.current_shot-1;
  end if;

  select user_id into previous_user
  from public.group_session_members
  where session_id=p_session_id and seat=previous_player;

  if previous_user is null then raise exception 'Previous player not found'; end if;

  delete from public.group_session_scores
  where session_id=p_session_id and user_id=previous_user and shot_index=previous_shot;

  if not found then raise exception 'Previous score not found'; end if;

  update public.group_sessions
  set current_shot=previous_shot,
      current_player_index=previous_player
  where id=p_session_id;

  return jsonb_build_object(
    'status','active',
    'currentShot',previous_shot,
    'currentPlayerIndex',previous_player,
    'userId',previous_user
  );
end $$;
grant execute on function public.undo_eight_ball_group_score(uuid) to authenticated;
