import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultAccountPreferences,switchAccountPreferences} from '../src/lib/account-preferences.ts';

test('account switching isolates filters and retains unsynced changes for the original account',()=>{
 const a={...defaultAccountPreferences(),ownerId:'A',savedAccounts:{},recentSearches:['private search'],dirty:true,theme:'dark',filters:{roles:['investor'],stages:[],industries:['Health'],minScore:75}};
 const out=switchAccountPreferences(a,null);
 assert.deepEqual(out.recentSearches,[]);
 assert.deepEqual(out.filters,defaultAccountPreferences().filters);
 const b=switchAccountPreferences(out,'B');
 assert.equal(b.dirty,false);assert.equal(b.theme,'system');
 const restored=switchAccountPreferences(b,'A');
 assert.equal(restored.dirty,true);assert.equal(restored.theme,'dark');
 assert.deepEqual(restored.filters,a.filters);
 assert.deepEqual(restored.recentSearches,[]);
});
test('refreshing the same session preserves the current settings object',()=>{
 const state={...defaultAccountPreferences(),ownerId:'A',savedAccounts:{},recentSearches:[]};
 assert.equal(switchAccountPreferences(state,'A'),state);
});
