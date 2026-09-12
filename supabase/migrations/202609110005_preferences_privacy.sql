-- Owner-only profile projection keeps a hidden location editable without exposing it.
create function public.get_my_profile() returns jsonb
language sql stable security invoker set search_path=public as $$
 select to_jsonb(p) || jsonb_build_object('location',case when p.location_visible then p.location
   else coalesce((select d.location from public.private_profile_data d where d.user_id=p.id),'') end)
 from public.profiles p where p.id=auth.uid();
$$;
revoke execute on function public.get_my_profile() from public,anon;
grant execute on function public.get_my_profile() to authenticated;

-- Self-selected investor roles do not constitute verification.
create or replace function public.on_membership() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
   if exists(select 1 from public.communities where id=new.community_id and is_private)
     and not exists(select 1 from public.profiles where id=new.user_id and role='investor' and verified)
   then raise exception 'FORBIDDEN: This private space requires a verified investor profile.'; end if;
   update public.communities set member_count=member_count+1 where id=new.community_id;
   perform public.award_xp(new.user_id,'join',new.community_id::text,5);
   return new;
 end if;
 update public.communities set member_count=greatest(0,member_count-1) where id=old.community_id;
 return old;
end $$;

-- Preferences control creation of optional notifications, including realtime delivery.
-- Essential account/billing notifications remain enabled.
create or replace function public.notify(p_user uuid,p_kind public.notif_kind,p_title text,p_body text,p_actor uuid,p_link text)
returns void language sql security definer set search_path=public as $$
 insert into public.notifications(user_id,kind,title,body,actor_id,link)
 select p_user,p_kind,p_title,p_body,p_actor,p_link
 where p_user is not null and p_user is distinct from p_actor
 and not exists(select 1 from public.blocks where (blocker_id=p_user and blocked_id=p_actor) or (blocker_id=p_actor and blocked_id=p_user))
 and coalesce((select s.notifications -> (case p_kind::text when 'match' then 'matches' when 'message' then 'messages' when 'event' then 'events' else '__essential' end)
   from public.user_settings s where s.user_id=p_user),'true'::jsonb) <> 'false'::jsonb;
$$;
