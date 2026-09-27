-- Private operator queue. This does not grant any app user moderation access.
create table public.report_reviews (
 report_id uuid primary key references public.reports(id) on delete cascade,
 status text not null check(status in ('reviewing','resolved','dismissed')),
 note text not null check(length(btrim(note)) between 1 and 2000),
 operator_label text not null check(length(btrim(operator_label)) between 1 and 120),
 updated_at timestamptz not null default now()
);
create table public.report_review_history (
 id bigint generated always as identity primary key,
 report_id uuid not null references public.reports(id) on delete cascade,
 status text not null check(status in ('reviewing','resolved','dismissed')),
 note text not null,
 operator_label text not null,
 created_at timestamptz not null default now()
);
alter table public.report_reviews enable row level security;
alter table public.report_review_history enable row level security;
revoke all on public.report_reviews, public.report_review_history from public,anon,authenticated;
revoke all on sequence public.report_review_history_id_seq from public,anon,authenticated;
grant select on public.report_reviews,public.report_review_history to service_role;

create function public.review_report(p_report uuid,p_status text,p_note text,p_operator text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if p_status is null or p_status not in ('reviewing','resolved','dismissed')
 or p_note is null or length(btrim(p_note)) not between 1 and 2000
 or p_operator is null or length(btrim(p_operator)) not between 1 and 120 then
   raise exception 'Invalid review';
 end if;
 perform 1 from reports where id=p_report for update;
 if not found then raise exception 'Report not found'; end if;
 insert into report_reviews(report_id,status,note,operator_label)
 values(p_report,p_status,btrim(p_note),btrim(p_operator))
 on conflict(report_id) do update set status=excluded.status,note=excluded.note,operator_label=excluded.operator_label,updated_at=now();
 insert into report_review_history(report_id,status,note,operator_label)
 values(p_report,p_status,btrim(p_note),btrim(p_operator));
end $$;

create function public.moderation_queue(p_status text default 'open',p_limit integer default 50)
returns table(report_id uuid,kind text,target_id text,reason text,reported_at timestamptz,status text,note text,operator_label text)
language sql stable security definer set search_path=public as $$
 select r.id,r.kind,r.target_id,r.reason,r.created_at,coalesce(v.status,'open'),v.note,v.operator_label
 from reports r left join report_reviews v on v.report_id=r.id
 where p_status in ('open','reviewing','resolved','dismissed') and coalesce(v.status,'open')=p_status
 order by r.created_at,r.id limit greatest(1,least(coalesce(p_limit,50),100));
$$;
revoke execute on function public.review_report(uuid,text,text,text),public.moderation_queue(text,integer) from public,anon,authenticated;
grant execute on function public.review_report(uuid,text,text,text),public.moderation_queue(text,integer) to service_role;
