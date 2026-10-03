-- RPC corrections and bounded production reads.
create or replace function public.swipes_left() returns int
language sql stable security definer set search_path = public as $$
  select case when public.my_tier() <> 'free' then null
              else greatest(0, 25 - coalesce((select used from public.action_limits where user_id=auth.uid() and action='swipe' and window_start=to_timestamp(floor(extract(epoch from now())/86400)*86400)),0))::int end;
$$;
create or replace function public.swipe(p_target uuid, p_action public.swipe_action) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; conv uuid;
begin
  if me is null then raise exception 'AUTH: You are signed out.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me,p_target)::text||greatest(me,p_target)::text,0));
  if public.is_blocked(p_target) or not exists(select 1 from public.profiles where id=p_target and onboarded and discoverable) then raise exception 'FORBIDDEN'; end if;
  if p_target = me then raise exception 'You cannot match with yourself.'; end if;
  if public.swipes_left() = 0 then raise exception 'SWIPE_LIMIT: You have used today''s free swipes.'; end if;
  if public.my_tier()='free' then perform public.consume_action(me,'swipe',25,86400); end if;
  insert into public.match_swipes (swiper_id, target_id, action) values (me, p_target, p_action)
  on conflict (swiper_id, target_id) do update set action = excluded.action, created_at = now();
  if p_action = 'pass'
     or not exists (select 1 from public.match_swipes where swiper_id = p_target and target_id = me and action <> 'pass') then
    return jsonb_build_object('matched', false, 'conversation_id', null);
  end if;
  a := least(me, p_target); b := greatest(me, p_target);
  insert into public.conversations (user_a, user_b, is_match) values (a, b, true)
  on conflict (user_a, user_b) do update set is_match = true
  returning id into conv;
  insert into public.matches (user_a, user_b) values (a, b) on conflict do nothing;
  perform public.award_xp(me, 'match', p_target::text, 15);
  perform public.award_xp(p_target, 'match', me::text, 15);
  return jsonb_build_object('matched', true, 'conversation_id', conv);
end $$;
create or replace function public.open_conversation(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; conv uuid; pol public.dm_policy; matched boolean;
begin
  if me is null then raise exception 'AUTH: You are signed out.'; end if;
  if p_other = me then raise exception 'You cannot message yourself.'; end if;
  if public.is_blocked(p_other) then raise exception 'FORBIDDEN'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me,p_other)::text||greatest(me,p_other)::text,0));
  a := least(me, p_other); b := greatest(me, p_other);
  select id into conv from public.conversations where user_a = a and user_b = b;
  if conv is not null then return conv; end if;
  select dm_policy into pol from public.profiles where id = p_other;
  if pol is null then raise exception 'NOT_FOUND: This member no longer exists.'; end if;
  matched := exists (select 1 from public.matches where user_a = a and user_b = b);
  if pol = 'matches' and not matched then
    raise exception 'FORBIDDEN: This member only accepts messages from matches.';
  end if;
  insert into public.conversations (user_a, user_b, is_match) values (a, b, matched) returning id into conv;
  return conv;
end $$;
create or replace function public.match_candidates(
  p_roles public.user_role[] default '{}', p_stages public.startup_stage[] default '{}',
  p_industries text[] default '{}', p_min_score int default 0, p_limit int default 30)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(c.obj order by c.score desc, c.founder_score desc), '[]'::jsonb)
  from (
    select public.lite((select pr from public.profiles pr where pr.id=f.id)) || jsonb_build_object(
             'location', case when f.location_visible then f.location else '' end,
             'bio', f.bio, 'role', f.role, 'stage', f.stage,
             'skills', to_jsonb(f.skills), 'industries', to_jsonb(f.industries),
             'looking_for', to_jsonb(f.looking_for), 'open_to', to_jsonb(f.open_to),
             'score', (f.fitness ->> 'score')::int, 'reasons', f.fitness -> 'reasons') as obj,
           (f.fitness ->> 'score')::int as score,
           f.founder_score
    from (
      select p.*, public.fit(m, p) as fitness
      from public.profiles p
      cross join public.profiles m
      where m.id = auth.uid()
        and p.id <> m.id and p.onboarded and p.discoverable and not public.is_blocked(p.id)
        and not exists (select 1 from public.match_swipes s where s.swiper_id = m.id and s.target_id = p.id)
        and not exists (select 1 from public.matches x where x.user_a = least(m.id, p.id) and x.user_b = greatest(m.id, p.id))
        and (cardinality(p_roles) = 0 or p.role = any (p_roles))
        and (cardinality(p_stages) = 0 or p.stage = any (p_stages))
        and (cardinality(p_industries) = 0 or p.industries && p_industries)
    ) f
    where (f.fitness ->> 'score')::int >= p_min_score
    order by (f.fitness ->> 'score')::int desc, f.founder_score desc
    limit least(greatest(p_limit,1),100)
  ) c;
$$;
create or replace function public.get_profile(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p public.profiles; mine public.profiles; f jsonb;
begin
  if me is null then raise exception 'AUTH'; end if;
  if public.is_blocked(p_id) then raise exception 'NOT_FOUND'; end if;
  select * into p from public.profiles where id = p_id;
  if not found then raise exception 'NOT_FOUND: This member no longer exists.'; end if;
  select * into mine from public.profiles where id = me;
  if p_id <> me then
    insert into public.profile_views (profile_id, viewer_id) values (p_id, me);
    f := public.fit(mine, p);
  end if;
  return to_jsonb(p) || jsonb_build_object(
    'location', case when p.location_visible or p_id = me then p.location else '' end,
    'is_me', p_id = me,
    'is_following', exists (select 1 from public.follows where follower_id = me and followee_id = p_id),
    'follows_me', exists (select 1 from public.follows where follower_id = p_id and followee_id = me),
    'is_match', exists (select 1 from public.matches where user_a = least(me, p_id) and user_b = greatest(me, p_id)),
    'match_score', f -> 'score',
    'match_reasons', coalesce(f -> 'reasons', '[]'::jsonb));
end $$;
create or replace function public.vote_poll(p_post uuid, p_option text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pst public.posts;
begin
  if not public.can_read_post(p_post) then raise exception 'FORBIDDEN'; end if;
  select * into pst from public.posts where id = p_post;
  if pst.poll is null then raise exception 'NOT_FOUND: Poll not found.'; end if;
  if (pst.poll ->> 'ends_at')::timestamptz < now() then raise exception 'This poll has ended.'; end if;
  if not exists (select 1 from jsonb_array_elements(pst.poll -> 'options') o where o ->> 'id' = p_option) then
    raise exception 'Unknown poll option.';
  end if;
  insert into public.poll_votes (post_id, user_id, option_id) values (p_post, auth.uid(), p_option)
  on conflict (post_id, user_id) do update set option_id = excluded.option_id, created_at = now();
  return public.post_json(pst);
end $$;
create or replace function public.get_communities(p_id uuid default null, p_query text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    (to_jsonb(c) - 'created_at')
    || jsonb_build_object('joined', exists (select 1 from public.community_members cm where cm.community_id = c.id and cm.user_id = auth.uid()))
    || case when p_id is null then '{}'::jsonb else jsonb_build_object('members',
         (select coalesce(jsonb_agg(public.lite(pr)), '[]'::jsonb)
            from (select pr.* from public.community_members cm join public.profiles pr on pr.id = cm.user_id
                   where cm.community_id = c.id order by cm.joined_at desc limit 12) pr)) end
    order by c.featured desc, c.member_count desc), '[]'::jsonb)
  from public.communities c
  where (not c.is_private or exists(select 1 from public.community_members cm where cm.community_id=c.id and cm.user_id=auth.uid())) and (p_id is null or c.id = p_id)
    and (p_query is null or c.name ilike '%' || p_query || '%' or c.tag ilike '%' || p_query || '%' or c.description ilike '%' || p_query || '%');
$$;
create or replace function public.get_analytics(p_range int default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid(); since timestamptz; prev_since timestamptz;
  v_now int; v_prev int; u_now int; u_prev int; swipes int; matched int; followers int; new_followers int;
  series jsonb; viewers jsonb; top jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH'; end if;
  if p_range not in (7,30) then raise exception 'VALIDATION'; end if;
  since := date_trunc('day', now()) - (p_range - 1) * interval '1 day';
  prev_since := since - p_range * interval '1 day';

  select coalesce(jsonb_agg(cnt order by d), '[]'::jsonb) into series from (
    select d, (select count(*) from public.profile_views v
                where v.profile_id = me and v.created_at >= d and v.created_at < d + interval '1 day') as cnt
    from generate_series(since, date_trunc('day', now()), interval '1 day') as d) s;

  select count(*), count(distinct viewer_id) into v_now, u_now from public.profile_views where profile_id = me and created_at >= since;
  select count(*), count(distinct viewer_id) into v_prev, u_prev from public.profile_views
   where profile_id = me and created_at >= prev_since and created_at < since;
  select count(*) into swipes from public.match_swipes where swiper_id = me and action <> 'pass';
  select count(*) into matched from public.matches where me in (user_a, user_b);
  select followers_count into followers from public.profiles where id = me;
  select count(*) into new_followers from public.follows where followee_id = me and created_at >= since;

  -- "Who viewed you" is a Pro feature.
  if public.my_tier() <> 'free' then
    select coalesce(jsonb_agg(public.lite(p) || jsonb_build_object('viewed_at', x.viewed_at) order by x.viewed_at desc), '[]'::jsonb)
      into viewers
      from (select viewer_id, max(created_at) as viewed_at from public.profile_views
             where profile_id = me group by viewer_id order by max(created_at) desc limit 8) x
      join public.profiles p on p.id = x.viewer_id;
  else
    viewers := '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'body', body, 'like_count', like_count, 'comment_count', comment_count)
                            order by like_count desc), '[]'::jsonb)
    into top from (select * from public.posts where author_id = me order by like_count desc limit 3) t;

  return jsonb_build_object(
    'range', p_range,
    'views', series,
    'totals', jsonb_build_object('views', v_now, 'unique_viewers', u_now, 'followers', coalesce(followers, 0),
                                 'match_rate', case when swipes = 0 then 0 else round(matched * 100.0 / swipes) end),
    'deltas', jsonb_build_object(
      'views', case when v_prev = 0 then 0 else round((v_now - v_prev) * 100.0 / v_prev) end,
      'unique_viewers', case when u_prev = 0 then 0 else round((u_now - u_prev) * 100.0 / u_prev) end,
      'followers', case when coalesce(followers, 0) = 0 then 0 else round(new_followers * 100.0 / followers) end,
      'match_rate', 0),
    'viewers', viewers,
    'top_posts', top);
end $$;
create or replace function public.get_posts(p_scope text default 'foryou',p_target uuid default null,p_limit int default 60)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(public.post_json(x.post) order by x.rank_likes desc nulls last,x.created_at desc,x.id desc),'[]'::jsonb)
 from (select p as post,p.id,p.created_at,case when p_scope='trending' then p.like_count end rank_likes from public.posts p
 where public.can_read_post(p.id) and case p_scope
 when 'following' then p.author_id=auth.uid() or p.author_id in(select followee_id from public.follows where follower_id=auth.uid())
 when 'trending' then p.created_at>now()-interval '14 days'
 when 'user' then p.author_id=p_target when 'community' then p.community_id=p_target
 when 'post' then p.id=p_target when 'saved' then p.id in(select post_id from public.post_saves where user_id=auth.uid()) else true end
 order by rank_likes desc nulls last,p.created_at desc,p.id desc limit least(greatest(p_limit,1),100)) x;
$$;

create function public.feed_page(p_scope text default 'foryou',p_before timestamptz default null,p_before_id uuid default null,p_limit int default 30)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(public.post_json(x) order by x.created_at desc,x.id desc),'[]'::jsonb)
 from (select p.* from public.posts p where public.can_read_post(p.id)
 and (p_before is null or (p.created_at,p.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
 and (p_scope<>'following' or p.author_id=auth.uid() or p.author_id in(select followee_id from public.follows where follower_id=auth.uid()))
 and (p_scope<>'trending' or p.created_at>now()-interval '14 days')
 order by p.created_at desc,p.id desc limit least(greatest(p_limit,1),100)) x;
$$;

create function public.message_page(p_conversation uuid,p_before timestamptz default null,p_before_id uuid default null,p_limit int default 50)
returns setof public.messages language sql stable security invoker set search_path=public as $$
 select m.* from public.messages m where m.conversation_id=p_conversation
 and (p_before is null or (m.created_at,m.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
 order by m.created_at desc,m.id desc limit least(greatest(p_limit,1),100);
$$;
create index messages_cursor_idx on public.messages(conversation_id,created_at desc,id desc);
create index posts_cursor_idx on public.posts(created_at desc,id desc);

-- Internal serializers cannot be called with fabricated composite rows.
revoke execute on function public.post_json(public.posts) from authenticated;
revoke execute on function public.feed_page(text,timestamptz,uuid,int),public.message_page(uuid,timestamptz,uuid,int) from public,anon;
grant execute on function public.feed_page(text,timestamptz,uuid,int),public.message_page(uuid,timestamptz,uuid,int) to authenticated;
