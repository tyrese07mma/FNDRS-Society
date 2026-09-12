import { create } from 'zustand';

import type { MatchFilters } from '@/data/types';

export const DEFAULT_FILTERS: MatchFilters = { roles: [], stages: [], industries: [], minScore: 0 };

export const useMatchFilters = create<{
  filters: MatchFilters;
  setFilters: (f: MatchFilters) => void;
  reset: () => void;
}>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (filters) => set({ filters }),
  reset: () => set({ filters: DEFAULT_FILTERS }),
}));

export const activeFilterCount = (f: MatchFilters) =>
  f.roles.length + f.stages.length + f.industries.length + (f.minScore > 0 ? 1 : 0);
