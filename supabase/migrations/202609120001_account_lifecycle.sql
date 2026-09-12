-- A server-only lease serializes checkout and account deletion across instances.
create table public.account_operations (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 token uuid not null, expires_at timestamptz not null
);
create table public.account_deletions (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 requested_at timestamptz not null default now()
);
-- Minimal tombstones let late Stripe events be acknowledged after account removal.
create table public.deleted_billing_customers (
 customer_id text primary key, deleted_at timestamptz not null default now()
);
alter table public.account_operations enable row level security;
alter table public.account_deletions enable row level security;
alter table public.deleted_billing_customers enable row level security;
revoke all on public.account_operations,public.account_deletions,public.deleted_billing_customers from anon,authenticated;
grant all on public.account_operations,public.account_deletions,public.deleted_billing_customers to service_role;

create function public.claim_account_operation(p_user uuid,p_kind text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_token uuid:=gen_random_uuid();
begin
 if p_kind not in ('checkout','delete') then raise exception 'Invalid operation'; end if;
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_user::text,0));
 if not exists(select 1 from profiles where id=p_user) then raise exception 'Account unavailable'; end if;
 if exists(select 1 from account_operations where user_id=p_user and expires_at>now()) then raise exception 'Account operation in progress'; end if;
 if p_kind='checkout' and exists(select 1 from account_deletions where user_id=p_user) then raise exception 'Account deletion in progress'; end if;
 insert into account_operations values(p_user,v_token,now()+interval '5 minutes')
 on conflict(user_id) do update set token=excluded.token,expires_at=excluded.expires_at;
 if p_kind='delete' then
   insert into account_deletions(user_id) values(p_user) on conflict do nothing;
   update profiles set discoverable=false where id=p_user;
 end if;
 return v_token;
end $$;
create function public.release_account_operation(p_user uuid,p_token uuid) returns void
language sql security definer set search_path=public as $$
 delete from account_operations where user_id=p_user and token=p_token;
$$;
revoke execute on function public.claim_account_operation(uuid,text),public.release_account_operation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_account_operation(uuid,text),public.release_account_operation(uuid,uuid) to service_role;

create function public.account_is_active() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid())
 and not exists(select 1 from account_deletions where user_id=auth.uid());
$$;
revoke execute on function public.account_is_active() from public,anon;
grant execute on function public.account_is_active() to authenticated;
create function public.require_active_account() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not public.account_is_active() then raise exception 'FORBIDDEN: Account deletion is in progress.'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke execute on function public.require_active_account() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['profiles','posts','comments','post_likes','post_saves','poll_votes','follows','messages','match_swipes','community_members','event_rsvps','mentor_bookings','user_settings','match_preferences','blocks','reports'] loop
 execute format('create trigger account_active_guard before insert or update or delete on public.%I for each row execute function public.require_active_account()',t);
 end loop;
end $$;
drop policy "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects for insert to authenticated
 with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.account_is_active());
drop policy "avatars: replace own" on storage.objects;
create policy "avatars: replace own" on storage.objects for update to authenticated
 using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.account_is_active())
 with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.account_is_active());
-- Direct SQL deletion would bypass Storage and billing cleanup.
drop function public.delete_my_account();
