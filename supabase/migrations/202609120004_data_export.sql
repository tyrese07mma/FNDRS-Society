-- Bounded owner-only data portability. No target user or arbitrary SQL is accepted.
create function public.export_my_data_page(p_dataset text,p_after text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid(); owner_col text; keys text[]; predicate text; key_expr text; result jsonb;
begin
 if me is null then raise exception 'AUTH'; end if;
 if not public.account_is_active() then raise exception 'FORBIDDEN'; end if;
 if length(p_after)>2048 then raise exception 'VALIDATION'; end if;
 perform public.consume_action(me,'export_page',240,60);
 if p_dataset='account' then
   return jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',email)) from auth.users where id=me and p_after is null),'[]'::jsonb),'next',null);
 end if;
 case p_dataset
 when 'profiles' then owner_col:='id'; keys:=array['id'];
 when 'private_profile_data' then owner_col:='user_id'; keys:=array['user_id'];
 when 'user_settings','match_preferences','subscriptions' then owner_col:='user_id'; keys:=array['user_id'];
 when 'posts','comments' then owner_col:='author_id'; keys:=array['id'];
 when 'messages' then owner_col:='sender_id'; keys:=array['id'];
 when 'ai_messages','ai_usage','notifications','mentor_bookings' then owner_col:='user_id'; keys:=array['id'];
 when 'xp_ledger' then owner_col:='user_id'; keys:=array['user_id','reason','ref'];
 when 'startups' then owner_col:='owner_id'; keys:=array['id'];
 when 'events' then owner_col:='host_id'; keys:=array['id'];
 when 'opportunities' then owner_col:='poster_id'; keys:=array['id'];
 when 'reports' then owner_col:='reporter_id'; keys:=array['id'];
 when 'intro_requests' then owner_col:='requester_id'; keys:=array['id'];
 when 'post_likes','post_saves','poll_votes' then owner_col:='user_id'; keys:=array['post_id','user_id'];
 when 'guide_saves' then owner_col:='user_id'; keys:=array['guide_id','user_id'];
 when 'startup_upvotes' then owner_col:='user_id'; keys:=array['startup_id','user_id'];
 when 'community_members' then owner_col:='user_id'; keys:=array['community_id','user_id'];
 when 'event_rsvps' then owner_col:='user_id'; keys:=array['event_id','user_id'];
 when 'challenge_progress' then owner_col:='user_id'; keys:=array['challenge_id','user_id'];
 when 'conversation_reads' then owner_col:='user_id'; keys:=array['conversation_id','user_id'];
 when 'opportunity_applications' then owner_col:='applicant_id'; keys:=array['opportunity_id','applicant_id'];
 when 'blocks' then owner_col:='blocker_id'; keys:=array['blocker_id','blocked_id'];
 when 'match_swipes' then owner_col:='swiper_id'; keys:=array['swiper_id','target_id'];
 when 'follows' then predicate:='(t.follower_id=$1 or t.followee_id=$1)'; keys:=array['follower_id','followee_id'];
 when 'matches' then predicate:='(t.user_a=$1 or t.user_b=$1)'; keys:=array['user_a','user_b'];
 when 'conversations' then predicate:='(t.user_a=$1 or t.user_b=$1)'; keys:=array['id'];
 else raise exception 'VALIDATION';
 end case;
 predicate:=coalesce(predicate,format('t.%I=$1',owner_col));
 select 'jsonb_build_array('||string_agg(format('t.%I',k),',')||')::text' into key_expr from unnest(keys) k;
 execute format('select jsonb_build_object(''rows'',coalesce(jsonb_agg(x.data order by x.key),''[]''::jsonb),''next'',case when count(*)=100 then max(x.key) else null end) from
 (select %s as key,to_jsonb(t)-array[''stripe_customer_id'',''stripe_subscription_id'',''last_message''] as data from public.%I t
 where %s and ($2::text is null or %s>$2) order by %s limit 100) x',key_expr,p_dataset,predicate,key_expr,key_expr)
 into result using me,p_after;
 return result;
end $$;
revoke all on function public.export_my_data_page(text,text) from public,anon;
grant execute on function public.export_my_data_page(text,text) to authenticated;
