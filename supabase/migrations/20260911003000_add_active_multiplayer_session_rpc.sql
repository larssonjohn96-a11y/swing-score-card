create or replace function public.get_my_active_multiplayer_session()
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

  select gs.* into s
  from public.group_sessions gs
  where gs.status='active'
    and exists(
      select 1
      from public.group_session_members gm
      where gm.session_id=gs.id and gm.user_id=uid
    )
  order by gs.created_at desc
  limit 1;

  if not found then return null; end if;

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
        'session_id',gm.session_id,
        'user_id',gm.user_id,
        'seat',gm.seat,
        'display_name',gm.display_name
      ) order by gm.seat)
      from public.group_session_members gm
      where gm.session_id=s.id
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.get_my_active_multiplayer_session() to authenticated;
