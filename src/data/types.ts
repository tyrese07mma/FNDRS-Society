/**
 * Domain types shared by the UI and the Supabase backend.
 * Screens only ever see these shapes — never raw table rows.
 */

export type UserRole = 'founder' | 'cofounder_seeker' | 'investor' | 'operator' | 'mentor' | 'agency';
export type StartupStage = 'idea' | 'mvp' | 'launched' | 'pre_seed' | 'seed' | 'series_a_plus';
export type PostKind = 'update' | 'milestone' | 'looking_for' | 'poll' | 'question';
export type SubTier = 'free' | 'pro' | 'business' | 'investor_plus';
export type SubStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
export type SwipeAction = 'pass' | 'connect' | 'superlike';
export type DmPolicy = 'everyone' | 'matches';
export type FeedScope = 'foryou' | 'following' | 'trending';
export type StartupSort = 'trending' | 'new' | 'mine';
export type OpportunityType = 'cofounder' | 'hiring' | 'partnership' | 'investment' | 'freelance' | 'accelerator';
export type NotifKind =
  | 'match' | 'message' | 'follow' | 'like' | 'comment' | 'event' | 'achievement' | 'intro' | 'system';

export interface ProfileLinks {
  website?: string;
  linkedin?: string;
  x?: string;
}

/** Small author/actor projection used inside lists. */
export interface ProfileLite {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string | null;
  headline: string;
  verified: boolean;
}

export interface Profile extends ProfileLite {
  bio: string;
  location: string;
  role: UserRole;
  stage: StartupStage;
  skills: string[];
  industries: string[];
  looking_for: string[];
  open_to: string[];
  links: ProfileLinks;
  founder_score: number;
  level: number;
  xp: number;
  onboarded: boolean;
  location_visible: boolean;
  discoverable: boolean;
  dm_policy: DmPolicy;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
}

/** A profile as seen by someone else — with the relationship baked in. */
export interface PublicProfile extends Profile {
  is_me: boolean;
  is_following: boolean;
  follows_me: boolean;
  is_match: boolean;
  match_score: number | null;
  match_reasons: string[];
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'full_name' | 'handle' | 'avatar_url' | 'headline' | 'bio' | 'location' | 'role' | 'stage'
    | 'skills' | 'industries' | 'looking_for' | 'open_to' | 'links' | 'onboarded'
    | 'location_visible' | 'discoverable' | 'dm_policy'
  >
>;

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Post {
  id: string;
  author_id: string;
  author: ProfileLite;
  kind: PostKind;
  body: string;
  tags: string[];
  poll: { options: PollOption[]; ends_at: string | null } | null;
  like_count: number;
  comment_count: number;
  liked: boolean;
  saved: boolean;
  my_vote: string | null;
  community_id: string | null;
  created_at: string;
}

export interface NewPost {
  kind: PostKind;
  body: string;
  tags: string[];
  poll_options?: string[];
  community_id?: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  author: ProfileLite;
  body: string;
  created_at: string;
}

export interface MatchCandidate extends ProfileLite {
  location: string;
  bio: string;
  role: UserRole;
  stage: StartupStage;
  skills: string[];
  industries: string[];
  looking_for: string[];
  open_to: string[];
  score: number;
  reasons: string[];
}

export interface MatchFilters {
  roles: UserRole[];
  stages: StartupStage[];
  industries: string[];
  minScore: number;
}

export interface SwipeResult {
  matched: boolean;
  conversationId: string | null;
}

export interface MatchItem {
  profile: ProfileLite;
  conversation_id: string | null;
  matched_at: string;
  has_messages: boolean;
}

export interface Conversation {
  id: string;
  other: ProfileLite | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread: number;
  is_match: boolean;
  /** When the other member last opened the thread — drives read receipts. */
  other_last_read_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** Client-only: an optimistic message that the server hasn't confirmed yet. */
  pending?: boolean;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  tag: string;
  description: string;
  member_count: number;
  online_count: number;
  featured: boolean;
  is_private: boolean;
  hue: number;
  joined: boolean;
}

export interface CommunityDetail extends Community {
  members: ProfileLite[];
  rules: string[];
}

export interface EventItem {
  id: string;
  title: string;
  kind: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  is_online: boolean;
  going_count: number;
  capacity: number | null;
  going: boolean;
  featured: boolean;
  hue: number;
  host: ProfileLite | null;
  attendees: ProfileLite[];
}

export interface NewEvent {
  title: string;
  kind: string;
  description: string;
  starts_at: string;
  location: string | null;
  is_online: boolean;
}

export interface Investor {
  id: string;
  profile: ProfileLite;
  firm: string;
  check_size: string;
  stages: string[];
  sectors: string[];
  thesis: string;
  portfolio_count: number;
  fit: number;
  requested: boolean;
}

export interface Mentor {
  id: string;
  profile: ProfileLite;
  headline: string;
  rate_cents: number;
  tags: string[];
  slots: string[];
  rating: number;
  sessions: number;
}

export interface Booking {
  id: string;
  mentor: Mentor;
  slot: string;
  status: 'confirmed' | 'canceled';
  created_at: string;
}

export interface Guide {
  id: string;
  title: string;
  category: string;
  kind: string;
  read_minutes: number;
  featured: boolean;
  summary: string;
  body: string;
  author: ProfileLite | null;
  saved: boolean;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_xp: number;
  steps: string[];
  ends_at: string;
  active: boolean;
  my_step: number;
  participants: number;
}

export interface Leader extends ProfileLite {
  xp: number;
  level: number;
  rank: number;
  is_me: boolean;
}

export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string | null;
  actor: ProfileLite | null;
  /** In-app route to open when tapped, e.g. `/post/123`. */
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Startup {
  id: string;
  owner: ProfileLite;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  stage: StartupStage;
  team_size: number;
  website: string | null;
  raised: string | null;
  looking_for: string[];
  hue: number;
  upvotes: number;
  upvoted: boolean;
  trending: boolean;
  created_at: string;
}

export interface NewStartup {
  name: string;
  tagline: string;
  description: string;
  industry: string;
  stage: StartupStage;
  team_size: number;
  website: string | null;
  looking_for: string[];
}

export interface Opportunity {
  id: string;
  poster: ProfileLite;
  title: string;
  org: string;
  type: OpportunityType;
  industry: string;
  equity: string | null;
  comp: string | null;
  location: string;
  remote: boolean;
  description: string;
  tags: string[];
  applied: boolean;
  applicants: number;
  match: number;
  created_at: string;
}

export interface NewOpportunity {
  title: string;
  org: string;
  type: OpportunityType;
  industry: string;
  equity: string | null;
  comp: string | null;
  location: string;
  remote: boolean;
  description: string;
  tags: string[];
}

export interface Subscription {
  tier: SubTier;
  status: SubStatus;
  current_period_end: string | null;
}

export interface Analytics {
  range: 7 | 30;
  views: number[];
  totals: { views: number; unique_viewers: number; followers: number; match_rate: number };
  deltas: { views: number; unique_viewers: number; followers: number; match_rate: number };
  viewers: (ProfileLite & { viewed_at: string })[];
  top_posts: Pick<Post, 'id' | 'body' | 'like_count' | 'comment_count'>[];
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SearchResults {
  people: ProfileLite[];
  startups: Startup[];
  communities: Community[];
  events: EventItem[];
}

export interface SavedItems {
  posts: Post[];
  guides: Guide[];
}

export interface Session {
  userId: string;
  email: string;
}
