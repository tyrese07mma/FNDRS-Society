import { useSettings } from '@/state/settings';

import type { MatchFilters } from '@/data/types';

export const DEFAULT_FILTERS: MatchFilters = { roles: [], stages: [], industries: [], minScore: 0 };

export const useMatchFilters = useSettings;

export const activeFilterCount = (f: MatchFilters) =>
  f.roles.length + f.stages.length + f.industries.length + (f.minScore > 0 ? 1 : 0);
