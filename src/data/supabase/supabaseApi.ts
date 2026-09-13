/**
 * Production backend — the Api contract implemented on Supabase.
 * Heavy lifting (feed assembly, match scoring, inbox, analytics, paywall and
 * limits) lives in Postgres RPCs defined in supabase/schema.sql; this file is
 * a thin, typed adapter plus Realtime subscriptions.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { ApiError, type Api, type ApiErrorCode, type ThreadHandlers } from '../api';
import type * as T from '../types';
import { sb } from './client';
import { streamCopilot } from './copilot';
import { useSettings } from '@/state/settings';
import { authErrorMessage } from '@/lib/auth-errors';
import type { ExportPage } from '@/lib/export-data';

const LITE = 'id, handle, full_name, avatar_url, headline, verified';
const CODES: ApiErrorCode[] = ['PRO_REQUIRED', 'SWIPE_LIMIT', 'NOT_FOUND', 'FORBIDDEN', 'AUTH', 'VALIDATION'];
const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  PRO_REQUIRED: 'This is part of FNDRS Pro.',
  SWIPE_LIMIT: 'You have used today’s free swipes.',
  NOT_FOUND: 'Not found.',
  FORBIDDEN: 'You are not allowed to do that.',
  AUTH: 'You are signed out.',
  VALIDATION: 'Please check your input.',
};

interface DbError {
  message: string;
  code?: string;
}

/** Maps Postgres / PostgREST errors (incl. our `RAISE 'CODE: message'`) to ApiError. */
function toError(e: DbError): Error {
  const msg = e.message ?? 'Something went wrong';
  const code = CODES.find((c) => msg.startsWith(c));
  if (code) return new ApiError(code, DEFAULT_MESSAGES[code]);
  switch (e.code) {
    case '23505':
      return new ApiError('VALIDATION', 'That already exists.');
    case '42501':
      return new ApiError('FORBIDDEN', DEFAULT_MESSAGES.FORBIDDEN);
    case 'PGRST116':
      return new ApiError('NOT_FOUND', DEFAULT_MESSAGES.NOT_FOUND);
    case 'P0001':
    case '23514':
      return new ApiError('VALIDATION', DEFAULT_MESSAGES.VALIDATION);
    default:
      return new Error('The request could not be completed. Please try again.');
  }
}

async function run<R>(query: PromiseLike<{ data: unknown; error: DbError | null }>): Promise<R> {
  const { data, error } = await query;
  if (error) throw toError(error);
  return data as R;
}

const rpc = <R>(fn: string, args?: Record<string, unknown>) => run<R>(sb().rpc(fn, args));

async function first<R>(fn: string, args: Record<string, unknown>, notFound: string): Promise<R> {
  const rows = await rpc<R[]>(fn, args);
  if (!rows?.length) throw new ApiError('NOT_FOUND', notFound);
  return rows[0];
}

// ---------------------------------------------------------------- session cache
let uidCache: string | null = null;

async function uid(): Promise<string> {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ApiError('AUTH', DEFAULT_MESSAGES.AUTH);
  return id;
}

function toSession(s: { user: { id: string; email?: string | null } } | null): T.Session | null {
  return s ? { userId: s.user.id, email: s.user.email ?? '' } : null;
}

/** Redirect target for Stripe — works in Expo Go (exp://) and store builds (fndrs://). */
const appUrl = (path: string) => Linking.createURL(path);

async function invoke<R>(fn: string, body: Record<string, unknown>): Promise<R> {
  const { data, error } = await sb().functions.invoke(fn, { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      const json = ctx ? await ctx.json() : null;
      if (json?.error) message = String(json.error);
    } catch {
      // keep the generic message
    }
    throw toError({ message });
  }
  return data as R;
}

// ---------------------------------------------------------------- realtime
const threadChannels = new Map<string, RealtimeChannel>();
const lastTypingSent = new Map<string, number>();

function toMentor(row: {
  id: string;
  headline: string;
  rate_cents: number;
  tags: string[];
  slots: string[];
  rating: number | string;
  sessions: number;
  profile: T.ProfileLite;
}): T.Mentor {
  return { ...row, rating: Number(row.rating) };
}

const MENTOR_SELECT = `id, headline, rate_cents, tags, slots, rating, sessions, profile:profiles!mentors_profile_fk(${LITE})`;

export const supabaseApi: Api = {
  mode: 'live',

  // auth
  async getSession() {
    const { data } = await sb().auth.getSession();
    return toSession(data.session);
  },
  onAuthChange(cb) {
    const { data } = sb().auth.onAuthStateChange((_event, session) => {
      uidCache = session?.user.id ?? null;
      cb(toSession(session));
    });
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new ApiError('AUTH', authErrorMessage(error.code));
  },
  async signUp({ email, password, fullName }) {
    const { data, error } = await sb().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: appUrl('/auth-callback') },
    });
    if (error) throw new ApiError('AUTH', authErrorMessage(error.code));
    return { needsConfirmation: !data.session };
  },
  async signOut() {
    const { error } = await sb().auth.signOut();
    if (error) throw new ApiError('AUTH', 'Could not sign out. Please retry.');
  },
  async resetPassword(email) {
    const { error } = await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('/auth-callback?next=reset-password') });
    if (error) throw new ApiError('VALIDATION', authErrorMessage(error.code));
  },
  async updatePassword(password) {
    if (password.length < 12) throw new ApiError('VALIDATION', 'Use at least 12 characters.');
    const { error } = await sb().auth.updateUser({ password });
    if (error) throw new ApiError('AUTH', 'Could not change your password. Please sign in again and retry.');
  },
  async updateEmail(email) {
    const { error } = await sb().auth.updateUser({ email: email.trim() }, { emailRedirectTo: appUrl('/auth-callback') });
    if (error) throw new ApiError('AUTH', 'Could not change your email. Please sign in again and retry.');
  },
  async deleteAccount(password) {
    const expectedUserId = await uid();
    await invoke('delete-account', { password, expectedUserId });
    useSettings.getState().forgetAccount(expectedUserId);
    const { data } = await sb().auth.getSession();
    if (data.session?.user.id === expectedUserId) await sb().auth.signOut({ scope: 'local' }).catch(() => {});
  },

  // me
  async getMe() {
    await uid();
    return rpc<T.Profile>('get_my_profile');
  },
  async updateMe(patch) {
    const me = await uid();
    try {
      await run<T.Profile>(sb().from('profiles').update(patch).eq('id', me).select('*').single());
      return rpc<T.Profile>('get_my_profile');
    } catch (e) {
      if (e instanceof ApiError && e.message === 'That already exists.') throw new ApiError('VALIDATION', 'That handle is already taken.');
      throw e;
    }
  },
  async uploadAvatar(localUri) {
    const me = await uid();
    const res = await fetch(localUri);
    const bytes = await res.arrayBuffer();
    const guess = (localUri.split('?')[0].split('.').pop() ?? '').toLowerCase();
    const ext = guess === 'png' || guess === 'webp' ? guess : 'jpg';
    const path = `${me}/${Date.now()}.${ext}`;
    const { error } = await sb()
      .storage.from('avatars')
      .upload(path, bytes, { contentType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`, upsert: true });
    if (error) throw toError(error);
    return sb().storage.from('avatars').getPublicUrl(path).data.publicUrl;
  },
  async getSubscription() {
    const me = await uid();
    const row = await run<T.Subscription | null>(
      sb().from('subscriptions').select('tier, status, current_period_end').eq('user_id', me).maybeSingle(),
    );
    return row ?? { tier: 'free', status: 'active', current_period_end: null };
  },

  // people
  exportDataPage: (dataset, after) => rpc<ExportPage>('export_my_data_page', { p_dataset: dataset, p_after: after ?? null }),
  setBlocked: (userId, blocked) => rpc<void>('set_user_block', { p_target: userId, p_blocked: blocked }),
  listBlocked: (after) => rpc<T.ProfileLite[]>('list_blocked_users', { p_after: after ?? null }),
  getProfile: (id) => rpc<T.PublicProfile>('get_profile', { p_id: id }),
  async setFollow(userId, follow) {
    const me = await uid();
    if (follow) {
      await run(sb().from('follows').upsert({ follower_id: me, followee_id: userId }, { onConflict: 'follower_id,followee_id', ignoreDuplicates: true }));
    } else {
      await run(sb().from('follows').delete().eq('follower_id', me).eq('followee_id', userId));
    }
  },
  async listFollowers(userId) {
    const rows = await run<{ profile: T.ProfileLite }[]>(
      sb().from('follows').select(`profile:profiles!follows_follower_fk(${LITE})`).eq('followee_id', userId).order('created_at', { ascending: false }).limit(200),
    );
    return rows.map((r) => r.profile).filter(Boolean);
  },
  async listFollowing(userId) {
    const rows = await run<{ profile: T.ProfileLite }[]>(
      sb().from('follows').select(`profile:profiles!follows_followee_fk(${LITE})`).eq('follower_id', userId).order('created_at', { ascending: false }).limit(200),
    );
    return rows.map((r) => r.profile).filter(Boolean);
  },
  async search(query) {
    const me = await uid();
    const q = query.replace(/[%,()*\\]/g, ' ').trim();
    if (q.length < 2) return { people: [], startups: [], communities: [], events: [] };
    const [people, startups, communities, events] = await Promise.all([
      run<T.ProfileLite[]>(
        sb().from('profiles').select(LITE).eq('onboarded', true).neq('id', me)
          .or(`full_name.ilike.%${q}%,handle.ilike.%${q}%,headline.ilike.%${q}%,location.ilike.%${q}%`).limit(20),
      ),
      rpc<T.Startup[]>('get_startups', { p_sort: 'trending', p_query: q }),
      rpc<T.Community[]>('get_communities', { p_query: q }),
      rpc<T.EventItem[]>('get_events', { p_query: q }),
    ]);
    return { people, startups: startups.slice(0, 10), communities: communities.slice(0, 10), events: events.slice(0, 10) };
  },

  // feed
  listFeed: (scope, before) => rpc<T.Post[]>('feed_page', { p_scope: scope, p_before: before?.created_at, p_before_id: before?.id, p_limit: 30 }),
  listUserPosts: (userId) => rpc<T.Post[]>('get_posts', { p_scope: 'user', p_target: userId }),
  listCommunityPosts: (communityId) => rpc<T.Post[]>('get_posts', { p_scope: 'community', p_target: communityId }),
  getPost: (id) => first<T.Post>('get_posts', { p_scope: 'post', p_target: id }, 'This post was deleted.'),
  async createPost(input) {
    const me = await uid();
    const poll =
      input.kind === 'poll'
        ? {
            options: (input.poll_options ?? [])
              .map((label) => label.trim())
              .filter(Boolean)
              .map((label, i) => ({ id: `o${i + 1}`, label: label.slice(0, 60) })),
          }
        : null;
    const row = await run<{ id: string }>(
      sb().from('posts').insert({
        author_id: me, kind: input.kind, body: input.body.trim(), tags: input.tags.slice(0, 5), poll,
        community_id: input.community_id ?? null,
      }).select('id').single(),
    );
    return first<T.Post>('get_posts', { p_scope: 'post', p_target: row.id }, 'Post not found.');
  },
  async deletePost(id) {
    await run(sb().from('posts').delete().eq('id', id));
  },
  async setLike(postId, liked) {
    const me = await uid();
    if (liked) await run(sb().from('post_likes').upsert({ post_id: postId, user_id: me }, { onConflict: 'post_id,user_id', ignoreDuplicates: true }));
    else await run(sb().from('post_likes').delete().eq('post_id', postId).eq('user_id', me));
  },
  async setSaved(postId, saved) {
    const me = await uid();
    if (saved) await run(sb().from('post_saves').upsert({ post_id: postId, user_id: me }, { onConflict: 'post_id,user_id', ignoreDuplicates: true }));
    else await run(sb().from('post_saves').delete().eq('post_id', postId).eq('user_id', me));
  },
  votePoll: (postId, optionId) => rpc<T.Post>('vote_poll', { p_post: postId, p_option: optionId }),
  listComments: (postId) =>
    run<T.Comment[]>(
      sb().from('comments').select(`id, post_id, body, created_at, author:profiles!comments_author_fk(${LITE})`)
        .eq('post_id', postId).order('created_at', { ascending: true }).limit(300),
    ),
  async addComment(postId, body) {
    const me = await uid();
    return run<T.Comment>(
      sb().from('comments').insert({ post_id: postId, author_id: me, body: body.trim() })
        .select(`id, post_id, body, created_at, author:profiles!comments_author_fk(${LITE})`).single(),
    );
  },
  async report(kind, id, reason) {
    const me = await uid();
    await run(sb().from('reports').insert({ reporter_id: me, kind, target_id: id, reason }));
  },
  async listSaved() {
    const [posts, guides] = await Promise.all([
      rpc<T.Post[]>('get_posts', { p_scope: 'saved' }),
      rpc<T.Guide[]>('get_guides', { p_saved: true }),
    ]);
    return { posts, guides };
  },

  // smart match
  listCandidates: (f) =>
    rpc<T.MatchCandidate[]>('match_candidates', {
      p_roles: f.roles, p_stages: f.stages, p_industries: f.industries, p_min_score: f.minScore, p_limit: 30,
    }),
  async swipe(targetId, action) {
    const res = await rpc<{ matched: boolean; conversation_id: string | null }>('swipe', { p_target: targetId, p_action: action });
    return { matched: res.matched, conversationId: res.conversation_id };
  },
  swipesLeft: () => rpc<number | null>('swipes_left'),
  resetPasses: () => rpc<void>('reset_passes'),
  listMatches: () => rpc<T.MatchItem[]>('list_matches'),

  // messaging
  listConversations: () => rpc<T.Conversation[]>('list_conversations'),
  getConversation: (id) => first<T.Conversation>('list_conversations', { p_id: id }, 'Conversation not found.'),
  async listMessages(conversationId, before) {
    const rows = await rpc<T.Message[]>('message_page', { p_conversation: conversationId, p_before: before?.created_at, p_before_id: before?.id, p_limit: 50 });
    return rows.reverse();
  },
  async sendMessage(conversationId, body) {
    const me = await uid();
    return run<T.Message>(
      sb().from('messages').insert({ conversation_id: conversationId, sender_id: me, body: body.trim() })
        .select('id, conversation_id, sender_id, body, created_at').single(),
    );
  },
  markRead: (conversationId) => rpc<void>('mark_read', { p_conversation: conversationId }),
  openConversation: (userId) => rpc<string>('open_conversation', { p_other: userId }),
  subscribeThread(conversationId, handlers: ThreadHandlers) {
    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = sb()
      .channel(`thread:${conversationId}`, { config: { private: true } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) =>
        handlers.onMessage(payload.new as T.Message),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const r = payload.new as { user_id?: string; last_read_at?: string } | null;
        if (r?.user_id && r.user_id !== uidCache && r.last_read_at) handlers.onRead?.(r.last_read_at);
      })
      .on('broadcast', { event: 'typing' }, () => {
        handlers.onTyping?.(true);
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => handlers.onTyping?.(false), 3500);
      })
      .subscribe();
    threadChannels.set(conversationId, channel);
    return () => {
      if (typingTimer) clearTimeout(typingTimer);
      threadChannels.delete(conversationId);
      sb().removeChannel(channel);
    };
  },
  sendTyping(conversationId) {
    const channel = threadChannels.get(conversationId);
    const now = Date.now();
    if (!channel || now - (lastTypingSent.get(conversationId) ?? 0) < 2000) return;
    lastTypingSent.set(conversationId, now);
    void channel.send({ type: 'broadcast', event: 'typing', payload: { at: now } });
  },
  subscribeInbox(onChange) {
    const channel = sb()
      .channel(`inbox:${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => onChange())
      .subscribe();
    return () => {
      sb().removeChannel(channel);
    };
  },

  // communities
  listCommunities: () => rpc<T.Community[]>('get_communities'),
  getCommunity: (id) => first<T.CommunityDetail>('get_communities', { p_id: id }, 'Space not found.'),
  async setJoined(communityId, joined) {
    const me = await uid();
    if (joined) await run(sb().from('community_members').insert({ community_id: communityId, user_id: me }));
    else await run(sb().from('community_members').delete().eq('community_id', communityId).eq('user_id', me));
  },

  // events
  listEvents: () => rpc<T.EventItem[]>('get_events'),
  getEvent: (id) => first<T.EventItem>('get_events', { p_id: id }, 'Event not found.'),
  async setRsvp(eventId, going) {
    const me = await uid();
    if (going) await run(sb().from('event_rsvps').insert({ event_id: eventId, user_id: me }));
    else await run(sb().from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', me));
  },
  async createEvent(input) {
    const me = await uid();
    const row = await run<{ id: string }>(
      sb().from('events').insert({
        title: input.title.trim(), kind: input.kind, description: input.description.trim(), starts_at: input.starts_at,
        location: input.is_online ? null : input.location, is_online: input.is_online, host_id: me,
        hue: Math.floor(Math.random() * 360),
      }).select('id').single(),
    );
    return first<T.EventItem>('get_events', { p_id: row.id }, 'Event not found.');
  },

  // investors & mentors
  listInvestors: () => rpc<T.Investor[]>('get_investors'),
  requestIntro: (investorId, note) => rpc<void>('request_intro', { p_investor: investorId, p_note: note }),
  async listMentors() {
    const rows = await run<Parameters<typeof toMentor>[0][]>(sb().from('mentors').select(MENTOR_SELECT).order('rating', { ascending: false }));
    return rows.map(toMentor);
  },
  async listBookings() {
    const me = await uid();
    const rows = await run<{ id: string; slot: string; status: 'confirmed' | 'canceled'; created_at: string; mentor: Parameters<typeof toMentor>[0] }[]>(
      sb().from('mentor_bookings').select(`id, slot, status, created_at, mentor:mentors(${MENTOR_SELECT})`)
        .eq('user_id', me).eq('status', 'confirmed').order('created_at', { ascending: false }),
    );
    return rows.map((b) => ({ ...b, mentor: toMentor(b.mentor) }));
  },
  async bookMentor(mentorId, slot, note) {
    const me = await uid();
    try {
      const b = await run<{ id: string; slot: string; status: 'confirmed' | 'canceled'; created_at: string; mentor: Parameters<typeof toMentor>[0] }>(
        sb().from('mentor_bookings').insert({ mentor_id: mentorId, user_id: me, slot, note })
          .select(`id, slot, status, created_at, mentor:mentors(${MENTOR_SELECT})`).single(),
      );
      return { ...b, mentor: toMentor(b.mentor) };
    } catch (e) {
      if (e instanceof ApiError && e.message === 'That already exists.') throw new ApiError('VALIDATION', 'That slot was just taken — pick another one.');
      throw e;
    }
  },
  async cancelBooking(id) {
    await run(sb().from('mentor_bookings').update({ status: 'canceled' }).eq('id', id));
  },

  // knowledge
  listGuides: () => rpc<T.Guide[]>('get_guides'),
  getGuide: (id) => first<T.Guide>('get_guides', { p_id: id }, 'Guide not found.'),
  async setGuideSaved(id, saved) {
    const me = await uid();
    if (saved) await run(sb().from('guide_saves').upsert({ guide_id: id, user_id: me }, { onConflict: 'guide_id,user_id', ignoreDuplicates: true }));
    else await run(sb().from('guide_saves').delete().eq('guide_id', id).eq('user_id', me));
  },

  // challenges
  listChallenges: () => rpc<T.Challenge[]>('get_challenges'),
  advanceChallenge: (challengeId) => rpc<T.Challenge>('advance_challenge', { p_id: challengeId }),
  leaderboard: () => rpc<T.Leader[]>('leaderboard'),

  // startups
  listStartups: (sort) => rpc<T.Startup[]>('get_startups', { p_sort: sort }),
  getStartup: (id) => first<T.Startup>('get_startups', { p_sort: 'new', p_id: id }, 'Startup not found.'),
  async createStartup(input) {
    const me = await uid();
    const row = await run<{ id: string }>(
      sb().from('startups').insert({
        owner_id: me, name: input.name.trim(), tagline: input.tagline.trim(), description: input.description.trim(),
        industry: input.industry, stage: input.stage, team_size: Math.max(1, input.team_size),
        website: input.website?.trim() || null, looking_for: input.looking_for, hue: Math.floor(Math.random() * 360),
      }).select('id').single(),
    );
    return first<T.Startup>('get_startups', { p_sort: 'new', p_id: row.id }, 'Startup not found.');
  },
  async setUpvote(startupId, up) {
    const me = await uid();
    if (up) await run(sb().from('startup_upvotes').upsert({ startup_id: startupId, user_id: me }, { onConflict: 'startup_id,user_id', ignoreDuplicates: true }));
    else await run(sb().from('startup_upvotes').delete().eq('startup_id', startupId).eq('user_id', me));
  },

  // opportunities
  listOpportunities: (type) => rpc<T.Opportunity[]>('get_opportunities', { p_type: type }),
  async applyOpportunity(id, note) {
    const me = await uid();
    try {
      await run(sb().from('opportunity_applications').insert({ opportunity_id: id, applicant_id: me, note }));
    } catch (e) {
      if (e instanceof ApiError && e.message === 'That already exists.') throw new ApiError('VALIDATION', 'You already applied.');
      throw e;
    }
  },
  async createOpportunity(input) {
    const me = await uid();
    const row = await run<{ id: string }>(
      sb().from('opportunities').insert({ ...input, poster_id: me, title: input.title.trim(), org: input.org.trim() }).select('id').single(),
    );
    return first<T.Opportunity>('get_opportunities', { p_type: 'all', p_id: row.id }, 'Opportunity not found.');
  },

  // notifications
  async listNotifications() {
    const me = await uid();
    return run<T.AppNotification[]>(
      sb().from('notifications').select(`id, kind, title, body, link, read, created_at, actor:profiles!notifications_actor_fk(${LITE})`)
        .eq('user_id', me).order('created_at', { ascending: false }).limit(100),
    );
  },
  async markNotificationsRead() {
    const me = await uid();
    await run(sb().from('notifications').update({ read: true }).eq('user_id', me).eq('read', false));
  },
  subscribeNotifications(onNew) {
    const channel = sb()
      .channel(`notifications:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', ...(uidCache ? { filter: `user_id=eq.${uidCache}` } : {}) },
        () => onNew(),
      )
      .subscribe();
    return () => {
      sb().removeChannel(channel);
    };
  },

  // analytics
  getAnalytics: (range) => rpc<T.Analytics>('get_analytics', { p_range: range }),

  // copilot
  async listCopilot() {
    const me = await uid();
    return run<T.CopilotMessage[]>(
      sb().from('ai_messages').select('id, role, content, created_at').eq('user_id', me).order('created_at', { ascending: true }).limit(200),
    );
  },
  askCopilot: streamCopilot,
  async resetCopilot() {
    const me = await uid();
    await run(sb().from('ai_messages').delete().eq('user_id', me));
  },

  // billing
  async startCheckout(tier, cycle) {
    const res = await invoke<{ url: string }>('stripe-checkout', { tier, cycle, return_url: appUrl('/premium') });
    return { url: res.url, activated: false };
  },
  async manageSubscription() {
    const res = await invoke<{ url: string }>('stripe-portal', { return_url: appUrl('/settings') });
    return { url: res.url, canceled: false };
  },
};
