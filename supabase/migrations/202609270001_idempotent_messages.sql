-- Additive: existing messages and older clients keep working with a null key.
alter table public.messages add column client_request_id text
  check (client_request_id is null or char_length(client_request_id) between 1 and 128);
create unique index messages_sender_request_uidx
  on public.messages(sender_id, client_request_id) where client_request_id is not null;

-- Clients cannot forge server timestamps or database message IDs.
revoke insert on public.messages from authenticated;
grant insert (conversation_id, sender_id, body, client_request_id) on public.messages to authenticated;

create function public.send_message(p_conversation uuid, p_body text, p_request_id text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare me uuid := auth.uid(); previous public.messages; result public.messages;
begin
  if me is null then raise exception 'AUTH'; end if;
  if p_request_id is null or char_length(p_request_id) not between 1 and 128
     or p_body is null or char_length(btrim(p_body)) not between 1 and 4000
     then raise exception 'VALIDATION'; end if;
  if not public.is_member(p_conversation) or exists (
    select 1 from public.conversations c where c.id=p_conversation
      and public.is_blocked(case when c.user_a=me then c.user_b else c.user_a end)
  ) then raise exception 'FORBIDDEN'; end if;

  -- Serialize retries before the INSERT triggers consume quota or notify anyone.
  perform pg_advisory_xact_lock(hashtextextended(me::text || ':' || p_request_id, 0));
  select * into previous from public.messages
    where sender_id=me and client_request_id=p_request_id;
  if found then
    if previous.conversation_id<>p_conversation or previous.body<>btrim(p_body)
      then raise exception 'VALIDATION: Request key already used.'; end if;
    return to_jsonb(previous);
  end if;
  insert into public.messages(conversation_id,sender_id,body,client_request_id)
    values(p_conversation,me,btrim(p_body),p_request_id) returning * into result;
  return to_jsonb(result);
end $$;
revoke all on function public.send_message(uuid,text,text) from public,anon;
grant execute on function public.send_message(uuid,text,text) to authenticated;

-- Safe rollback: point the client back to its prior insert adapter, then drop
-- send_message(uuid,text,text). Keep the nullable column/index to retain retry
-- identity for stored messages. No deletion or table reset is necessary.
