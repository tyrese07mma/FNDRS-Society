import type {
  Analytics,
  AppNotification,
  Booking,
  Challenge,
  Comment,
  Community,
  CommunityDetail,
  Conversation,
  CopilotMessage,
  EventItem,
  FeedScope,
  Guide,
  Investor,
  Leader,
  MatchCandidate,
  MatchFilters,
  MatchItem,
  Mentor,
  Message,
  NewEvent,
  NewOpportunity,
  NewPost,
  NewStartup,
  Opportunity,
  OpportunityType,
  Post,
  Profile,
  ProfileLite,
  ProfilePatch,
  PublicProfile,
  SavedItems,
  SearchResults,
  Session,
  Startup,
  StartupSort,
  SubTier,
  Subscription,
  SwipeAction,
  SwipeResult,
} from './types';
import type { ExportDataset, ExportPage } from '@/lib/export-data';

/** Error codes the UI reacts to (paywall, limits). Thrown as `new ApiError(code)`. */
export type ApiErrorCode = 'PRO_REQUIRED' | 'SWIPE_LIMIT' | 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'AUTH';

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'ApiError';
  }
}

export function isApiError(e: unknown, code?: ApiErrorCode): e is ApiError {
  return e instanceof ApiError && (!code || e.code === code);
}

export interface ThreadHandlers {
  onMessage: (m: Message) => void;
  onTyping?: (typing: boolean) => void;
  onRead?: (at: string) => void;
}

/**
 * The single contract every screen talks to. Production implementation uses Supabase.
 */
export interface Api {
  readonly mode: 'live';

  // auth
  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: { email: string; password: string; fullName: string }): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  updateEmail(email: string): Promise<void>;
  deleteAccount(password: string): Promise<void>;
  exportDataPage(dataset: ExportDataset, after?: string): Promise<ExportPage>;

  // me
  getMe(): Promise<Profile>;
  updateMe(patch: ProfilePatch): Promise<Profile>;
  uploadAvatar(localUri: string): Promise<string>;
  getSubscription(): Promise<Subscription>;

  // people
  getProfile(id: string): Promise<PublicProfile>;
  setFollow(userId: string, follow: boolean): Promise<void>;
  setBlocked(userId: string, blocked: boolean): Promise<void>;
  listBlocked(after?: string): Promise<ProfileLite[]>;
  listFollowers(userId: string): Promise<ProfileLite[]>;
  listFollowing(userId: string): Promise<ProfileLite[]>;
  search(query: string): Promise<SearchResults>;

  // feed
  listFeed(scope: FeedScope, before?: { created_at: string; id: string; feed_rank?: number }): Promise<Post[]>;
  listUserPosts(userId: string): Promise<Post[]>;
  listCommunityPosts(communityId: string): Promise<Post[]>;
  getPost(id: string): Promise<Post>;
  createPost(input: NewPost): Promise<Post>;
  deletePost(id: string): Promise<void>;
  setLike(postId: string, liked: boolean): Promise<void>;
  setSaved(postId: string, saved: boolean): Promise<void>;
  votePoll(postId: string, optionId: string): Promise<Post>;
  listComments(postId: string): Promise<Comment[]>;
  addComment(postId: string, body: string): Promise<Comment>;
  report(kind: 'post' | 'user' | 'comment', id: string, reason: string): Promise<void>;
  listSaved(): Promise<SavedItems>;

  // smart match
  listCandidates(filters: MatchFilters): Promise<MatchCandidate[]>;
  swipe(targetId: string, action: SwipeAction): Promise<SwipeResult>;
  swipesLeft(): Promise<number | null>;
  /** Bring back everyone you passed on. */
  resetPasses(): Promise<void>;
  listMatches(): Promise<MatchItem[]>;

  // messaging
  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation>;
  listMessages(conversationId: string, before?: { created_at: string; id: string }): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<Message>;
  markRead(conversationId: string): Promise<void>;
  openConversation(userId: string): Promise<string>;
  subscribeThread(conversationId: string, handlers: ThreadHandlers): () => void;
  sendTyping(conversationId: string): void;
  subscribeInbox(onChange: () => void): () => void;

  // communities
  listCommunities(): Promise<Community[]>;
  getCommunity(id: string): Promise<CommunityDetail>;
  setJoined(communityId: string, joined: boolean): Promise<void>;

  // events
  listEvents(): Promise<EventItem[]>;
  getEvent(id: string): Promise<EventItem>;
  setRsvp(eventId: string, going: boolean): Promise<void>;
  createEvent(input: NewEvent): Promise<EventItem>;

  // investors & mentors
  listInvestors(): Promise<Investor[]>;
  requestIntro(investorId: string, note: string): Promise<void>;
  listMentors(): Promise<Mentor[]>;
  listBookings(): Promise<Booking[]>;
  bookMentor(mentorId: string, slot: string, note: string): Promise<Booking>;
  cancelBooking(id: string): Promise<void>;

  // knowledge
  listGuides(): Promise<Guide[]>;
  getGuide(id: string): Promise<Guide>;
  setGuideSaved(id: string, saved: boolean): Promise<void>;

  // challenges
  listChallenges(): Promise<Challenge[]>;
  advanceChallenge(challengeId: string): Promise<Challenge>;
  leaderboard(): Promise<Leader[]>;

  // startups
  listStartups(sort: StartupSort): Promise<Startup[]>;
  getStartup(id: string): Promise<Startup>;
  createStartup(input: NewStartup): Promise<Startup>;
  setUpvote(startupId: string, up: boolean): Promise<void>;

  // opportunities
  listOpportunities(type: OpportunityType | 'all'): Promise<Opportunity[]>;
  applyOpportunity(id: string, note: string): Promise<void>;
  createOpportunity(input: NewOpportunity): Promise<Opportunity>;

  // notifications
  listNotifications(): Promise<AppNotification[]>;
  markNotificationsRead(): Promise<void>;
  subscribeNotifications(onNew: () => void): () => void;

  // analytics
  getAnalytics(range: 7 | 30): Promise<Analytics>;

  // copilot
  listCopilot(): Promise<CopilotMessage[]>;
  askCopilot(prompt: string, onDelta?: (text: string) => void): Promise<CopilotMessage>;
  resetCopilot(): Promise<void>;

  // billing
  startCheckout(tier: Exclude<SubTier, 'free'>, cycle: 'month' | 'year'): Promise<{ url: string }>;
  manageSubscription(): Promise<{ url: string }>;


}
