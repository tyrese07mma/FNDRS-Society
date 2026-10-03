export const EXPORT_DATASETS = [
  'account',
  'profiles', 'private_profile_data', 'user_settings', 'match_preferences', 'subscriptions',
  'posts', 'comments', 'messages', 'ai_messages', 'ai_usage', 'notifications', 'xp_ledger',
  'mentor_bookings', 'startups', 'events', 'opportunities', 'reports', 'intro_requests',
  'post_likes', 'post_saves', 'poll_votes', 'guide_saves', 'startup_upvotes', 'community_members',
  'event_rsvps', 'challenge_progress', 'conversation_reads', 'opportunity_applications',
  'blocks', 'match_swipes', 'follows', 'matches', 'conversations',
] as const;
export type ExportDataset = typeof EXPORT_DATASETS[number];
export interface ExportPage { rows: Record<string, unknown>[]; next: string | null }

/** Bounded in-memory collection. Fail explicitly instead of silently truncating a download. */
export async function collectExport(
  read: (dataset: ExportDataset, after?: string) => Promise<ExportPage>,
  assertCurrent: () => Promise<void>,
  progress: (completed: number, total: number) => void,
): Promise<string> {
  const records: Partial<Record<ExportDataset, Record<string, unknown>[]>> = {};
  let size = 0;
  for (const [index, dataset] of EXPORT_DATASETS.entries()) {
    const rows: Record<string, unknown>[] = [];
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      await assertCurrent();
      const page = await read(dataset, cursor);
      await assertCurrent();
      size += JSON.stringify(page.rows).length;
      if (size > 10_000_000) throw new Error('Your export is too large for this device. Please contact support for a complete export.');
      rows.push(...page.rows);
      cursor = page.next ?? undefined;
      if (cursor && seen.has(cursor)) throw new Error('Export pagination did not advance');
      if (cursor) seen.add(cursor);
    } while (cursor);
    records[dataset] = rows;
    progress(index + 1, EXPORT_DATASETS.length);
  }
  await assertCurrent();
  return JSON.stringify({ format: 'fndrs-account-export', version: 1, generated_at: new Date().toISOString(), records }, null, 2);
}
