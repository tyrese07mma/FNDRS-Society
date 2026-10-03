/**
 * Founder-fit scoring shared by the demo backend. The Supabase RPC
 * `match_candidates()` (supabase/schema.sql) implements the same rules in SQL,
 * so both modes rank people identically.
 */
import { STAGE_LABEL } from '@/lib/format';
import type { StartupStage, UserRole } from './types';

interface FitProfile {
  id: string;
  role: UserRole;
  stage: StartupStage;
  location: string;
  skills: string[];
  industries: string[];
  looking_for: string[];
  open_to: string[];
  verified: boolean;
}

/** Which skills / roles satisfy each "looking for" answer. */
const NEEDS: Record<string, { skills?: string[]; roles?: UserRole[] }> = {
  'Technical co-founder': { skills: ['Engineering', 'ML Engineering', 'Hardware', 'Data'] },
  'Business co-founder': { skills: ['Sales', 'Fundraising', 'Operations', 'Marketing', 'Finance'] },
  Engineers: { skills: ['Engineering', 'ML Engineering', 'Data'] },
  Designers: { skills: ['Design', 'Product'] },
  'Growth / marketing': { skills: ['Growth', 'Marketing', 'Community'] },
  Investors: { roles: ['investor'] },
  Mentors: { roles: ['mentor'] },
  Advisors: { roles: ['mentor', 'investor'] },
  'Early customers': {},
};

function satisfies(needs: string[], p: FitProfile): boolean {
  return needs.some((n) => {
    const rule = NEEDS[n];
    if (!rule) return false;
    return (rule.skills?.some((s) => p.skills.includes(s)) ?? false) || (rule.roles?.includes(p.role) ?? false);
  });
}

const city = (loc: string) => loc.split(',')[0].trim().toLowerCase();

export function scoreFit(me: FitProfile, p: FitProfile): { score: number; reasons: string[] } {
  const shared = p.industries.filter((i) => me.industries.includes(i));
  const theyHave = satisfies(me.looking_for, p);
  const iHave = satisfies(p.looking_for, me);
  const sameStage = p.stage === me.stage;
  const sameCity = !!me.location && city(p.location) === city(me.location);
  const cofounder = p.open_to.includes('cofounder') && me.looking_for.some((l) => l.includes('co-founder'));

  const raw =
    40 +
    Math.min(shared.length, 3) * 11 +
    (theyHave ? 17 : 0) +
    (iHave ? 11 : 0) +
    (sameStage ? 6 : 0) +
    (sameCity ? 5 : 0) +
    (cofounder ? 6 : 0) +
    (p.verified ? 2 : 0);
  const score = Math.max(35, Math.min(99, raw));

  const reasons: string[] = [];
  if (shared.length) reasons.push(`Both building in ${shared.slice(0, 2).join(' & ')}`);
  if (theyHave) reasons.push(p.role === 'investor' ? 'Invests at your stage' : 'Has the skills you are looking for');
  if (iHave) reasons.push('Looking for what you bring');
  if (cofounder) reasons.push('Open to co-founding');
  if (sameStage) reasons.push(`Same stage · ${STAGE_LABEL[p.stage]}`);
  if (sameCity) reasons.push(`Also in ${p.location.split(',')[0]}`);
  if (!reasons.length) reasons.push('Active in your network');
  return { score, reasons };
}
