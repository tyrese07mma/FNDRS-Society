-- ============================================================================
-- FNDRS SOCIETY v2 — complete Postgres schema for Supabase
--
-- Run once on a fresh project (SQL editor → paste → Run), then seed.sql.
-- Everything the app needs lives here: tables, Row-Level Security, counters,
-- XP + notifications triggers, and the RPCs the app calls (feed, Smart Match,
-- inbox, analytics…). Business rules (paywall, swipe limits, DM policy,
-- event capacity) are enforced in the database, not just in the UI.
-- ============================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- enums
create type public.user_role     as enum ('founder','cofounder_seeker','investor','operator','mentor','agency');
create type public.startup_stage as enum ('idea','mvp','launched','pre_seed','seed','series_a_plus');
create type public.post_kind     as enum ('update','milestone','looking_for','poll','question');
create type public.swipe_action  as enum ('pass','connect','superlike');
create type public.sub_tier      as enum ('free','pro','business','investor_plus');
create type public.sub_status    as enum ('active','trialing','past_due','canceled','incomplete');
create type public.notif_kind    as enum ('match','message','follow','like','comment','event','achievement','intro','system');
create type public.opp_type      as enum ('cofounder','hiring','partnership','investment','freelance','accelerator');
create type public.dm_policy     as enum ('everyone','matches');

-- ============================================================================
-- PROFILES
-- ============================================================================
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  handle           text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  full_name        text not null default '',
  avatar_url       text,
  headline         text not null default '' check (char_length(headline) <= 120),
  bio              text not null default '' check (char_length(bio) <= 600),
  location         text not null default '',
  role             public.user_role not null default 'founder',
  stage            public.startup_stage not null default 'idea',
  skills           text[] not null default '{}',
  industries       text[] not null default '{}',
  looking_for      text[] not null default '{}',
  open_to          text[] not null default '{}',
  links            jsonb not null default '{}',
  verified         boolean not null default false,
  founder_score    int not null default 50,
  level            int not null default 1,
  xp               int not null default 0,
  onboarded        boolean not null default false,
  location_visible boolean not null default true,
  discoverable     boolean not null default true,
  dm_policy        public.dm_policy not null default 'everyone',
  followers_count  int not null default 0,
  following_count  int not null default 0,
  posts_count      int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index profiles_name_trgm on public.profiles using gin (full_name gin_trgm_ops);
create index profiles_handle_trgm on public.profiles using gin (handle gin_trgm_ops);

-- ============================================================================
-- SUBSCRIPTIONS (written only by the Stripe webhook with the service role)
-- ============================================================================
create table public.subscriptions (
  user_id                uuid primary key references public.profiles (id) on delete cascade,
  tier                   public.sub_tier not null default 'free',
  status                 public.sub_status not null default 'active',
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create or replace function public.my_tier() returns public.sub_tier
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when s.status in ('canceled','incomplete') then 'free'::public.sub_tier else s.tier end
       from public.subscriptions s where s.user_id = auth.uid()),
    'free');
$$;

-- ============================================================================
-- NOTIFICATIONS + XP (used by the triggers below)
-- ============================================================================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.notif_kind not null default 'system',
  title      text not null,
  body       text,
  actor_id   uuid,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_actor_fk foreign key (actor_id) references public.profiles (id) on delete set null
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create or replace function public.notify(p_user uuid, p_kind public.notif_kind, p_title text, p_body text, p_actor uuid, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, actor_id, link)
  select p_user, p_kind, p_title, p_body, p_actor, p_link
  where p_user is not null and p_user is distinct from p_actor;
$$;

-- One row per (user, reason, ref) — XP can never be farmed by toggling.
create table public.xp_ledger (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  reason     text not null,
  ref        text not null,
  amount     int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, reason, ref)
);

create or replace function public.award_xp(p_user uuid, p_reason text, p_ref text, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare old_level int; new_level int; new_xp int;
begin
  insert into public.xp_ledger (user_id, reason, ref, amount) values (p_user, p_reason, p_ref, p_amount)
  on conflict do nothing;
  if not found then return; end if;
  select level into old_level from public.profiles where id = p_user;
  update public.profiles
     set xp = xp + p_amount,
         level = 1 + (xp + p_amount) / 500,
         founder_score = least(99, founder_score + case when p_amount >= 50 then 1 else 0 end)
   where id = p_user
   returning level, xp into new_level, new_xp;
  if new_level > old_level then
    perform public.notify(p_user, 'achievement', 'You reached Level ' || new_level,
      (500 - new_xp % 500) || ' XP to the next level. Keep going!', null, '/challenges');
  end if;
end $$;

-- ============================================================================
-- SOCIAL GRAPH
-- ============================================================================
create table public.follows (
  follower_id uuid not null,
  followee_id uuid not null,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id),
  constraint follows_follower_fk foreign key (follower_id) references public.profiles (id) on delete cascade,
  constraint follows_followee_fk foreign key (followee_id) references public.profiles (id) on delete cascade
);
create index follows_followee_idx on public.follows (followee_id);

create table public.profile_views (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewer_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index profile_views_profile_idx on public.profile_views (profile_id, created_at desc);

-- ============================================================================
-- COMMUNITIES
-- ============================================================================
create table public.communities (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  tag          text not null default '',
  description  text not null default '',
  member_count int not null default 0,
  online_count int not null default 0,
  featured     boolean not null default false,
  is_private   boolean not null default false,
  hue          int not null default 36,
  rules        text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members (user_id);

-- ============================================================================
-- FEED
-- ============================================================================
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null default auth.uid(),
  kind          public.post_kind not null default 'update',
  body          text not null check (char_length(body) between 1 and 1000),
  tags          text[] not null default '{}' check (cardinality(tags) <= 5),
  poll          jsonb,
  community_id  uuid,
  like_count    int not null default 0,
  comment_count int not null default 0,
  created_at    timestamptz not null default now(),
  constraint posts_author_fk foreign key (author_id) references public.profiles (id) on delete cascade,
  constraint posts_community_fk foreign key (community_id) references public.communities (id) on delete set null
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_community_idx on public.posts (community_id, created_at desc);

create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_saves (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.poll_votes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  option_id  text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null default auth.uid(),
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint comments_author_fk foreign key (author_id) references public.profiles (id) on delete cascade
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('post','user','comment')),
  target_id   text not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- SMART MATCH
-- ============================================================================
create table public.match_swipes (
  swiper_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_id  uuid not null references public.profiles (id) on delete cascade,
  action     public.swipe_action not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index match_swipes_target_idx on public.match_swipes (target_id);

create table public.matches (
  user_a     uuid not null references public.profiles (id) on delete cascade,
  user_b     uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

-- ============================================================================
-- MESSAGING (1:1, pair normalised so user_a < user_b)
-- ============================================================================
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles (id) on delete cascade,
  user_b          uuid not null references public.profiles (id) on delete cascade,
  is_match        boolean not null default false,
  last_message    text,
  last_message_at timestamptz,
  last_sender_id  uuid,
  created_at      timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create or replace function public.is_member(p_conversation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c
                  where c.id = p_conversation and auth.uid() in (c.user_a, c.user_b));
$$;

-- ============================================================================
-- EVENTS
-- ============================================================================
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 4 and 120),
  kind        text not null default 'Meetup',
  description text not null default '',
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  is_online   boolean not null default false,
  capacity    int,
  going_count int not null default 0,
  featured    boolean not null default false,
  hue         int not null default 36,
  host_id     uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint events_host_fk foreign key (host_id) references public.profiles (id) on delete set null
);
create index events_starts_idx on public.events (starts_at);

create table public.event_rsvps (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ============================================================================
-- INVESTORS · MENTORS · KNOWLEDGE · CHALLENGES
-- ============================================================================
create table public.investors (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null unique,
  firm            text not null,
  check_size      text not null default '',
  stages          text[] not null default '{}',
  sectors         text[] not null default '{}',
  thesis          text not null default '',
  portfolio_count int not null default 0,
  constraint investors_profile_fk foreign key (profile_id) references public.profiles (id) on delete cascade
);

create table public.intro_requests (
  id           uuid primary key default gen_random_uuid(),
  investor_id  uuid not null references public.investors (id) on delete cascade,
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  note         text not null default '',
  status       text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at   timestamptz not null default now(),
  unique (investor_id, requester_id)
);

create table public.mentors (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique,
  headline   text not null default '',
  rate_cents int not null default 0,
  tags       text[] not null default '{}',
  slots      text[] not null default '{}',
  rating     numeric(2,1) not null default 5.0,
  sessions   int not null default 0,
  constraint mentors_profile_fk foreign key (profile_id) references public.profiles (id) on delete cascade
);

create table public.mentor_bookings (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.mentors (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  slot       text not null,
  note       text not null default '',
  status     text not null default 'confirmed' check (status in ('confirmed','canceled')),
  created_at timestamptz not null default now()
);
create unique index mentor_bookings_slot_uidx on public.mentor_bookings (mentor_id, slot) where status = 'confirmed';

create table public.guides (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text not null default 'Product',
  kind         text not null default 'Guide',
  read_minutes int not null default 5,
  featured     boolean not null default false,
  summary      text not null default '',
  body         text not null default '',
  author_id    uuid,
  created_at   timestamptz not null default now(),
  constraint guides_author_fk foreign key (author_id) references public.profiles (id) on delete set null
);

create table public.guide_saves (
  guide_id   uuid not null references public.guides (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guide_id, user_id)
);

create table public.challenges (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  reward_xp   int not null default 100,
  steps       text[] not null default '{}',
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null
);

create table public.challenge_progress (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  step         int not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- ============================================================================
-- STARTUPS & OPPORTUNITIES
-- ============================================================================
create table public.startups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid(),
  name        text not null check (char_length(name) between 2 and 60),
  tagline     text not null check (char_length(tagline) between 6 and 120),
  description text not null default '',
  industry    text not null default 'SaaS',
  stage       public.startup_stage not null default 'idea',
  team_size   int not null default 1 check (team_size >= 1),
  website     text,
  raised      text,
  looking_for text[] not null default '{}',
  hue         int not null default 36,
  upvotes     int not null default 0,
  trending    boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint startups_owner_fk foreign key (owner_id) references public.profiles (id) on delete cascade
);

create table public.startup_upvotes (
  startup_id uuid not null references public.startups (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (startup_id, user_id)
);

create table public.opportunities (
  id          uuid primary key default gen_random_uuid(),
  poster_id   uuid not null default auth.uid(),
  title       text not null check (char_length(title) between 4 and 120),
  org         text not null,
  type        public.opp_type not null,
  industry    text not null default 'SaaS',
  equity      text,
  comp        text,
  location    text not null default 'Remote',
  remote      boolean not null default true,
  description text not null default '',
  tags        text[] not null default '{}',
  applicants  int not null default 0,
  created_at  timestamptz not null default now(),
  constraint opportunities_poster_fk foreign key (poster_id) references public.profiles (id) on delete cascade
);

create table public.opportunity_applications (
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  applicant_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  note           text not null default '',
  created_at     timestamptz not null default now(),
  primary key (opportunity_id, applicant_id)
);

-- ============================================================================
-- COPILOT HISTORY (written by the `copilot` Edge Function)
-- ============================================================================
create table public.ai_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index ai_messages_user_idx on public.ai_messages (user_id, created_at);

-- ============================================================================
-- TRIGGERS — counters, XP, notifications, integrity
-- ============================================================================
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- New auth user → profile with a unique handle + a free subscription row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidate text; tries int := 0;
begin
  base := left(lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '[^a-zA-Z0-9]', '', 'g')), 14);
  if char_length(base) < 3 then base := 'founder'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) and tries < 25 loop
    tries := tries + 1;
    candidate := base || (1000 + floor(random() * 9000))::int;
  end loop;
  insert into public.profiles (id, handle, full_name, avatar_url)
  values (new.id, candidate, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'avatar_url');
  insert into public.subscriptions (user_id) values (new.id);
  perform public.notify(new.id, 'system', 'Welcome to FNDRS Society 👋',
    'Your profile powers Smart Match — the more you add, the better your matches.', null, '/edit-profile');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Finishing onboarding is worth 100 XP (once).
create or replace function public.on_profile_onboarded() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.onboarded and not old.onboarded then
    insert into public.xp_ledger (user_id, reason, ref, amount) values (new.id, 'onboarded', 'profile', 100)
    on conflict do nothing;
    if found then
      new.xp := new.xp + 100;
      new.level := 1 + new.xp / 500;
    end if;
  end if;
  return new;
end $$;
create trigger profiles_onboarded before update of onboarded on public.profiles
  for each row execute function public.on_profile_onboarded();

create or replace function public.on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.followee_id;
    select full_name into who from public.profiles where id = new.follower_id;
    perform public.notify(new.followee_id, 'follow', coalesce(who, 'Someone') || ' started following you', null,
      new.follower_id, '/user/' || new.follower_id);
    return new;
  end if;
  update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
  update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.followee_id;
  return old;
end $$;
create trigger follows_counts after insert or delete on public.follows for each row execute function public.on_follow();

create or replace function public.on_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
    perform public.award_xp(new.author_id, 'post', new.id::text, 10);
    return new;
  end if;
  update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.author_id;
  return old;
end $$;
create trigger posts_counts after insert or delete on public.posts for each row execute function public.on_post();

-- Polls: 2–4 options, default three-day window.
create or replace function public.validate_poll() returns trigger language plpgsql as $$
declare n int;
begin
  if new.kind = 'poll' then
    n := coalesce(jsonb_array_length(new.poll -> 'options'), 0);
    if n < 2 or n > 4 then raise exception 'Polls need 2 to 4 options.'; end if;
    if new.poll -> 'ends_at' is null or new.poll ->> 'ends_at' is null then
      new.poll := jsonb_set(new.poll, '{ends_at}', to_jsonb(now() + interval '3 days'));
    end if;
  else
    new.poll := null;
  end if;
  return new;
end $$;
create trigger posts_validate_poll before insert on public.posts for each row execute function public.validate_poll();

create or replace function public.on_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid; who text; snippet text;
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id returning author_id, left(body, 70) into author, snippet;
    select full_name into who from public.profiles where id = new.user_id;
    perform public.notify(author, 'like', coalesce(who, 'Someone') || ' liked your post', snippet, new.user_id, '/post/' || new.post_id);
    return new;
  end if;
  update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  return old;
end $$;
create trigger post_likes_counts after insert or delete on public.post_likes for each row execute function public.on_like();

create or replace function public.on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid; who text;
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id returning author_id into author;
    select full_name into who from public.profiles where id = new.author_id;
    perform public.notify(author, 'comment', coalesce(who, 'Someone') || ' commented on your post', left(new.body, 90),
      new.author_id, '/post/' || new.post_id);
    perform public.award_xp(new.author_id, 'comment', new.id::text, 2);
    return new;
  end if;
  update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  return old;
end $$;
create trigger comments_counts after insert or delete on public.comments for each row execute function public.on_comment();

create or replace function public.on_match() returns trigger
language plpgsql security definer set search_path = public as $$
declare na text; nb text; conv uuid;
begin
  select full_name into na from public.profiles where id = new.user_a;
  select full_name into nb from public.profiles where id = new.user_b;
  select id into conv from public.conversations where user_a = new.user_a and user_b = new.user_b;
  perform public.notify(new.user_a, 'match', 'New match with ' || coalesce(nb, 'a founder'),
    'You both want to build together. Say hi!', new.user_b, '/chat/' || conv);
  perform public.notify(new.user_b, 'match', 'New match with ' || coalesce(na, 'a founder'),
    'You both want to build together. Say hi!', new.user_a, '/chat/' || conv);
  return new;
end $$;
create trigger matches_notify after insert on public.matches for each row execute function public.on_match();

create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message = left(new.body, 280), last_message_at = new.created_at, last_sender_id = new.sender_id
   where id = new.conversation_id;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, new.created_at)
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  return new;
end $$;
create trigger messages_preview after insert on public.messages for each row execute function public.on_message();

create or replace function public.on_membership() returns trigger
language plpgsql security definer set search_path = public as $$
declare priv boolean; my_role public.user_role;
begin
  if tg_op = 'INSERT' then
    select is_private into priv from public.communities where id = new.community_id;
    select role into my_role from public.profiles where id = new.user_id;
    if priv and my_role <> 'investor' then raise exception 'FORBIDDEN: This private space is for verified investors.'; end if;
    update public.communities set member_count = member_count + 1 where id = new.community_id;
    perform public.award_xp(new.user_id, 'join', new.community_id::text, 5);
    return new;
  end if;
  update public.communities set member_count = greatest(0, member_count - 1) where id = old.community_id;
  return old;
end $$;
create trigger community_members_counts before insert or delete on public.community_members
  for each row execute function public.on_membership();

create or replace function public.on_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.events e where e.id = new.event_id and e.capacity is not null and e.going_count >= e.capacity) then
      raise exception 'This event is full.';
    end if;
    update public.events set going_count = going_count + 1 where id = new.event_id;
    perform public.award_xp(new.user_id, 'rsvp', new.event_id::text, 10);
    return new;
  end if;
  update public.events set going_count = greatest(0, going_count - 1) where id = old.event_id;
  return old;
end $$;
create trigger event_rsvps_counts before insert or delete on public.event_rsvps for each row execute function public.on_rsvp();

create or replace function public.on_event_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.award_xp(new.host_id, 'event', new.id::text, 20);
  insert into public.event_rsvps (event_id, user_id) values (new.id, new.host_id) on conflict do nothing;
  return new;
end $$;
create trigger events_created after insert on public.events for each row execute function public.on_event_created();

create or replace function public.on_upvote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.startups set upvotes = upvotes + 1 where id = new.startup_id;
    return new;
  end if;
  update public.startups set upvotes = greatest(0, upvotes - 1) where id = old.startup_id;
  return old;
end $$;
create trigger startup_upvotes_counts after insert or delete on public.startup_upvotes for each row execute function public.on_upvote();

create or replace function public.on_startup_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.award_xp(new.owner_id, 'startup', new.id::text, 50);
  return new;
end $$;
create trigger startups_created after insert on public.startups for each row execute function public.on_startup_created();

create or replace function public.on_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare o public.opportunities; who text;
begin
  select * into o from public.opportunities where id = new.opportunity_id;
  if o.poster_id = new.applicant_id then raise exception 'This is your own listing.'; end if;
  update public.opportunities set applicants = applicants + 1 where id = new.opportunity_id;
  select full_name into who from public.profiles where id = new.applicant_id;
  perform public.notify(o.poster_id, 'system', coalesce(who, 'Someone') || ' applied to ' || o.title, left(new.note, 120),
    new.applicant_id, '/user/' || new.applicant_id);
  perform public.notify(new.applicant_id, 'system', 'Application sent to ' || o.org, o.title, o.poster_id, '/opportunities');
  perform public.award_xp(new.applicant_id, 'apply', new.opportunity_id::text, 5);
  return new;
end $$;
create trigger applications_created before insert on public.opportunity_applications
  for each row execute function public.on_application();

create or replace function public.on_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare mentor_profile uuid; mentor_name text; who text;
begin
  select m.profile_id, p.full_name into mentor_profile, mentor_name
    from public.mentors m join public.profiles p on p.id = m.profile_id where m.id = new.mentor_id;
  select full_name into who from public.profiles where id = new.user_id;
  perform public.notify(mentor_profile, 'event', 'New booking from ' || coalesce(who, 'a member'), new.slot, new.user_id, '/user/' || new.user_id);
  perform public.notify(new.user_id, 'event', 'Session booked with ' || coalesce(mentor_name, 'your mentor'), new.slot, mentor_profile, '/mentors');
  perform public.award_xp(new.user_id, 'booking', new.id::text, 10);
  return new;
end $$;
create trigger mentor_bookings_created after insert on public.mentor_bookings for each row execute function public.on_booking();

-- ============================================================================
-- RPCs (called by the app)
-- ============================================================================

-- Which answers in "looking for" a profile satisfies. Mirrors src/data/matching.ts.
create or replace function public.satisfies(needs text[], p_skills text[], p_role public.user_role) returns boolean
language sql immutable as $$
  select coalesce(bool_or(
    case n
      when 'Technical co-founder' then p_skills && array['Engineering','ML Engineering','Hardware','Data']
      when 'Business co-founder'  then p_skills && array['Sales','Fundraising','Operations','Marketing','Finance']
      when 'Engineers'            then p_skills && array['Engineering','ML Engineering','Data']
      when 'Designers'            then p_skills && array['Design','Product']
      when 'Growth / marketing'   then p_skills && array['Growth','Marketing','Community']
      when 'Investors'            then p_role = 'investor'
      when 'Mentors'              then p_role = 'mentor'
      when 'Advisors'             then p_role in ('mentor','investor')
      else false
    end), false)
  from unnest(needs) as n;
$$;

-- Founder-fit score (35–99) and human-readable reasons.
create or replace function public.fit(me public.profiles, p public.profiles) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  shared text[]; they boolean; i_have boolean; same_stage boolean; same_city boolean; cof boolean;
  score int; reasons text[] := '{}';
begin
  select coalesce(array_agg(i), '{}') into shared from unnest(p.industries) as i where i = any (me.industries);
  they := public.satisfies(me.looking_for, p.skills, p.role);
  i_have := public.satisfies(p.looking_for, me.skills, me.role);
  same_stage := p.stage = me.stage;
  same_city := me.location <> '' and lower(trim(split_part(p.location, ',', 1))) = lower(trim(split_part(me.location, ',', 1)));
  cof := 'cofounder' = any (p.open_to) and exists (select 1 from unnest(me.looking_for) as l where l ilike '%co-founder%');
  score := greatest(35, least(99,
    40 + least(cardinality(shared), 3) * 11
       + case when they then 17 else 0 end
       + case when i_have then 11 else 0 end
       + case when same_stage then 6 else 0 end
       + case when same_city then 5 else 0 end
       + case when cof then 6 else 0 end
       + case when p.verified then 2 else 0 end));
  if cardinality(shared) > 0 then reasons := array_append(reasons, 'Both building in ' || array_to_string(shared[1:2], ' & ')); end if;
  if they then reasons := array_append(reasons, case when p.role = 'investor' then 'Invests at your stage' else 'Has the skills you are looking for' end); end if;
  if i_have then reasons := array_append(reasons, 'Looking for what you bring'); end if;
  if cof then reasons := array_append(reasons, 'Open to co-founding'); end if;
  if same_stage then reasons := array_append(reasons, 'Same stage'); end if;
  if same_city then reasons := array_append(reasons, 'Also in ' || trim(split_part(p.location, ',', 1))); end if;
  if cardinality(reasons) = 0 then reasons := array['Active in your network']; end if;
  return jsonb_build_object('score', score, 'reasons', to_jsonb(reasons));
end $$;

create or replace function public.lite(p public.profiles) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id', p.id, 'handle', p.handle, 'full_name', p.full_name,
                            'avatar_url', p.avatar_url, 'headline', p.headline, 'verified', p.verified);
$$;

create or replace function public.stage_label(s public.startup_stage) returns text
language sql immutable as $$
  select case s when 'idea' then 'Idea' when 'mvp' then 'Building MVP' when 'launched' then 'Launched'
                when 'pre_seed' then 'Pre-seed' when 'seed' then 'Seed' else 'Series A' end;
$$;

-- ---------------------------------------------------------------- people
create or replace function public.get_profile(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p public.profiles; mine public.profiles; f jsonb;
begin
  select * into p from public.profiles where id = p_id;
  if not found then raise exception 'NOT_FOUND: This member no longer exists.'; end if;
  select * into mine from public.profiles where id = me;
  if p_id <> me then
    insert into public.profile_views (profile_id, viewer_id) values (p_id, me);
    f := public.fit(mine, p);
  end if;
  return to_jsonb(p) || jsonb_build_object(
    'location', case when p.location_visible or p_id = me then p.location else '' end,
    'is_me', p_id = me,
    'is_following', exists (select 1 from public.follows where follower_id = me and followee_id = p_id),
    'follows_me', exists (select 1 from public.follows where follower_id = p_id and followee_id = me),
    'is_match', exists (select 1 from public.matches where user_a = least(me, p_id) and user_b = greatest(me, p_id)),
    'match_score', f -> 'score',
    'match_reasons', coalesce(f -> 'reasons', '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- feed
create or replace function public.post_json(b public.posts) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', b.id, 'author_id', b.author_id,
    'author', (select public.lite(a) from public.profiles a where a.id = b.author_id),
    'kind', b.kind, 'body', b.body, 'tags', to_jsonb(b.tags),
    'poll', case when b.poll is null then null else jsonb_build_object(
      'ends_at', b.poll -> 'ends_at',
      'options', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', o ->> 'id', 'label', o ->> 'label',
                    'votes', (select count(*) from public.poll_votes v where v.post_id = b.id and v.option_id = o ->> 'id'))
                  order by ord), '[]'::jsonb)
                  from jsonb_array_elements(b.poll -> 'options') with ordinality as t(o, ord))) end,
    'like_count', b.like_count, 'comment_count', b.comment_count,
    'liked', exists (select 1 from public.post_likes l where l.post_id = b.id and l.user_id = auth.uid()),
    'saved', exists (select 1 from public.post_saves s where s.post_id = b.id and s.user_id = auth.uid()),
    'my_vote', (select v.option_id from public.poll_votes v where v.post_id = b.id and v.user_id = auth.uid()),
    'community_id', b.community_id, 'created_at', b.created_at);
$$;

-- scope: foryou | following | trending | user | community | post | saved
create or replace function public.get_posts(p_scope text default 'foryou', p_target uuid default null, p_limit int default 60)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.post_json((select original from public.posts original where original.id=x.id)) order by x.rank_likes desc nulls last, x.created_at desc), '[]'::jsonb)
  from (
    select p.*, case when p_scope = 'trending' then p.like_count end as rank_likes
    from public.posts p
    where case p_scope
      when 'following' then p.author_id = auth.uid()
                         or p.author_id in (select followee_id from public.follows where follower_id = auth.uid())
      when 'trending'  then p.created_at > now() - interval '14 days'
      when 'user'      then p.author_id = p_target
      when 'community' then p.community_id = p_target
      when 'post'      then p.id = p_target
      when 'saved'     then p.id in (select post_id from public.post_saves where user_id = auth.uid())
      else true end
    order by case when p_scope = 'trending' then p.like_count end desc nulls last, p.created_at desc
    limit p_limit
  ) x;
$$;

create or replace function public.vote_poll(p_post uuid, p_option text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pst public.posts;
begin
  select * into pst from public.posts where id = p_post;
  if pst.poll is null then raise exception 'NOT_FOUND: Poll not found.'; end if;
  if (pst.poll ->> 'ends_at')::timestamptz < now() then raise exception 'This poll has ended.'; end if;
  if not exists (select 1 from jsonb_array_elements(pst.poll -> 'options') o where o ->> 'id' = p_option) then
    raise exception 'Unknown poll option.';
  end if;
  insert into public.poll_votes (post_id, user_id, option_id) values (p_post, auth.uid(), p_option)
  on conflict (post_id, user_id) do update set option_id = excluded.option_id, created_at = now();
  return public.post_json(pst);
end $$;

-- ---------------------------------------------------------------- smart match
create or replace function public.match_candidates(
  p_roles public.user_role[] default '{}', p_stages public.startup_stage[] default '{}',
  p_industries text[] default '{}', p_min_score int default 0, p_limit int default 30)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(c.obj order by c.score desc, c.founder_score desc), '[]'::jsonb)
  from (
    select public.lite((select original from public.profiles original where original.id=f.id)) || jsonb_build_object(
             'location', case when f.location_visible then f.location else '' end,
             'bio', f.bio, 'role', f.role, 'stage', f.stage,
             'skills', to_jsonb(f.skills), 'industries', to_jsonb(f.industries),
             'looking_for', to_jsonb(f.looking_for), 'open_to', to_jsonb(f.open_to),
             'score', (f.fitness ->> 'score')::int, 'reasons', f.fitness -> 'reasons') as obj,
           (f.fitness ->> 'score')::int as score,
           f.founder_score
    from (
      select p.*, public.fit(m, p) as fitness
      from public.profiles p
      cross join public.profiles m
      where m.id = auth.uid()
        and p.id <> m.id and p.onboarded and p.discoverable
        and not exists (select 1 from public.match_swipes s where s.swiper_id = m.id and s.target_id = p.id)
        and not exists (select 1 from public.matches x where x.user_a = least(m.id, p.id) and x.user_b = greatest(m.id, p.id))
        and (cardinality(p_roles) = 0 or p.role = any (p_roles))
        and (cardinality(p_stages) = 0 or p.stage = any (p_stages))
        and (cardinality(p_industries) = 0 or p.industries && p_industries)
    ) f
    where (f.fitness ->> 'score')::int >= p_min_score
    order by (f.fitness ->> 'score')::int desc, f.founder_score desc
    limit p_limit
  ) c;
$$;

create or replace function public.swipes_left() returns int
language sql stable security definer set search_path = public as $$
  select case when public.my_tier() <> 'free' then null
              else greatest(0, 25 - (select count(*) from public.match_swipes
                                      where swiper_id = auth.uid() and created_at >= date_trunc('day', now())))::int end;
$$;

create or replace function public.swipe(p_target uuid, p_action public.swipe_action) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; conv uuid;
begin
  if me is null then raise exception 'AUTH: You are signed out.'; end if;
  if p_target = me then raise exception 'You cannot match with yourself.'; end if;
  if public.swipes_left() = 0 then raise exception 'SWIPE_LIMIT: You have used today''s free swipes.'; end if;
  insert into public.match_swipes (swiper_id, target_id, action) values (me, p_target, p_action)
  on conflict (swiper_id, target_id) do update set action = excluded.action, created_at = now();
  if p_action = 'pass'
     or not exists (select 1 from public.match_swipes where swiper_id = p_target and target_id = me and action <> 'pass') then
    return jsonb_build_object('matched', false, 'conversation_id', null);
  end if;
  a := least(me, p_target); b := greatest(me, p_target);
  insert into public.conversations (user_a, user_b, is_match) values (a, b, true)
  on conflict (user_a, user_b) do update set is_match = true
  returning id into conv;
  insert into public.matches (user_a, user_b) values (a, b) on conflict do nothing;
  perform public.award_xp(me, 'match', p_target::text, 15);
  perform public.award_xp(p_target, 'match', me::text, 15);
  return jsonb_build_object('matched', true, 'conversation_id', conv);
end $$;

create or replace function public.reset_passes() returns void
language sql security definer set search_path = public as $$
  delete from public.match_swipes where swiper_id = auth.uid() and action = 'pass';
$$;

create or replace function public.list_matches() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'profile', public.lite(o),
    'conversation_id', c.id,
    'matched_at', m.created_at,
    'has_messages', c.last_message_at is not null) order by m.created_at desc), '[]'::jsonb)
  from public.matches m
  join public.profiles o on o.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join public.conversations c on c.user_a = m.user_a and c.user_b = m.user_b
  where auth.uid() in (m.user_a, m.user_b);
$$;

-- ---------------------------------------------------------------- messaging
create or replace function public.open_conversation(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; conv uuid; pol public.dm_policy; matched boolean;
begin
  if me is null then raise exception 'AUTH: You are signed out.'; end if;
  if p_other = me then raise exception 'You cannot message yourself.'; end if;
  a := least(me, p_other); b := greatest(me, p_other);
  select id into conv from public.conversations where user_a = a and user_b = b;
  if conv is not null then return conv; end if;
  select dm_policy into pol from public.profiles where id = p_other;
  if pol is null then raise exception 'NOT_FOUND: This member no longer exists.'; end if;
  matched := exists (select 1 from public.matches where user_a = a and user_b = b);
  if pol = 'matches' and not matched then
    raise exception 'FORBIDDEN: This member only accepts messages from matches.';
  end if;
  insert into public.conversations (user_a, user_b, is_match) values (a, b, matched) returning id into conv;
  return conv;
end $$;

create or replace function public.list_conversations(p_id uuid default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.obj order by x.sort_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', c.id,
             'other', public.lite(o),
             'last_message', c.last_message,
             'last_message_at', c.last_message_at,
             'last_sender_id', c.last_sender_id,
             'unread', (select count(*) from public.messages m
                         where m.conversation_id = c.id and m.sender_id <> auth.uid()
                           and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)),
             'is_match', c.is_match,
             'other_last_read_at', ro.last_read_at,
             'created_at', c.created_at) as obj,
           coalesce(c.last_message_at, c.created_at) as sort_at
    from public.conversations c
    join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
    left join public.conversation_reads r  on r.conversation_id = c.id and r.user_id = auth.uid()
    left join public.conversation_reads ro on ro.conversation_id = c.id and ro.user_id = o.id
    where auth.uid() in (c.user_a, c.user_b) and (p_id is null or c.id = p_id)
  ) x;
$$;

create or replace function public.mark_read(p_conversation uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_conversation) then raise exception 'NOT_FOUND: Conversation not found.'; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at) values (p_conversation, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
end $$;

-- ---------------------------------------------------------------- directory
create or replace function public.get_communities(p_id uuid default null, p_query text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    (to_jsonb(c) - 'created_at')
    || jsonb_build_object('joined', exists (select 1 from public.community_members cm where cm.community_id = c.id and cm.user_id = auth.uid()))
    || case when p_id is null then '{}'::jsonb else jsonb_build_object('members',
         (select coalesce(jsonb_agg(public.lite(pr)), '[]'::jsonb)
            from (select pr.* from public.community_members cm join public.profiles pr on pr.id = cm.user_id
                   where cm.community_id = c.id order by cm.joined_at desc limit 12) pr)) end
    order by c.featured desc, c.member_count desc), '[]'::jsonb)
  from public.communities c
  where (p_id is null or c.id = p_id)
    and (p_query is null or c.name ilike '%' || p_query || '%' or c.tag ilike '%' || p_query || '%' or c.description ilike '%' || p_query || '%');
$$;

create or replace function public.get_events(p_id uuid default null, p_query text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    (to_jsonb(e) - 'host_id' - 'created_at')
    || jsonb_build_object(
         'going', exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = auth.uid()),
         'host', (select public.lite(h) from public.profiles h where h.id = e.host_id),
         'attendees', (select coalesce(jsonb_agg(public.lite(pr)), '[]'::jsonb)
                         from (select pr.* from public.event_rsvps r join public.profiles pr on pr.id = r.user_id
                                where r.event_id = e.id and r.user_id <> auth.uid() order by r.created_at desc limit 8) pr))
    order by e.starts_at), '[]'::jsonb)
  from public.events e
  where (p_id is null or e.id = p_id)
    and (p_query is null or e.title ilike '%' || p_query || '%' or e.kind ilike '%' || p_query || '%' or coalesce(e.location, '') ilike '%' || p_query || '%');
$$;

create or replace function public.get_investors() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.obj order by x.fit desc), '[]'::jsonb)
  from (
    select (to_jsonb(i) - 'profile_id') || jsonb_build_object(
             'profile', public.lite(p),
             'fit', greatest(40, least(98, 44
                    + (select count(*) from unnest(i.sectors) s where s = any (m.industries))::int * 16
                    + case when public.stage_label(m.stage) = any (i.stages) then 20 else 0 end)),
             'requested', exists (select 1 from public.intro_requests r where r.investor_id = i.id and r.requester_id = m.id)) as obj,
           greatest(40, least(98, 44
             + (select count(*) from unnest(i.sectors) s where s = any (m.industries))::int * 16
             + case when public.stage_label(m.stage) = any (i.stages) then 20 else 0 end)) as fit
    from public.investors i
    join public.profiles p on p.id = i.profile_id
    cross join public.profiles m
    where m.id = auth.uid()
  ) x;
$$;

create or replace function public.request_intro(p_investor uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare target uuid; who text;
begin
  if public.my_tier() = 'free' then raise exception 'PRO_REQUIRED: Warm intros are part of FNDRS Pro.'; end if;
  select profile_id into target from public.investors where id = p_investor;
  if target is null then raise exception 'NOT_FOUND: Investor not found.'; end if;
  insert into public.intro_requests (investor_id, requester_id, note) values (p_investor, auth.uid(), coalesce(p_note, ''));
  select full_name into who from public.profiles where id = auth.uid();
  perform public.notify(target, 'intro', coalesce(who, 'A founder') || ' requested a warm intro', left(p_note, 140), auth.uid(), '/user/' || auth.uid());
  perform public.notify(auth.uid(), 'intro', 'Intro requested', 'We will let you know as soon as they respond.', target, '/investors');
exception when unique_violation then
  raise exception 'You already requested this intro.';
end $$;

create or replace function public.get_guides(p_id uuid default null, p_saved boolean default false) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    (to_jsonb(g) - 'author_id')
    || jsonb_build_object(
         'author', (select public.lite(a) from public.profiles a where a.id = g.author_id),
         'saved', exists (select 1 from public.guide_saves s where s.guide_id = g.id and s.user_id = auth.uid()))
    order by g.featured desc, g.created_at desc), '[]'::jsonb)
  from public.guides g
  where (p_id is null or g.id = p_id)
    and (not p_saved or exists (select 1 from public.guide_saves s where s.guide_id = g.id and s.user_id = auth.uid()));
$$;

create or replace function public.challenge_json(c public.challenges) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'description', c.description, 'reward_xp', c.reward_xp,
    'steps', to_jsonb(c.steps), 'ends_at', c.ends_at,
    'active', now() between c.starts_at and c.ends_at,
    'my_step', coalesce((select step from public.challenge_progress p where p.challenge_id = c.id and p.user_id = auth.uid()), 0),
    'participants', (select count(*) from public.challenge_progress p where p.challenge_id = c.id));
$$;

create or replace function public.get_challenges() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.challenge_json(c) order by (now() between c.starts_at and c.ends_at) desc, c.ends_at desc), '[]'::jsonb)
  from (select * from public.challenges where starts_at <= now() order by ends_at desc limit 12) c;
$$;

create or replace function public.advance_challenge(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.challenges; cur int; nxt int;
begin
  select * into c from public.challenges where id = p_id;
  if not found then raise exception 'NOT_FOUND: Challenge not found.'; end if;
  if now() not between c.starts_at and c.ends_at then raise exception 'This challenge has ended.'; end if;
  select step into cur from public.challenge_progress where challenge_id = p_id and user_id = auth.uid();
  cur := coalesce(cur, 0);
  if cur >= cardinality(c.steps) then raise exception 'You already completed this challenge.'; end if;
  nxt := cur + 1;
  insert into public.challenge_progress (challenge_id, user_id, step) values (p_id, auth.uid(), nxt)
  on conflict (challenge_id, user_id) do update set step = excluded.step, updated_at = now();
  if nxt = cardinality(c.steps) then
    perform public.award_xp(auth.uid(), 'challenge', p_id::text, c.reward_xp);
    perform public.notify(auth.uid(), 'achievement', 'Challenge complete: ' || c.title,
      '+' || c.reward_xp || ' XP — you are on the leaderboard.', null, '/challenges');
  else
    perform public.award_xp(auth.uid(), 'challenge_step', p_id::text || ':' || nxt, 25);
  end if;
  return public.challenge_json(c);
end $$;

create or replace function public.leaderboard() returns jsonb
language sql stable security definer set search_path = public as $$
  with ranked as (
    select p.*, row_number() over (order by p.xp desc, p.created_at) as rnk
    from public.profiles p where p.onboarded
  )
  select coalesce(jsonb_agg(public.lite((select original from public.profiles original where original.id=r.id)) || jsonb_build_object('xp', r.xp, 'level', r.level, 'rank', r.rnk, 'is_me', r.id = auth.uid())
                            order by r.rnk), '[]'::jsonb)
  from ranked r
  where r.rnk <= 10 or r.id = auth.uid();
$$;

create or replace function public.get_startups(p_sort text default 'trending', p_id uuid default null, p_query text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    (to_jsonb(s) - 'owner_id')
    || jsonb_build_object(
         'owner', (select public.lite(o) from public.profiles o where o.id = s.owner_id),
         'upvoted', exists (select 1 from public.startup_upvotes u where u.startup_id = s.id and u.user_id = auth.uid()))
    order by case when p_sort = 'trending' then s.upvotes end desc nulls last, s.created_at desc), '[]'::jsonb)
  from public.startups s
  where (p_id is null or s.id = p_id)
    and (p_sort <> 'mine' or s.owner_id = auth.uid())
    and (p_query is null or s.name ilike '%' || p_query || '%' or s.tagline ilike '%' || p_query || '%' or s.industry ilike '%' || p_query || '%');
$$;

create or replace function public.get_opportunities(p_type text default 'all', p_id uuid default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    (to_jsonb(o) - 'poster_id')
    || jsonb_build_object(
         'poster', (select public.lite(pp) from public.profiles pp where pp.id = o.poster_id),
         'applied', exists (select 1 from public.opportunity_applications a where a.opportunity_id = o.id and a.applicant_id = m.id),
         'match', greatest(40, least(97, 50
            + case when o.industry = any (m.industries) then 22 else 0 end
            + (select count(*) from unnest(o.tags) t where lower(t) = any (select lower(x) from unnest(m.skills) x))::int * 8
            + case when o.type = 'cofounder' and 'cofounder' = any (m.open_to) then 12 else 0 end
            + case when o.type = 'investment' and m.role = 'founder' then 10 else 0 end
            + case when o.type = 'accelerator' and m.stage in ('idea','mvp','pre_seed') then 12 else 0 end)))
    order by o.created_at desc), '[]'::jsonb)
  from public.opportunities o
  cross join public.profiles m
  where m.id = auth.uid()
    and (p_id is null or o.id = p_id)
    and (p_type = 'all' or o.type::text = p_type);
$$;

-- ---------------------------------------------------------------- analytics
create or replace function public.get_analytics(p_range int default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid(); since timestamptz; prev_since timestamptz;
  v_now int; v_prev int; u_now int; u_prev int; swipes int; matched int; followers int; new_followers int;
  series jsonb; viewers jsonb; top jsonb;
begin
  since := date_trunc('day', now()) - (p_range - 1) * interval '1 day';
  prev_since := since - p_range * interval '1 day';

  select coalesce(jsonb_agg(cnt order by d), '[]'::jsonb) into series from (
    select d, (select count(*) from public.profile_views v
                where v.profile_id = me and v.created_at >= d and v.created_at < d + interval '1 day') as cnt
    from generate_series(since, date_trunc('day', now()), interval '1 day') as d) s;

  select count(*), count(distinct viewer_id) into v_now, u_now from public.profile_views where profile_id = me and created_at >= since;
  select count(*), count(distinct viewer_id) into v_prev, u_prev from public.profile_views
   where profile_id = me and created_at >= prev_since and created_at < since;
  select count(*) into swipes from public.match_swipes where swiper_id = me and action <> 'pass';
  select count(*) into matched from public.matches where me in (user_a, user_b);
  select followers_count into followers from public.profiles where id = me;
  select count(*) into new_followers from public.follows where followee_id = me and created_at >= since;

  -- "Who viewed you" is a Pro feature.
  if public.my_tier() <> 'free' then
    select coalesce(jsonb_agg(public.lite(p) || jsonb_build_object('viewed_at', x.viewed_at) order by x.viewed_at desc), '[]'::jsonb)
      into viewers
      from (select viewer_id, max(created_at) as viewed_at from public.profile_views
             where profile_id = me group by viewer_id order by max(created_at) desc limit 8) x
      join public.profiles p on p.id = x.viewer_id;
  else
    viewers := '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'body', body, 'like_count', like_count, 'comment_count', comment_count)
                            order by like_count desc), '[]'::jsonb)
    into top from (select * from public.posts where author_id = me order by like_count desc limit 3) t;

  return jsonb_build_object(
    'range', p_range,
    'views', series,
    'totals', jsonb_build_object('views', v_now, 'unique_viewers', u_now, 'followers', coalesce(followers, 0),
                                 'match_rate', case when swipes = 0 then 0 else round(matched * 100.0 / swipes) end),
    'deltas', jsonb_build_object(
      'views', case when v_prev = 0 then 0 else round((v_now - v_prev) * 100.0 / v_prev) end,
      'unique_viewers', case when u_prev = 0 then 0 else round((u_now - u_prev) * 100.0 / u_prev) end,
      'followers', case when coalesce(followers, 0) = 0 then 0 else round(new_followers * 100.0 / followers) end,
      'match_rate', 0),
    'viewers', viewers,
    'top_posts', top);
end $$;

-- ---------------------------------------------------------------- account
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH: You are signed out.'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================
alter table public.profiles                enable row level security;
alter table public.subscriptions           enable row level security;
alter table public.notifications           enable row level security;
alter table public.xp_ledger               enable row level security;
alter table public.follows                 enable row level security;
alter table public.profile_views           enable row level security;
alter table public.communities             enable row level security;
alter table public.community_members       enable row level security;
alter table public.posts                   enable row level security;
alter table public.post_likes              enable row level security;
alter table public.post_saves              enable row level security;
alter table public.poll_votes              enable row level security;
alter table public.comments                enable row level security;
alter table public.reports                 enable row level security;
alter table public.match_swipes            enable row level security;
alter table public.matches                 enable row level security;
alter table public.conversations           enable row level security;
alter table public.messages                enable row level security;
alter table public.conversation_reads      enable row level security;
alter table public.events                  enable row level security;
alter table public.event_rsvps             enable row level security;
alter table public.investors               enable row level security;
alter table public.intro_requests          enable row level security;
alter table public.mentors                 enable row level security;
alter table public.mentor_bookings         enable row level security;
alter table public.guides                  enable row level security;
alter table public.guide_saves             enable row level security;
alter table public.challenges              enable row level security;
alter table public.challenge_progress      enable row level security;
alter table public.startups                enable row level security;
alter table public.startup_upvotes         enable row level security;
alter table public.opportunities           enable row level security;
alter table public.opportunity_applications enable row level security;
alter table public.ai_messages             enable row level security;

-- profiles: everyone signed in can read; you can edit your own safe columns only
create policy "profiles: read" on public.profiles for select to authenticated using (true);
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (handle, full_name, avatar_url, headline, bio, location, role, stage, skills, industries, looking_for,
              open_to, links, onboarded, location_visible, discoverable, dm_policy) on public.profiles to authenticated;

create policy "subscriptions: read own" on public.subscriptions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.subscriptions from anon, authenticated;

create policy "notifications: read own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications: update own" on public.notifications for update to authenticated using (user_id = auth.uid());
revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;

create policy "follows: read" on public.follows for select to authenticated using (true);
create policy "follows: insert own" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "follows: delete own" on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "views: read own" on public.profile_views for select to authenticated using (profile_id = auth.uid());

create policy "communities: read" on public.communities for select to authenticated using (true);
create policy "members: read" on public.community_members for select to authenticated using (true);
create policy "members: join" on public.community_members for insert to authenticated with check (user_id = auth.uid());
create policy "members: leave" on public.community_members for delete to authenticated using (user_id = auth.uid());

create policy "posts: read" on public.posts for select to authenticated using (true);
create policy "posts: create own" on public.posts for insert to authenticated with check (
  author_id = auth.uid()
  and (community_id is null or exists (select 1 from public.community_members m where m.community_id = posts.community_id and m.user_id = auth.uid())));
create policy "posts: delete own" on public.posts for delete to authenticated using (author_id = auth.uid());
revoke insert, update on public.posts from anon, authenticated;
grant insert (author_id, kind, body, tags, poll, community_id) on public.posts to authenticated;

create policy "likes: read" on public.post_likes for select to authenticated using (true);
create policy "likes: own" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes: unlike own" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create policy "saves: read own" on public.post_saves for select to authenticated using (user_id = auth.uid());
create policy "saves: own" on public.post_saves for insert to authenticated with check (user_id = auth.uid());
create policy "saves: delete own" on public.post_saves for delete to authenticated using (user_id = auth.uid());

create policy "votes: read" on public.poll_votes for select to authenticated using (true);

create policy "comments: read" on public.comments for select to authenticated using (true);
create policy "comments: create own" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "comments: delete own" on public.comments for delete to authenticated using (author_id = auth.uid());

create policy "reports: create own" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

create policy "swipes: read own" on public.match_swipes for select to authenticated using (swiper_id = auth.uid());
create policy "matches: read own" on public.matches for select to authenticated using (auth.uid() in (user_a, user_b));

create policy "conversations: members read" on public.conversations for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "messages: members read" on public.messages for select to authenticated using (public.is_member(conversation_id));
create policy "messages: members send" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_member(conversation_id));
create policy "reads: members read" on public.conversation_reads for select to authenticated using (public.is_member(conversation_id));

create policy "events: read" on public.events for select to authenticated using (true);
create policy "events: host creates" on public.events for insert to authenticated with check (host_id = auth.uid());
create policy "events: host edits" on public.events for update to authenticated using (host_id = auth.uid());
revoke insert, update on public.events from anon, authenticated;
grant insert (title, kind, description, starts_at, ends_at, location, is_online, capacity, hue, host_id) on public.events to authenticated;
grant update (title, kind, description, starts_at, ends_at, location, is_online, capacity) on public.events to authenticated;

create policy "rsvps: read" on public.event_rsvps for select to authenticated using (true);
create policy "rsvps: own" on public.event_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy "rsvps: cancel own" on public.event_rsvps for delete to authenticated using (user_id = auth.uid());

create policy "investors: read" on public.investors for select to authenticated using (true);
create policy "intros: read own" on public.intro_requests for select to authenticated
  using (requester_id = auth.uid() or investor_id in (select id from public.investors where profile_id = auth.uid()));

create policy "mentors: read" on public.mentors for select to authenticated using (true);
create policy "bookings: read own" on public.mentor_bookings for select to authenticated
  using (user_id = auth.uid() or mentor_id in (select id from public.mentors where profile_id = auth.uid()));
create policy "bookings: create own" on public.mentor_bookings for insert to authenticated with check (user_id = auth.uid());
create policy "bookings: cancel own" on public.mentor_bookings for update to authenticated using (user_id = auth.uid());
revoke update on public.mentor_bookings from anon, authenticated;
grant update (status) on public.mentor_bookings to authenticated;

create policy "guides: read" on public.guides for select to authenticated using (true);
create policy "guide saves: read own" on public.guide_saves for select to authenticated using (user_id = auth.uid());
create policy "guide saves: own" on public.guide_saves for insert to authenticated with check (user_id = auth.uid());
create policy "guide saves: delete own" on public.guide_saves for delete to authenticated using (user_id = auth.uid());

create policy "challenges: read" on public.challenges for select to authenticated using (true);
create policy "progress: read own" on public.challenge_progress for select to authenticated using (user_id = auth.uid());

create policy "startups: read" on public.startups for select to authenticated using (true);
create policy "startups: create own" on public.startups for insert to authenticated with check (owner_id = auth.uid());
create policy "startups: edit own" on public.startups for update to authenticated using (owner_id = auth.uid());
revoke insert, update on public.startups from anon, authenticated;
grant insert (owner_id, name, tagline, description, industry, stage, team_size, website, looking_for, hue) on public.startups to authenticated;
grant update (name, tagline, description, industry, stage, team_size, website, looking_for) on public.startups to authenticated;

create policy "upvotes: read" on public.startup_upvotes for select to authenticated using (true);
create policy "upvotes: own" on public.startup_upvotes for insert to authenticated with check (user_id = auth.uid());
create policy "upvotes: remove own" on public.startup_upvotes for delete to authenticated using (user_id = auth.uid());

create policy "opportunities: read" on public.opportunities for select to authenticated using (true);
create policy "opportunities: create own" on public.opportunities for insert to authenticated with check (poster_id = auth.uid());
create policy "opportunities: delete own" on public.opportunities for delete to authenticated using (poster_id = auth.uid());
revoke insert, update on public.opportunities from anon, authenticated;
grant insert (poster_id, title, org, type, industry, equity, comp, location, remote, description, tags) on public.opportunities to authenticated;

create policy "applications: read own or poster" on public.opportunity_applications for select to authenticated
  using (applicant_id = auth.uid() or opportunity_id in (select id from public.opportunities where poster_id = auth.uid()));
create policy "applications: create own" on public.opportunity_applications for insert to authenticated with check (applicant_id = auth.uid());

create policy "copilot: read own" on public.ai_messages for select to authenticated using (user_id = auth.uid());
create policy "copilot: clear own" on public.ai_messages for delete to authenticated using (user_id = auth.uid());

-- ============================================================================
-- FUNCTION PRIVILEGES — signed-in users only; internal helpers stay internal
-- ============================================================================
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.award_xp(uuid, text, text, int) from authenticated;
revoke execute on function public.notify(uuid, public.notif_kind, text, text, uuid, text) from authenticated;

-- ============================================================================
-- STORAGE — public avatar bucket, one folder per member
-- ============================================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
create policy "avatars: public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: replace own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- REALTIME — chat, read receipts, inbox and notification badges
-- ============================================================================
alter publication supabase_realtime add table public.messages, public.conversations, public.conversation_reads, public.notifications;
