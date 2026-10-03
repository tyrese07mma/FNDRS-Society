-- Cover the remaining member writes, including writes made by security-definer RPCs.
-- Server cleanup has no member JWT and may still cascade through these tables.
do $$ declare t text; begin
 foreach t in array array[
  'events','startups','startup_upvotes','opportunities','opportunity_applications',
  'guide_saves','challenge_progress','intro_requests','profile_views',
  'conversation_reads','notifications','ai_messages','private_profile_data'
 ] loop
  execute format('create trigger account_active_guard before insert or update or delete on public.%I for each row execute function public.require_active_account()',t);
 end loop;
end $$;
