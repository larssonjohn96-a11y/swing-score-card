create or replace function public.update_match_play_state(
  p_session_id uuid,
  p_state jsonb,
  p_current_step integer,
  p_status text default 'active'
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  s public.group_sessions%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.group_sessions where id=p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if s.test_id <> 'match-play' then raise exception 'Wrong session type'; end if;
  if s.host_user_id <> uid then raise exception 'Only the match host can update the live match'; end if;
  if p_status not in ('active','completed') then raise exception 'Invalid status'; end if;

  update public.group_sessions
  set config = jsonb_set(coalesce(config,'{}'::jsonb), '{matchState}', coalesce(p_state,'{}'::jsonb), true),
      current_shot = least(greatest(coalesce(p_current_step,0),0), total_steps),
      status = p_status,
      completed_at = case when p_status='completed' then coalesce(completed_at,now()) else null end
  where id=p_session_id;

  return true;
end $$;

grant execute on function public.update_match_play_state(uuid,jsonb,integer,text) to authenticated;
