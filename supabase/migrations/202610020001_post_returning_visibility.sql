-- INSERT ... RETURNING evaluates SELECT policy before a STABLE table lookup
-- can see the inserted post. Evaluate visibility from the row values instead.
-- Preserve the existing block and private-community rules; no data is changed.
create function public.can_read_post_values(p_author uuid, p_community uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and not public.is_blocked(p_author)
    and (p_community is null or exists (
      select 1 from public.communities c where c.id=p_community
        and (not c.is_private or exists (
          select 1 from public.community_members m
          where m.community_id=c.id and m.user_id=auth.uid()
        ))
    ));
$$;
revoke all on function public.can_read_post_values(uuid,uuid) from public,anon;
grant execute on function public.can_read_post_values(uuid,uuid) to authenticated;
alter policy "posts: read authorized" on public.posts
  using(public.can_read_post_values(author_id,community_id));

-- Rollback (reintroduces the INSERT RETURNING bug): restore the policy's
-- previous USING(public.can_read_post(id)), then drop can_read_post_values.
