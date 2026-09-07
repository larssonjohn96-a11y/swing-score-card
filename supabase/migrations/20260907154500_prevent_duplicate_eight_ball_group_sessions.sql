-- A player starting a new 8-ball multiplayer test must never leave several
-- active sessions behind. Starting a new one cancels stale active sessions
-- hosted by the same user before the new session is created.
create or replace function public.create_eight_ball_group_session(p_member_ids uuid[])
returns uuid language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  sid uuid;
  friend_id uuid;
  seat_no int:=1;
  host_name text;
  friend_name text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_member_ids is null or coalesce(array_length(p_member_ids,1),0)<1 or array_length(p_member_ids,1)>3 then raise exception 'Choose 1-3 friends'; end if;
  if exists(select 1 from unnest(p_member_ids) x group by x having count(*)>1) or uid=any(p_member_ids) then raise exception 'Invalid members'; end if;

  foreach friend_id in array p_member_ids loop
    if not exists(
      select 1 from public.friendships f
      where f.status='accepted'
        and ((f.requester_id=uid and f.addressee_id=friend_id)
          or (f.addressee_id=uid and f.requester_id=friend_id))
    ) then
      raise exception 'All participants must be accepted friends';
    end if;
  end loop;

  -- Important: one active hosted 8-ball group session per user. This also
  -- cleans up stale sessions created by earlier failed navigation attempts.
  update public.group_sessions
  set status='cancelled', completed_at=coalesce(completed_at,now())
  where host_user_id=uid and test_id='eight-ball' and status='active';

  select coalesce(display_name,'Spelare') into host_name from public.profiles where id=uid;
  host_name:=coalesce(host_name,'Spelare');

  insert into public.group_sessions(host_user_id,test_id,status)
  values(uid,'eight-ball','active') returning id into sid;

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

grant execute on function public.create_eight_ball_group_session(uuid[]) to authenticated;
