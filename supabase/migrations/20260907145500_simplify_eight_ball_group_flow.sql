-- Keep the 8-ball multiplayer flow GameBook-simple:
-- one active game per player, and any participant may register the current score.

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
    ) then raise exception 'All participants must be accepted friends'; end if;
  end loop;

  -- A player can only be part of one active 8-ball group game at a time.
  update public.group_sessions gs
  set status='cancelled', completed_at=coalesce(completed_at,now())
  where gs.test_id='eight-ball'
    and gs.status='active'
    and (
      gs.host_user_id=uid
      or exists(select 1 from public.group_session_members gm where gm.session_id=gs.id and gm.user_id=uid)
      or exists(select 1 from public.group_session_members gm where gm.session_id=gs.id and gm.user_id=any(p_member_ids))
    );

  select coalesce(display_name,'Spelare') into host_name from public.profiles where id=uid;
  host_name:=coalesce(host_name,'Spelare');

  insert into public.group_sessions(host_user_id) values(uid) returning id into sid;
  insert into public.group_session_members values(sid,uid,0,host_name);

  foreach friend_id in array p_member_ids loop
    select coalesce(display_name,'Spelare') into friend_name from public.profiles where id=friend_id;
    insert into public.group_session_members values(sid,friend_id,seat_no,coalesce(friend_name,'Spelare'));
    seat_no:=seat_no+1;
  end loop;

  return sid;
end $$;
grant execute on function public.create_eight_ball_group_session(uuid[]) to authenticated;

create or replace function public.record_eight_ball_group_score(p_session_id uuid,p_user_id uuid,p_shot_index integer,p_points integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  s public.group_sessions%rowtype;
  expected_user uuid;
  member_count int;
  next_player int;
  next_shot int;
  m record;
  score_array jsonb;
  total_score numeric;
  round_totals jsonb;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_points<0 or p_points>4 or p_shot_index<0 or p_shot_index>39 then raise exception 'Invalid score'; end if;

  select * into s from public.group_sessions where id=p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if not exists(select 1 from public.group_session_members where session_id=p_session_id and user_id=uid) then
    raise exception 'Only participants can score';
  end if;
  if s.status<>'active' or s.current_shot<>p_shot_index then raise exception 'Session state changed'; end if;

  select user_id into expected_user
  from public.group_session_members
  where session_id=p_session_id and seat=s.current_player_index;
  if expected_user is null or expected_user<>p_user_id then raise exception 'Wrong player'; end if;

  insert into public.group_session_scores values(p_session_id,p_user_id,p_shot_index,p_points,now())
  on conflict do nothing;

  select count(*) into member_count from public.group_session_members where session_id=p_session_id;
  next_player:=s.current_player_index+1;
  next_shot:=s.current_shot;
  if next_player>=member_count then
    next_player:=0;
    next_shot:=s.current_shot+1;
  end if;

  if next_shot>=40 then
    update public.group_sessions
    set status='completed',current_shot=40,current_player_index=0,completed_at=now()
    where id=p_session_id;

    for m in select user_id from public.group_session_members where session_id=p_session_id loop
      select jsonb_agg(points order by shot_index),sum(points)
      into score_array,total_score
      from public.group_session_scores
      where session_id=p_session_id and user_id=m.user_id;

      if jsonb_array_length(coalesce(score_array,'[]'::jsonb))<>40 then raise exception 'Incomplete participant score'; end if;

      select jsonb_build_array(
        sum(points) filter(where shot_index between 0 and 7),
        sum(points) filter(where shot_index between 8 and 15),
        sum(points) filter(where shot_index between 16 and 23),
        sum(points) filter(where shot_index between 24 and 31),
        sum(points) filter(where shot_index between 32 and 39)
      ) into round_totals
      from public.group_session_scores
      where session_id=p_session_id and user_id=m.user_id;

      insert into public.test_sessions(id,user_id,test_id,category,test_type,played_at,score,test_handicap,metrics,shots,test_version,scoring_version)
      values(gen_random_uuid(),m.user_id,'eight-ball','around-the-green','training',now(),total_score,null,
        jsonb_build_object('roundTotals',round_totals,'groupSessionId',p_session_id::text),score_array,1,1);
    end loop;
  else
    update public.group_sessions
    set current_shot=next_shot,current_player_index=next_player
    where id=p_session_id;
  end if;

  return jsonb_build_object(
    'status',case when next_shot>=40 then 'completed' else 'active' end,
    'currentShot',least(next_shot,40),
    'currentPlayerIndex',next_player
  );
end $$;
grant execute on function public.record_eight_ball_group_score(uuid,uuid,integer,integer) to authenticated;
