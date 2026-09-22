import React from 'react';
import { View } from 'react-native';
import { useSettings } from '@/state/settings';
import { SegmentedControl } from './SegmentedControl';

export function LanguagePicker() {
 const language = useSettings(s => s.language);
 const setLanguage = useSettings(s => s.setLanguage);
 return <View style={{padding:14}}><SegmentedControl value={language} onChange={setLanguage} options={[{value:'de',label:'Deutsch'},{value:'en',label:'English'}]} /></View>;
}
