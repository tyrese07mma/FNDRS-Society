create table public.ai_plan_limits (
 tier public.sub_tier primary key, requests_per_day int not null check(requests_per_day>0),
 max_output_tokens int not null check(max_output_tokens between 256 and 8192)
);
insert into public.ai_plan_limits values('free',5,1500),('pro',50,3000),('business',150,4000),('investor_plus',200,4000);
alter table public.ai_plan_limits enable row level security;
create policy "ai limits: read" on public.ai_plan_limits for select to authenticated using(true);
revoke insert,update,delete on public.ai_plan_limits from anon,authenticated;
create table public.ai_usage (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 model text not null, feature text not null default 'copilot', tier public.sub_tier not null,
 status text not null default 'pending' check(status in('pending','completed','failed')),
 input_tokens int not null default 0 check(input_tokens>=0),output_tokens int not null default 0 check(output_tokens>=0),
 created_at timestamptz not null default now(),completed_at timestamptz
);
create index ai_usage_user_time_idx on public.ai_usage(user_id,created_at desc);
alter table public.ai_usage enable row level security;
create policy "ai usage: own read" on public.ai_usage for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.ai_usage from anon,authenticated;
create function public.begin_ai_request(p_user uuid,p_model text) returns jsonb language plpgsql security definer set search_path=public as $$
declare plan public.sub_tier; quota public.ai_plan_limits; request_id uuid;
begin
 if not exists(select 1 from public.user_settings where user_id=p_user and ai_consent_at is not null) then raise exception 'CONSENT_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('ai:'||p_user::text,0));
 if exists(select 1 from public.ai_usage where user_id=p_user and status='pending' and created_at>now()-interval '2 minutes') then raise exception 'AI_BUSY'; end if;
 select tier into plan from public.subscriptions where user_id=p_user and status in('active','trialing') and current_period_end>now();
 plan:=coalesce(plan,'free');
 select * into quota from public.ai_plan_limits where tier=plan;
 perform public.consume_action(p_user,'ai',quota.requests_per_day,86400);
 insert into public.ai_usage(user_id,model,tier) values(p_user,p_model,plan) returning id into request_id;
 return jsonb_build_object('id',request_id,'max_output_tokens',quota.max_output_tokens);
end $$;
revoke execute on function public.begin_ai_request(uuid,text) from public,anon,authenticated;
grant execute on function public.begin_ai_request(uuid,text) to service_role;

create table public.stripe_events(id text primary key,created_at timestamptz not null default now(),stripe_created bigint not null);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon,authenticated;
alter table public.subscriptions add column stripe_event_created bigint not null default 0;
alter table public.subscriptions add column cancel_at_period_end boolean not null default false;
create function public.apply_stripe_event(p_event text,p_created bigint,p_user uuid,p_customer text,p_subscription text,p_tier public.sub_tier,p_status public.sub_status,p_period timestamptz,p_cancel boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||p_user::text,0));
 insert into public.stripe_events(id,stripe_created) values(p_event,p_created) on conflict do nothing;
 if not found then return; end if;
 insert into public.subscriptions(user_id,tier,status,stripe_customer_id,stripe_subscription_id,current_period_end,stripe_event_created,cancel_at_period_end)
 values(p_user,p_tier,p_status,p_customer,p_subscription,p_period,p_created,p_cancel)
 on conflict(user_id) do update set tier=excluded.tier,status=excluded.status,stripe_customer_id=excluded.stripe_customer_id,
 stripe_subscription_id=excluded.stripe_subscription_id,current_period_end=excluded.current_period_end,
 stripe_event_created=excluded.stripe_event_created,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now()
 where subscriptions.stripe_event_created<=excluded.stripe_event_created;
 if found then perform public.notify(p_user,'system','Subscription updated',null,null,'/premium'); end if;
end $$;
revoke execute on function public.apply_stripe_event(text,bigint,uuid,text,text,public.sub_tier,public.sub_status,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.apply_stripe_event(text,bigint,uuid,text,text,public.sub_tier,public.sub_status,timestamptz,boolean) to service_role;
