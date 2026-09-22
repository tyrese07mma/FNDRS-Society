/**
 * TanStack Query hooks — the only way screens read or change data.
 * Mutations are optimistic where it matters (likes, follows, RSVPs, joins…)
 * and roll back automatically if the backend rejects them.
 */
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useAccountMutation as useMutation } from './useAccountMutation';
import { useEffect, useRef, useState } from 'react';

import { haptic } from '@/lib/haptics';
import { translateNow } from '@/i18n';
import { describeError } from '@/lib/errors';
import { toast } from '@/state/toast';
import { api } from './index';
import { sb } from './supabase/client';
import { confirm } from '@/state/dialog';
import type * as T from './types';

// ---------------------------------------------------------------- keys
export const qk = {
  me: ['me'] as const,
  subscription: ['subscription'] as const,
  profile: (id: string) => ['profile', id] as const,
  followers: (id: string) => ['followers', id] as const,
  following: (id: string) => ['following', id] as const,
  search: (q: string) => ['search', q] as const,
  feed: (scope: T.FeedScope) => ['feed', scope] as const,
  userPosts: (id: string) => ['posts', 'user', id] as const,
  communityPosts: (id: string) => ['posts', 'community', id] as const,
  post: (id: string) => ['post', id] as const,
  comments: (id: string) => ['comments', id] as const,
  saved: ['saved'] as const,
  candidates: (f: T.MatchFilters) => ['candidates', f] as const,
  swipesLeft: ['swipesLeft'] as const,
  matches: ['matches'] as const,
  conversations: ['conversations'] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (id: string) => ['messages', id] as const,
  communities: ['communities'] as const,
  community: (id: string) => ['community', id] as const,
  events: ['events'] as const,
  event: (id: string) => ['event', id] as const,
  investors: ['investors'] as const,
  mentors: ['mentors'] as const,
  bookings: ['bookings'] as const,
  guides: ['guides'] as const,
  guide: (id: string) => ['guide', id] as const,
  challenges: ['challenges'] as const,
  leaderboard: ['leaderboard'] as const,
  startups: (sort: T.StartupSort) => ['startups', sort] as const,
  startup: (id: string) => ['startup', id] as const,
  opportunities: (type: T.OpportunityType | 'all') => ['opportunities', type] as const,
  notifications: ['notifications'] as const,
  analytics: (range: 7 | 30) => ['analytics', range] as const,
  copilot: ['copilot'] as const,
};

const iso = () => new Date().toISOString();
type Snapshot = [QueryKey, unknown][];
const restore = (qc: QueryClient, snap?: Snapshot) => snap?.forEach(([k, d]) => qc.setQueryData(k, d));
const byRoot = (...roots: string[]) => (q: { queryKey: readonly unknown[] }) => roots.includes(String(q.queryKey[0]));

// ---------------------------------------------------------------- post cache helpers
const POST_ROOTS = ['feed', 'posts', 'post', 'saved'];

function patchPost(qc: QueryClient, id: string, fn: (p: T.Post) => T.Post) {
  qc.setQueriesData<T.Post[]>({ predicate: byRoot('feed', 'posts') }, (old) => old?.map((p) => (p.id === id ? fn(p) : p)));
  qc.setQueryData<T.Post>(qk.post(id), (old) => (old ? fn(old) : old));
  qc.setQueryData<T.SavedItems>(qk.saved, (old) => (old ? { ...old, posts: old.posts.map((p) => (p.id === id ? fn(p) : p)) } : old));
}

async function snapshotPosts(qc: QueryClient): Promise<Snapshot> {
  await qc.cancelQueries({ predicate: byRoot(...POST_ROOTS) });
  return qc.getQueriesData({ predicate: byRoot(...POST_ROOTS) });
}

// ---------------------------------------------------------------- me & people
export const useSubscription = (enabled = true) =>
  useQuery({ queryKey: qk.subscription, queryFn: () => api.getSubscription(), enabled });

export const useProfile = (id: string) =>
  useQuery({ queryKey: qk.profile(id), queryFn: () => api.getProfile(id), enabled: !!id });

export const useBlocked = (after?: string) => useQuery({ queryKey: ['blocked', after ?? null], queryFn: () => api.listBlocked(after) });

export function useSetBlocked() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, blocked }: { userId: string; blocked: boolean }) => api.setBlocked(userId, blocked),
    onSuccess: async () => {
      await qc.cancelQueries();
      await qc.resetQueries();
    },
  });
}

export const useFollowers = (id: string) => useQuery({ queryKey: qk.followers(id), queryFn: () => api.listFollowers(id) });
export const useFollowing = (id: string) => useQuery({ queryKey: qk.following(id), queryFn: () => api.listFollowing(id) });

export const useSearch = (q: string) =>
  useQuery({
    queryKey: qk.search(q),
    queryFn: () => api.search(q),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: T.ProfilePatch) => api.updateMe(patch),
    onSuccess: (profile) => {
      qc.setQueryData(qk.me, profile);
      qc.invalidateQueries({ queryKey: qk.profile(profile.id) });
      qc.invalidateQueries({ queryKey: qk.candidates({ roles: [], stages: [], industries: [], minScore: 0 }).slice(0, 1) });
    },
  });
}

export function useUploadAvatar() {
  const update = useUpdateMe();
  return useMutation({
    mutationFn: async (uri: string) => {
      const url = await api.uploadAvatar(uri);
      return update.mutateAsync({ avatar_url: url });
    },
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, follow }: { userId: string; follow: boolean }) => api.setFollow(userId, follow),
    onMutate: async ({ userId, follow }) => {
      await qc.cancelQueries({ queryKey: qk.profile(userId) });
      const prev = qc.getQueryData<T.PublicProfile>(qk.profile(userId));
      if (prev) {
        qc.setQueryData<T.PublicProfile>(qk.profile(userId), {
          ...prev,
          is_following: follow,
          followers_count: Math.max(0, prev.followers_count + (follow ? 1 : -1)),
        });
      }
      haptic.selection();
      return { prev };
    },
    onError: (_e, { userId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.profile(userId), ctx.prev);
    },
    onSettled: (_d, _e, { userId }) => {
      qc.invalidateQueries({ queryKey: qk.me });
      qc.invalidateQueries({ queryKey: qk.followers(userId) });
      qc.invalidateQueries({ queryKey: ['following'] });
      qc.invalidateQueries({ queryKey: qk.feed('following') });
    },
  });
}

// ---------------------------------------------------------------- feed
export function useFeed(scope: T.FeedScope) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.feed(scope), queryFn: () => api.listFeed(scope) });
  const busy = useRef(false);
  const [isFetchingNextPage, setFetching] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const last = query.data?.at(-1);
  const hasNextPage = (query.data?.length ?? 0) >= 30 && endCursor !== scope + ':' + last?.id;
  const fetchNextPage = async () => {
    if (busy.current || !hasNextPage || !last || query.isFetching) return;
    busy.current = true; setFetching(true);
    try {
      const page = await api.listFeed(scope, last);
      if (page.length < 30) setEndCursor(scope + ':' + (page.at(-1)?.id ?? last.id));
      qc.setQueryData<T.Post[]>(qk.feed(scope), current => {
        if (!current?.some(p => p.id === last.id)) return current;
        const ids = new Set(current.map(p => p.id)); return [...current, ...page.filter(p => !ids.has(p.id))];
      });
    } catch { toast.error('Could not load more posts', 'Please try again.'); }
    finally { busy.current = false; setFetching(false); }
  };
  return {...query, hasNextPage, isFetchingNextPage, fetchNextPage};
}
export const useUserPosts = (id: string) => useQuery({ queryKey: qk.userPosts(id), queryFn: () => api.listUserPosts(id), enabled: !!id });
export const useCommunityPosts = (id: string) =>
  useQuery({ queryKey: qk.communityPosts(id), queryFn: () => api.listCommunityPosts(id), enabled: !!id });
export const usePost = (id: string) => useQuery({ queryKey: qk.post(id), queryFn: () => api.getPost(id), enabled: !!id });
export const useComments = (id: string) => useQuery({ queryKey: qk.comments(id), queryFn: () => api.listComments(id), enabled: !!id });
export const useSaved = () => useQuery({ queryKey: qk.saved, queryFn: () => api.listSaved() });

export function useLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => api.setLike(id, liked),
    onMutate: async ({ id, liked }) => {
      const snap = await snapshotPosts(qc);
      patchPost(qc, id, (p) => ({ ...p, liked, like_count: Math.max(0, p.like_count + (liked ? 1 : -1)) }));
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
  });
}

export function useSavePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => api.setSaved(id, saved),
    onMutate: async ({ id, saved }) => {
      const snap = await snapshotPosts(qc);
      patchPost(qc, id, (p) => ({ ...p, saved }));
      return { snap };
    },
    onSuccess: (_d, { saved }) => {
      if (saved) toast.show('Saved', 'Find it again under Profile → Saved.');
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.saved }),
  });
}

export function useVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, optionId }: { id: string; optionId: string }) => api.votePoll(id, optionId),
    onMutate: async ({ id, optionId }) => {
      const snap = await snapshotPosts(qc);
      patchPost(qc, id, (p) =>
        p.poll
          ? {
              ...p,
              my_vote: optionId,
              poll: {
                ...p.poll,
                options: p.poll.options.map((o) => ({
                  ...o,
                  votes: o.votes + (o.id === optionId ? 1 : 0) - (o.id === p.my_vote ? 1 : 0),
                })),
              },
            }
          : p,
      );
      haptic.selection();
      return { snap };
    },
    onSuccess: (post) => patchPost(qc, post.id, () => post),
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: T.NewPost) => api.createPost(input),
    onSuccess: (post) => {
      haptic.success();
      toast.success('Posted', '+10 XP · your network will see it in their feed.');
      qc.setQueryData<T.Post[]>(qk.feed('foryou'), (old) => (old ? [post, ...old] : old));
      qc.invalidateQueries({ predicate: byRoot('feed', 'posts') });
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePost(id),
    onMutate: async (id) => {
      const snap = await snapshotPosts(qc);
      qc.setQueriesData<T.Post[]>({ predicate: byRoot('feed', 'posts') }, (old) => old?.filter((p) => p.id !== id));
      return { snap };
    },
    onSuccess: () => toast.show('Post deleted'),
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.me }),
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.addComment(postId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.comments(postId) });
      const me = qc.getQueryData<T.Profile>(qk.me);
      const temp: T.Comment = {
        id: `tmp_${Date.now()}`,
        post_id: postId,
        body,
        created_at: iso(),
        author: me
          ? { id: me.id, handle: me.handle, full_name: me.full_name, avatar_url: me.avatar_url, headline: me.headline, verified: me.verified }
          : { id: 'me', handle: 'me', full_name: 'You', avatar_url: null, headline: '', verified: false },
      };
      const prev = qc.getQueryData<T.Comment[]>(qk.comments(postId));
      qc.setQueryData<T.Comment[]>(qk.comments(postId), (old) => [...(old ?? []), temp]);
      patchPost(qc, postId, (p) => ({ ...p, comment_count: p.comment_count + 1 }));
      return { prev, tempId: temp.id };
    },
    onSuccess: (comment, _b, ctx) => {
      qc.setQueryData<T.Comment[]>(qk.comments(postId), (old) => old?.map((c) => (c.id === ctx?.tempId ? comment : c)));
    },
    onError: (_e, _b, ctx) => {
      qc.setQueryData(qk.comments(postId), ctx?.prev);
      patchPost(qc, postId, (p) => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }));
    },
  });
}

export function useReport() {
  return useMutation({
    mutationFn: ({ kind, id, reason }: { kind: 'post' | 'user' | 'comment'; id: string; reason: string }) => api.report(kind, id, reason),
    onSuccess: () => toast.success(translateNow('Thanks for letting us know'), translateNow('Your report was submitted for review.')),
  });
}

// ---------------------------------------------------------------- smart match
export const useCandidates = (filters: T.MatchFilters) =>
  useQuery({ queryKey: qk.candidates(filters), queryFn: () => api.listCandidates(filters), staleTime: 5 * 60_000 });
export const useSwipesLeft = () => useQuery({ queryKey: qk.swipesLeft, queryFn: () => api.swipesLeft() });
export const useMatches = () => useQuery({ queryKey: qk.matches, queryFn: () => api.listMatches() });

export function useSwipe() {
  const qc = useQueryClient();
  return useMutation({
    meta: { silent: true },
    mutationFn: ({ id, action }: { id: string; action: T.SwipeAction }) => api.swipe(id, action),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: qk.swipesLeft });
      if (res.matched) {
        qc.invalidateQueries({ queryKey: qk.matches });
        qc.invalidateQueries({ queryKey: qk.conversations });
        qc.invalidateQueries({ queryKey: qk.me });
      }
    },
  });
}

export function useResetPasses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.resetPasses(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }),
  });
}

// ---------------------------------------------------------------- messaging
export const useConversations = () => useQuery({ queryKey: qk.conversations, queryFn: () => api.listConversations() });
export const useConversation = (id: string) =>
  useQuery({ queryKey: qk.conversation(id), queryFn: () => api.getConversation(id), enabled: !!id });

export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.openConversation(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations }),
  });
}

function mergeIncoming(cur: T.Message[], m: T.Message, myId: string | null): T.Message[] {
  if (cur.some((x) => x.id === m.id)) return cur;
  if (m.sender_id === myId) {
    const i = cur.findIndex((x) => x.pending && x.body === m.body);
    if (i >= 0) {
      const next = cur.slice();
      next[i] = m;
      return next;
    }
  }
  return [...cur, m];
}

/**
 * A live thread: initial history from the backend, realtime inserts, typing
 * and read receipts, plus optimistic sending with automatic de-duplication.
 */
export function useThread(conversationId: string, myId: string | null) {
  const qc = useQueryClient();
  const key = qk.messages(conversationId);
  const query = useQuery({ queryKey: key, queryFn: () => api.listMessages(conversationId), enabled: !!conversationId });
  const [typing, setTyping] = useState(false);
  const olderBusy = useRef(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [oldestReached, setOldestReached] = useState<string | null>(null);
  const oldest = query.data?.[0];
  const hasOlder = (query.data?.length ?? 0) >= 50 && oldestReached !== conversationId + ':' + oldest?.id;
  const loadOlder = async () => {
    if (olderBusy.current || !oldest || !hasOlder || query.isFetching) return;
    olderBusy.current = true; setLoadingOlder(true);
    try {
      const page = await api.listMessages(conversationId, oldest);
      if (page.length < 50) setOldestReached(conversationId + ':' + (page[0]?.id ?? oldest.id));
      qc.setQueryData<T.Message[]>(key, current => {
        if (!current?.some(m => m.id === oldest.id)) return current;
        const ids = new Set(current.map(m => m.id)); return [...page.filter(m => !ids.has(m.id)), ...current];
      });
    } catch { toast.error('Could not load older messages', 'Please try again.'); }
    finally { olderBusy.current = false; setLoadingOlder(false); }
  };
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    return api.subscribeThread(conversationId, {
      onMessage: (m) => {
        qc.setQueryData<T.Message[]>(key, (cur) => mergeIncoming(cur ?? [], m, myId));
        if (m.sender_id !== myId) {
          setTyping(false);
          api.markRead(conversationId).catch(() => {});
        }
      },
      onTyping: setTyping,
      onRead: setOtherReadAt,
    });
    // `key` is derived from conversationId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myId, qc]);

  const send = async (body: string) => {
    const text = body.trim();
    if (!text || !myId) return;
    const tempId = `tmp_${Date.now()}`;
    const temp: T.Message = { id: tempId, conversation_id: conversationId, sender_id: myId, body: text, created_at: iso(), pending: true };
    qc.setQueryData<T.Message[]>(key, (cur) => [...(cur ?? []), temp]);
    haptic.light();
    try {
      const real = await api.sendMessage(conversationId, text);
      qc.setQueryData<T.Message[]>(key, (cur = []) => {
        const withoutTemp = cur.filter((x) => x.id !== tempId);
        return withoutTemp.some((x) => x.id === real.id) ? withoutTemp : [...withoutTemp, real];
      });
      qc.invalidateQueries({ queryKey: qk.conversations });
    } catch (e) {
      qc.setQueryData<T.Message[]>(key, (cur = []) => cur.filter((x) => x.id !== tempId));
      toast.error(translateNow('Message not sent'), describeError(e));
    }
  };

  return {
    messages: query.data ?? [],
    hasOlder, loadOlder, loadingOlder,
    loading: query.isLoading,
    error: query.error,
    typing,
    otherReadAt,
    send,
  };
}

// ---------------------------------------------------------------- communities
export const useCommunities = () => useQuery({ queryKey: qk.communities, queryFn: () => api.listCommunities() });
export const useCommunity = (id: string) => useQuery({ queryKey: qk.community(id), queryFn: () => api.getCommunity(id), enabled: !!id });

export function useJoinCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, joined }: { id: string; joined: boolean }) => api.setJoined(id, joined),
    onMutate: async ({ id, joined }) => {
      await qc.cancelQueries({ predicate: byRoot('communities', 'community') });
      const snap = qc.getQueriesData({ predicate: byRoot('communities', 'community') });
      const apply = <X extends T.Community>(c: X): X =>
        c.id === id ? { ...c, joined, member_count: Math.max(0, c.member_count + (joined ? 1 : -1)) } : c;
      qc.setQueryData<T.Community[]>(qk.communities, (old) => old?.map(apply));
      qc.setQueryData<T.CommunityDetail>(qk.community(id), (old) => (old ? apply(old) : old));
      haptic.selection();
      return { snap };
    },
    onSuccess: (_d, { joined }) => {
      if (joined) toast.success('You joined the space', '+5 XP');
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: qk.community(id) });
    },
  });
}

// ---------------------------------------------------------------- events
export const useEvents = () => useQuery({ queryKey: qk.events, queryFn: () => api.listEvents() });
export const useEvent = (id: string) => useQuery({ queryKey: qk.event(id), queryFn: () => api.getEvent(id), enabled: !!id });

export function useRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, going }: { id: string; going: boolean }) => api.setRsvp(id, going),
    onMutate: async ({ id, going }) => {
      await qc.cancelQueries({ predicate: byRoot('events', 'event') });
      const snap = qc.getQueriesData({ predicate: byRoot('events', 'event') });
      const apply = (e: T.EventItem): T.EventItem =>
        e.id === id ? { ...e, going, going_count: Math.max(0, e.going_count + (going ? 1 : -1)) } : e;
      qc.setQueryData<T.EventItem[]>(qk.events, (old) => old?.map(apply));
      qc.setQueryData<T.EventItem>(qk.event(id), (old) => (old ? apply(old) : old));
      if (going) haptic.success();
      return { snap };
    },
    onSuccess: (_d, { going }) => {
      if (going) toast.success('You are going 🎟️', 'We will remind you the day before.');
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: T.NewEvent) => api.createEvent(input),
    onSuccess: () => {
      toast.success('Event published', '+20 XP · members can RSVP now.');
      qc.invalidateQueries({ queryKey: qk.events });
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

// ---------------------------------------------------------------- investors & mentors
export const useInvestors = () => useQuery({ queryKey: qk.investors, queryFn: () => api.listInvestors() });

export function useRequestIntro() {
  const qc = useQueryClient();
  return useMutation({
    meta: { silent: true },
    mutationFn: ({ id, note }: { id: string; note: string }) => api.requestIntro(id, note),
    onSuccess: (_d, { id }) => {
      haptic.success();
      qc.setQueryData<T.Investor[]>(qk.investors, (old) => old?.map((i) => (i.id === id ? { ...i, requested: true } : i)));
      qc.invalidateQueries({ queryKey: qk.notifications });
    },
  });
}

export const useMentors = () => useQuery({ queryKey: qk.mentors, queryFn: () => api.listMentors() });
export const useBookings = () => useQuery({ queryKey: qk.bookings, queryFn: () => api.listBookings() });

export function useBookMentor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, slot, note }: { id: string; slot: string; note: string }) => api.bookMentor(id, slot, note),
    onSuccess: (b) => {
      haptic.success();
      toast.success('Session booked', `${b.mentor.profile.full_name} · ${b.slot}`);
      qc.invalidateQueries({ queryKey: qk.bookings });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelBooking(id),
    onSuccess: () => {
      toast.show('Session cancelled');
      qc.invalidateQueries({ queryKey: qk.bookings });
    },
  });
}

// ---------------------------------------------------------------- knowledge
export const useGuides = () => useQuery({ queryKey: qk.guides, queryFn: () => api.listGuides() });
export const useGuide = (id: string) => useQuery({ queryKey: qk.guide(id), queryFn: () => api.getGuide(id), enabled: !!id });

export function useSaveGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => api.setGuideSaved(id, saved),
    onMutate: async ({ id, saved }) => {
      const prevList = qc.getQueryData<T.Guide[]>(qk.guides);
      const prevOne = qc.getQueryData<T.Guide>(qk.guide(id));
      qc.setQueryData<T.Guide[]>(qk.guides, (old) => old?.map((g) => (g.id === id ? { ...g, saved } : g)));
      qc.setQueryData<T.Guide>(qk.guide(id), (old) => (old ? { ...old, saved } : old));
      haptic.selection();
      return { prevList, prevOne };
    },
    onError: (_e, { id }, ctx) => {
      qc.setQueryData(qk.guides, ctx?.prevList);
      qc.setQueryData(qk.guide(id), ctx?.prevOne);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.saved }),
  });
}

// ---------------------------------------------------------------- challenges
export const useChallenges = () => useQuery({ queryKey: qk.challenges, queryFn: () => api.listChallenges() });
export const useLeaderboard = () => useQuery({ queryKey: qk.leaderboard, queryFn: () => api.leaderboard() });

export function useAdvanceChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.advanceChallenge(id),
    onSuccess: (ch) => {
      qc.setQueryData<T.Challenge[]>(qk.challenges, (old) => old?.map((c) => (c.id === ch.id ? ch : c)));
      const done = ch.my_step >= ch.steps.length;
      if (done) {
        haptic.success();
        toast.accent('Challenge complete 🏆', `+${ch.reward_xp} XP`);
      } else {
        toast.success('Step completed', '+25 XP');
      }
      qc.invalidateQueries({ queryKey: qk.me });
      qc.invalidateQueries({ queryKey: qk.leaderboard });
    },
  });
}

// ---------------------------------------------------------------- startups
export const useStartups = (sort: T.StartupSort) => useQuery({ queryKey: qk.startups(sort), queryFn: () => api.listStartups(sort) });
export const useStartup = (id: string) => useQuery({ queryKey: qk.startup(id), queryFn: () => api.getStartup(id), enabled: !!id });

export function useUpvote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, up }: { id: string; up: boolean }) => api.setUpvote(id, up),
    onMutate: async ({ id, up }) => {
      await qc.cancelQueries({ predicate: byRoot('startups', 'startup', 'search') });
      const snap = qc.getQueriesData({ predicate: byRoot('startups', 'startup') });
      const apply = (s: T.Startup): T.Startup => (s.id === id ? { ...s, upvoted: up, upvotes: Math.max(0, s.upvotes + (up ? 1 : -1)) } : s);
      qc.setQueriesData<T.Startup[]>({ predicate: byRoot('startups') }, (old) => old?.map(apply));
      qc.setQueryData<T.Startup>(qk.startup(id), (old) => (old ? apply(old) : old));
      haptic.selection();
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
  });
}

export function useCreateStartup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: T.NewStartup) => api.createStartup(input),
    onSuccess: (s) => {
      haptic.success();
      toast.accent(`${s.name} is live 🚀`, '+50 XP · showcased to investors and operators.');
      qc.invalidateQueries({ queryKey: ['startups'] });
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

// ---------------------------------------------------------------- opportunities
export const useOpportunities = (type: T.OpportunityType | 'all') =>
  useQuery({ queryKey: qk.opportunities(type), queryFn: () => api.listOpportunities(type) });

export function useApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api.applyOpportunity(id, note),
    onSuccess: (_d, { id }) => {
      haptic.success();
      toast.success('Application sent', 'The poster will reach out via Messages.');
      qc.setQueriesData<T.Opportunity[]>({ predicate: byRoot('opportunities') }, (old) =>
        old?.map((o) => (o.id === id ? { ...o, applied: true, applicants: o.applicants + 1 } : o)),
      );
      qc.invalidateQueries({ queryKey: qk.notifications });
    },
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: T.NewOpportunity) => api.createOpportunity(input),
    onSuccess: () => {
      toast.success('Opportunity posted', 'Matching members will see it first.');
      qc.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

// ---------------------------------------------------------------- notifications
export const useNotifications = (enabled = true) =>
  useQuery({ queryKey: qk.notifications, queryFn: () => api.listNotifications(), enabled });

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markNotificationsRead(),
    onMutate: () => {
      qc.setQueryData<T.AppNotification[]>(qk.notifications, (old) => old?.map((n) => ({ ...n, read: true })));
    },
  });
}

// ---------------------------------------------------------------- analytics & copilot
export const useAnalytics = (range: 7 | 30) => useQuery({ queryKey: qk.analytics(range), queryFn: () => api.getAnalytics(range) });

export const useCopilot = () => useQuery({ queryKey: qk.copilot, queryFn: () => api.listCopilot() });

export function useAskCopilot() {
  const qc = useQueryClient();
  const [streaming, setStreaming] = useState('');
  const mutation = useMutation({
    mutationFn: async (prompt: string) => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      const { data: settings, error } = await sb().from('user_settings').select('ai_consent_at').eq('user_id',user.id).maybeSingle();
      if (error) throw new Error('Could not load your privacy settings.');
      if (!settings?.ai_consent_at) {
        const allowed = await confirm({ title: 'Use FNDRS Copilot?', message: 'Your request, profile, startup and recent Copilot conversation will be sent to Anthropic to generate an answer. Private chats are not included.', confirmLabel: 'Allow and continue' });
        if (!allowed) throw new Error('Request canceled.');
        const { error: consentError } = await sb().from('user_settings').upsert({user_id:user.id,ai_consent_at:new Date().toISOString()});
        if (consentError) throw new Error('Could not save your privacy settings.');
      }
      setStreaming('');
      return api.askCopilot(prompt, delta => setStreaming(text => text + delta));
    },
    onMutate: (prompt: string) => {
      const temp: T.CopilotMessage = { id: 'tmp_' + Date.now(), role: 'user', content: prompt, created_at: iso() };
      qc.setQueryData<T.CopilotMessage[]>(qk.copilot, old => [...(old ?? []), temp]);
    },
    onSettled: () => { setStreaming(''); qc.invalidateQueries({queryKey:qk.copilot}); },
  });
  return {...mutation, streaming};
}

export function useResetCopilot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.resetCopilot(),
    onSuccess: () => qc.setQueryData(qk.copilot, []),
  });
}

// ---------------------------------------------------------------- billing
export function useCheckout() {
  return useMutation({
    mutationFn: ({ tier, cycle }: { tier: Exclude<T.SubTier, 'free'>; cycle: 'month' | 'year' }) => api.startCheckout(tier, cycle),
  });
}

export function useManageSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.manageSubscription(),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.subscription }),
  });
}

// ---------------------------------------------------------------- realtime glue
/** Keeps inbox + notification badges live while the app is open. */
export function useRealtimeSync(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const offInbox = api.subscribeInbox(() => {
      qc.invalidateQueries({ queryKey: qk.conversations });
      qc.invalidateQueries({ queryKey: qk.matches });
    });
    const offNotifs = api.subscribeNotifications(() => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ predicate: byRoot('feed', 'posts', 'post', 'comments') });
    });
    return () => {
      offInbox();
      offNotifs();
    };
  }, [enabled, qc]);
}

export function useUnreadCounts(enabled = true) {
  const conversations = useQuery({ queryKey: qk.conversations, queryFn: () => api.listConversations(), enabled });
  const notifications = useNotifications(enabled);
  return {
    messages: (conversations.data ?? []).reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0),
    notifications: (notifications.data ?? []).filter((n) => !n.read).length,
  };
}
