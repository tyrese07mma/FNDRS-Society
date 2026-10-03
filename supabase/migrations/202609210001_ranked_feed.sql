-- Preserve the old RPC for installed clients; the new cursor includes ranking.
create function public.feed_page_ranked(
  p_scope text default 'foryou', p_before timestamptz default null,
  p_before_id uuid default null, p_before_rank int default null, p_limit int default 30
) returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(
    public.post_json(x.post) || jsonb_build_object('feed_rank', x.rank)
    order by x.rank desc, x.created_at desc, x.id desc
  ), '[]'::jsonb)
  from (
    select p as post, p.id, p.created_at,
      case when p_scope='trending' then p.like_count else 0 end as rank
    from public.posts p
    where auth.uid() is not null and public.can_read_post(p.id)
      and p_scope in ('foryou','following','trending')
      and (p_scope<>'following' or p.author_id=auth.uid() or p.author_id in (
        select followee_id from public.follows where follower_id=auth.uid()
      ))
      and (p_scope<>'trending' or p.created_at>now()-interval '14 days')
      and (p_before is null or (
        case when p_scope='trending' then p.like_count else 0 end,
        p.created_at, p.id
      ) < (
        case when p_scope='trending' then coalesce(p_before_rank,0) else 0 end,
        p_before, coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
      ))
    order by rank desc,p.created_at desc,p.id desc
    limit least(greatest(p_limit,1),100)
  ) x;
$$;
revoke execute on function public.feed_page_ranked(text,timestamptz,uuid,int,int) from public,anon;
grant execute on function public.feed_page_ranked(text,timestamptz,uuid,int,int) to authenticated;
create index if not exists posts_trending_cursor_idx on public.posts(like_count desc,created_at desc,id desc);
