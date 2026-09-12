import type { OpportunityType, StartupStage, UserRole } from '@/data/types';

import { currentLocale, translateNow } from '@/i18n';


const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const relative = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto', style: 'narrow' });
  if (Math.abs(diff) < MINUTE) return relative.format(0, 'second');
  if (Math.abs(diff) < HOUR) return relative.format(-Math.floor(diff / MINUTE), 'minute');
  if (Math.abs(diff) < DAY) return relative.format(-Math.floor(diff / HOUR), 'hour');
  const days = Math.floor(diff / DAY);
  if (Math.abs(days) < 7) return relative.format(-days, 'day');
  if (Math.abs(days) < 35) return relative.format(-Math.floor(days / 7), 'week');
  return new Date(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' });
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
  if (days === 0 || days === 1) return new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' }).format(-days, 'day');
  if (days < 7) return d.toLocaleDateString(currentLocale(), { weekday: 'long' });
  return d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
}

export function eventDate(iso: string) {
  const d = new Date(iso);
  return {
    mo: d.toLocaleDateString(currentLocale(), { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    weekday: d.toLocaleDateString(currentLocale(), { weekday: 'short' }),
    time: clockTime(iso),
  };
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${clockTime(iso)}`;
}

export function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

/** "2d 4h left", "5h left", "Ends soon", "Ended". */
export function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return translateNow('Ended');
  const d = Math.floor(diff / DAY);
  const h = Math.floor((diff % DAY) / HOUR);
  if (d > 0) return translateNow('{{days}}d {{hours}}h left', { days: d, hours: h });
  if (h > 0) return translateNow('{{hours}}h left', { hours: h });
  return translateNow('Ends soon');
}

export function compact(n: number): string {
  return new Intl.NumberFormat(currentLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function money(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency, minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
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
