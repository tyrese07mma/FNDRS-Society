-- Blocking stops new contact. Existing conversation history is retained.
create function public.guard_social_pair() returns trigger
language plpgsql security definer set search_path=public as $$
declare a uuid; b uuid;
begin
 if tg_table_name='follows' then a:=new.follower_id; b:=new.followee_id;
 elsif tg_table_name='blocks' then a:=new.blocker_id; b:=new.blocked_id;
 else a:=new.user_a; b:=new.user_b; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(a,b)::text||greatest(a,b)::text,0));
 if tg_table_name<>'blocks' and exists(select 1 from public.blocks where
   (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a)) then raise exception 'FORBIDDEN'; end if;
 return new;
end $$;
create trigger block_pair_guard before insert or update on public.blocks for each row execute function public.guard_social_pair();
create trigger follow_pair_guard before insert or update on public.follows for each row execute function public.guard_social_pair();
create trigger match_pair_guard before insert or update on public.matches for each row execute function public.guard_social_pair();
create trigger conversation_pair_guard before insert on public.conversations for each row execute function public.guard_social_pair();

create function public.on_block() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 delete from public.follows where (follower_id=new.blocker_id and followee_id=new.blocked_id) or (follower_id=new.blocked_id and followee_id=new.blocker_id);
 delete from public.matches where user_a=least(new.blocker_id,new.blocked_id) and user_b=greatest(new.blocker_id,new.blocked_id);
 update public.conversations set is_match=false where user_a=least(new.blocker_id,new.blocked_id) and user_b=greatest(new.blocker_id,new.blocked_id);
 delete from public.match_swipes where (swiper_id=new.blocker_id and target_id=new.blocked_id) or (swiper_id=new.blocked_id and target_id=new.blocker_id);
 return new;
end $$;
create trigger block_cleanup after insert or update on public.blocks for each row execute function public.on_block();

create or replace function public.validate_message() returns trigger language plpgsql security definer set search_path=public as $$
declare other_user uuid;
begin
 select case when user_a=new.sender_id then user_b else user_a end into other_user from public.conversations
 where id=new.conversation_id and new.sender_id in(user_a,user_b);
 if other_user is null then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(new.sender_id,other_user)::text||greatest(new.sender_id,other_user)::text,0));
 if exists(select 1 from public.blocks where (blocker_id=new.sender_id and blocked_id=other_user) or (blocker_id=other_user and blocked_id=new.sender_id)) then raise exception 'FORBIDDEN'; end if;
 perform public.consume_action(new.sender_id,'message',60,60);
 return new;
end $$;

create policy "profiles: blocked members hidden" on public.profiles as restrictive for select to authenticated
 using (id=auth.uid() or not public.is_blocked(id));

create function public.set_user_block(p_target uuid,p_blocked boolean) returns void
language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid();
begin
 if me is null then raise exception 'AUTH'; end if;
 if not public.account_is_active() then raise exception 'FORBIDDEN'; end if;
 if p_target is null or p_target=me or p_blocked is null then raise exception 'VALIDATION'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(me,p_target)::text||greatest(me,p_target)::text,0));
 if p_blocked then
   perform public.consume_action(me,'block',30,60);
   insert into public.blocks(blocker_id,blocked_id) values(me,p_target) on conflict do nothing;
 else delete from public.blocks where blocker_id=me and blocked_id=p_target;
 end if;
end $$;
create function public.list_blocked_users(p_after uuid default null) returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(x.obj order by x.id),'[]'::jsonb) from (
   select p.id,public.lite(p) as obj from public.blocks b join public.profiles p on p.id=b.blocked_id
   where b.blocker_id=auth.uid() and (p_after is null or p.id>p_after) order by p.id limit 50
 ) x;
$$;
revoke all on function public.guard_social_pair(),public.on_block(),public.set_user_block(uuid,boolean),public.list_blocked_users(uuid) from public,anon;
grant execute on function public.set_user_block(uuid,boolean),public.list_blocked_users(uuid) to authenticated;
