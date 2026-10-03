import type { Profile } from '@/data/types';

/** How complete a profile is, and what to add next. Drives the checklist on the Profile tab. */
export function profileStrength(p: Profile) {
  const items = [
    { key: 'avatar', label: 'Add a profile photo', done: !!p.avatar_url },
    { key: 'headline', label: 'Write a headline', done: p.headline.trim().length >= 3 },
    { key: 'bio', label: 'Tell your story in the bio', done: p.bio.trim().length >= 40 },
    { key: 'location', label: 'Add your city', done: !!p.location.trim() },
    { key: 'skills', label: 'Add at least three skills', done: p.skills.length >= 3 },
    { key: 'looking', label: 'Say who you are looking for', done: p.looking_for.length > 0 },
    { key: 'links', label: 'Link your website or LinkedIn', done: !!(p.links?.website || p.links?.linkedin || p.links?.x) },
  ];
  const done = items.filter((i) => i.done).length;
  return { pct: Math.round((done / items.length) * 100), missing: items.filter((i) => !i.done) };
}
