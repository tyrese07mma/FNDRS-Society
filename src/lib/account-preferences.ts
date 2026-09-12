import type { MatchFilters } from '../data/types';

export interface AccountPreferences {
 theme: 'system' | 'dark' | 'light';
 haptics: boolean;
 notifications: { matches: boolean; messages: boolean; events: boolean; digest: boolean };
 filters: MatchFilters;
 dirty: boolean;
}
export interface PreferenceState extends AccountPreferences {
 ownerId: string | null;
 savedAccounts: Record<string, AccountPreferences>;
 recentSearches: string[];
}
export const defaultAccountPreferences = (): AccountPreferences => ({
 theme:'system', haptics:true, notifications:{matches:true,messages:true,events:true,digest:false},
 filters:{roles:[],stages:[],industries:[],minScore:0}, dirty:false,
});
export function switchAccountPreferences(state: PreferenceState, ownerId: string | null): PreferenceState {
 if(state.ownerId===ownerId)return state;
 const savedAccounts={...state.savedAccounts};
 if(state.ownerId) savedAccounts[state.ownerId]={theme:state.theme,haptics:state.haptics,notifications:state.notifications,filters:state.filters,dirty:state.dirty};
 return {...state,ownerId,savedAccounts,...(ownerId&&savedAccounts[ownerId]?savedAccounts[ownerId]:defaultAccountPreferences()),recentSearches:[]};
}
