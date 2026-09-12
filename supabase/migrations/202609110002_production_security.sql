-- Incremental hardening of the supplied V2 schema. No demo data.
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  language text not null default 'en' check (language in ('de','en')),
  theme text not null default 'system' check (theme in ('system','light','dark')),
  notifications jsonb not null default '{"matches":true,"messages":true,"events":true,"digest":false}',
  ai_consent_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "settings: own" on public.user_settings for all to authenticated using (user_id=auth.uid()) with check(user_id=auth.uid());

create table public.match_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  roles public.user_role[] not null default '{}', stages public.startup_stage[] not null default '{}',
  industries text[] not null default '{}', min_score integer not null default 0 check(min_score between 0 and 99),
  updated_at timestamptz not null default now()
);
alter table public.match_preferences enable row level security;
create policy "preferences: own" on public.match_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create index blocks_target_idx on public.blocks(blocked_id);
alter table public.blocks enable row level security;
create policy "blocks: own" on public.blocks for all to authenticated using(blocker_id=auth.uid()) with check(blocker_id=auth.uid());
create function public.is_blocked(p_other uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=p_other) or (blocked_id=auth.uid() and blocker_id=p_other));
$$;

create table public.action_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null, window_start timestamptz not null, used integer not null check(used>0),
  primary key(user_id,action,window_start)
);
alter table public.action_limits enable row level security;
-- Internal only: clients cannot reset their counters or pick another user's quota.
create function public.consume_action(p_user uuid,p_action text,p_limit int,p_window_seconds int) returns void
language plpgsql security definer set search_path=public as $$
declare window_at timestamptz; amount int;
begin
 if p_user is null or p_limit<1 or p_window_seconds<1 then raise exception 'AUTH'; end if;
 window_at:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
 insert into public.action_limits values(p_user,p_action,window_at,1)
 on conflict(user_id,action,window_start) do update set used=action_limits.used+1
 where action_limits.used<p_limit returning used into amount;
 if amount is null then raise exception 'RATE_LIMIT'; end if;
end $$;

create or replace function public.my_tier() returns public.sub_tier language sql stable security definer set search_path=public as $$
 select coalesce((select s.tier from public.subscriptions s where s.user_id=auth.uid()
 and s.status in ('active','trialing') and s.current_period_end>now()),'free');
$$;

-- A hidden location must not remain readable via direct table requests or scores.
create table public.private_profile_data (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 location text not null default ''
);
alter table public.private_profile_data enable row level security;
create policy "private profile: own read" on public.private_profile_data for select to authenticated using(user_id=auth.uid());
insert into public.private_profile_data(user_id,location) select id,location from public.profiles where not location_visible;
update public.profiles set location='' where not location_visible;
create function public.protect_profile_location() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not new.location_visible then
   if new.location<>'' then insert into public.private_profile_data values(new.id,new.location)
   on conflict(user_id) do update set location=excluded.location; end if;
   new.location:='';
 elsif not old.location_visible and new.location='' then
   new.location:=coalesce((select location from public.private_profile_data where user_id=new.id),'');
 end if;
 return new;
end $$;
create trigger profile_location_privacy before update on public.profiles for each row execute function public.protect_profile_location();

create function public.can_read_post(p_post uuid) returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(select 1 from public.posts p left join public.communities c on c.id=p.community_id
 where p.id=p_post and not public.is_blocked(p.author_id)
 and (p.community_id is null or not c.is_private or exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=auth.uid())));
$$;
drop policy "posts: read" on public.posts;
create policy "posts: read authorized" on public.posts for select to authenticated using(public.can_read_post(id));
drop policy "comments: read" on public.comments;
create policy "comments: read authorized" on public.comments for select to authenticated using(public.can_read_post(post_id));
drop policy "comments: create own" on public.comments;
create policy "comments: create authorized" on public.comments for insert to authenticated with check(author_id=auth.uid() and public.can_read_post(post_id));
drop policy "likes: own" on public.post_likes;
create policy "likes: authorized" on public.post_likes for insert to authenticated with check(user_id=auth.uid() and public.can_read_post(post_id));
drop policy "saves: own" on public.post_saves;
create policy "saves: authorized" on public.post_saves for insert to authenticated with check(user_id=auth.uid() and public.can_read_post(post_id));

-- Locks event capacity before counting, including concurrent requests.
create or replace function public.on_rsvp() returns trigger language plpgsql security definer set search_path=public as $$
declare ev public.events;
begin
 if tg_op='INSERT' then
   select * into ev from public.events where id=new.event_id for update;
   if ev.starts_at<=now() then raise exception 'VALIDATION: Event has started.'; end if;
   if ev.capacity is not null and ev.going_count>=ev.capacity then raise exception 'VALIDATION: Event is full.'; end if;
   update public.events set going_count=going_count+1 where id=new.event_id;
   perform public.award_xp(new.user_id,'rsvp',new.event_id::text,10); return new;
 end if;
 update public.events set going_count=greatest(0,going_count-1) where id=old.event_id; return old;
end $$;

create function public.validate_message() returns trigger language plpgsql security definer set search_path=public as $$
declare other_user uuid;
begin
 select case when user_a=new.sender_id then user_b else user_a end into other_user from public.conversations
 where id=new.conversation_id and new.sender_id in(user_a,user_b);
 if other_user is null or public.is_blocked(other_user) then raise exception 'FORBIDDEN'; end if;
 perform public.consume_action(new.sender_id,'message',60,60);
 return new;
end $$;
create trigger message_guard before insert on public.messages for each row execute function public.validate_message();
create function public.notify_message() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid;
begin
 select case when user_a=new.sender_id then user_b else user_a end into recipient from public.conversations where id=new.conversation_id;
 perform public.notify(recipient,'message','New message',null,new.sender_id,'/chat/'||new.conversation_id);
 return new;
end $$;
create trigger message_notification after insert on public.messages for each row execute function public.notify_message();

create function public.validate_content_action() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.consume_action(auth.uid(),tg_table_name,case when tg_table_name='posts' then 10 else 30 end,60);
 return new;
end $$;
create trigger posts_rate before insert on public.posts for each row execute function public.validate_content_action();
create trigger comments_rate before insert on public.comments for each row execute function public.validate_content_action();
create trigger reports_rate before insert on public.reports for each row execute function public.validate_content_action();

create function public.validate_booking() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and (new.status<>'canceled' or old.status='canceled') then raise exception 'FORBIDDEN'; end if;
 if tg_op='INSERT' and not exists(select 1 from public.mentors where id=new.mentor_id and new.slot=any(slots) and profile_id<>new.user_id)
 then raise exception 'VALIDATION: Invalid slot.'; end if;
 return new;
end $$;
create trigger booking_guard before insert or update on public.mentor_bookings for each row execute function public.validate_booking();

update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='avatars';
create policy "avatars: delete own" on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

-- Only conversation members can send/receive typing broadcasts.
create policy "thread: receive" on realtime.messages for select to authenticated using(
 extension='broadcast' and exists(select 1 from public.conversations c where 'thread:'||c.id::text=realtime.topic() and auth.uid() in(c.user_a,c.user_b))
);
create policy "thread: send" on realtime.messages for insert to authenticated with check(
 extension='broadcast' and exists(select 1 from public.conversations c where 'thread:'||c.id::text=realtime.topic() and auth.uid() in(c.user_a,c.user_b))
);

alter publication supabase_realtime add table public.subscriptions,public.posts,public.user_settings;
revoke all on public.action_limits,public.private_profile_data from anon,authenticated;
grant select on public.private_profile_data to authenticated;
grant select,insert,update,delete on public.user_settings,public.match_preferences,public.blocks to authenticated;
revoke execute on function public.consume_action(uuid,text,int,int), public.validate_message(),public.notify_message(),public.validate_content_action(),public.validate_booking(),public.protect_profile_location() from public,anon,authenticated;
revoke execute on function public.is_blocked(uuid),public.can_read_post(uuid) from public,anon;
grant execute on function public.is_blocked(uuid),public.can_read_post(uuid) to authenticated;
