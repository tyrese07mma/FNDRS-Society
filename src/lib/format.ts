import type { OpportunityType, StartupStage, UserRole } from '@/data/types';

/** All UI copy is English, so dates are formatted consistently in en-GB. */
const LOCALE = 'en-GB';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  const days = Math.floor(diff / DAY);
  if (days < 7) return `${days}d`;
  if (days < 35) return `${Math.floor(days / 7)}w`;
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function sameDay(a: string, b: string) {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

/** "Today", "Yesterday", "Monday", or "3 Mar" — for chat day separators. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString(LOCALE, { weekday: 'long' });
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
}

export function eventDate(iso: string) {
  const d = new Date(iso);
  return {
    mo: d.toLocaleDateString(LOCALE, { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    weekday: d.toLocaleDateString(LOCALE, { weekday: 'short' }),
    time: clockTime(iso),
  };
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })} · ${clockTime(iso)}`;
}

export function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

/** "2d 4h left", "5h left", "Ends soon", "Ended". */
export function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / DAY);
  const h = Math.floor((diff % DAY) / HOUR);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h left`;
  return 'Ends soon';
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function money(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'there';
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function ensureUrl(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  founder: 'Founder',
  cofounder_seeker: 'Co-founder seeker',
  investor: 'Investor',
  operator: 'Operator',
  mentor: 'Mentor',
  agency: 'Agency / freelancer',
};

export const STAGE_LABEL: Record<StartupStage, string> = {
  idea: 'Idea',
  mvp: 'Building MVP',
  launched: 'Launched',
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  series_a_plus: 'Series A+',
};

export const OPP_TYPE_LABEL: Record<OpportunityType, string> = {
  cofounder: 'Co-founder',
  hiring: 'Hiring',
  partnership: 'Partnership',
  investment: 'Investment',
  freelance: 'Freelance',
  accelerator: 'Accelerator',
};

export const INDUSTRIES = [
  'AI / ML', 'SaaS', 'Fintech', 'E-commerce', 'Climate', 'Health', 'Marketplace',
  'Consumer', 'Deep tech', 'Crypto', 'Education', 'Mobility',
] as const;

export const LOOKING_FOR = [
  'Technical co-founder', 'Business co-founder', 'Investors', 'Engineers', 'Designers',
  'Growth / marketing', 'Mentors', 'Early customers', 'Advisors',
] as const;

export const SKILLS = [
  'Product', 'Engineering', 'ML Engineering', 'Design', 'Sales', 'Marketing', 'Growth',
  'Fundraising', 'Operations', 'Finance', 'Legal', 'Community', 'Data', 'Hardware',
] as const;

export const OPEN_TO = [
  { key: 'cofounder', label: 'Co-founding' },
  { key: 'hiring', label: 'Hiring' },
  { key: 'investing', label: 'Investing' },
  { key: 'mentoring', label: 'Mentoring' },
  { key: 'advising', label: 'Advising' },
] as const;
