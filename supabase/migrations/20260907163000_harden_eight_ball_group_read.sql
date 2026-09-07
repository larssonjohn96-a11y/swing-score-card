-- Load an 8-ball multiplayer session in one security-definer RPC.
-- This avoids three separate RLS reads during route startup and gives both
-- host and invited participants the same atomic live state.
create or replace function public.get_eight_ball_group_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  s public.group_sessions%rowtype;
  members_json jsonb;
  scores_json jsonb;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into s from public.group_sessions where id=p_session_id;
  if not found then return null; end if;

  if s.host_user_id<>uid and not exists(
    select 1 from public.group_session_members gm
    where gm.session_id=p_session_id and gm.user_id=uid
  ) then
    raise exception 'Not a participant';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'session_id',gm.session_id,
    'user_id',gm.user_id,
    'seat',gm.seat,
    'display_name',gm.display_name
  ) order by gm.seat),'[]'::jsonb)
  into members_json
  from public.group_session_members gm
  where gm.session_id=p_session_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'session_id',gs.session_id,
    'user_id',gs.user_id,
    'shot_index',gs.shot_index,
    'points',gs.points,
    'created_at',gs.created_at
  ) order by gs.shot_index,gs.created_at),'[]'::jsonb)
  into scores_json
  from public.group_session_scores gs
  where gs.session_id=p_session_id;

  return jsonb_build_object(
    'id',s.id,
    'host_user_id',s.host_user_id,
    'test_id',s.test_id,
    'status',s.status,
    'current_shot',s.current_shot,
    'current_player_index',s.current_player_index,
    'created_at',s.created_at,
    'completed_at',s.completed_at,
    'members',members_json,
    'scores',scores_json
  );
end $$;

grant execute on function public.get_eight_ball_group_session(uuid) to authenticated;
