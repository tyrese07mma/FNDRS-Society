import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Wordmark } from '@/features/brand/Wordmark';
import { FilterSheet } from '@/features/match/FilterSheet';
import { useTranslation } from '@/i18n';
import { useSettings, type ThemeMode } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, Header, IconButton, Input, PressableScale, SegmentedControl, Sheet, Text } from '@/ui';
import { LanguagePicker } from '@/ui/LanguagePicker';
import { Bell, BookOpen, Building2, CalendarDays, Compass, House, MessageCircle, Newspaper, Settings, SlidersHorizontal, Sparkles, User, Users, type IconType } from '@/ui/icons';

const TABS = [
  { id: 'home', label: 'Home', icon: House }, { id: 'match', label: 'Match', icon: Sparkles },
  { id: 'discover', label: 'Discover', icon: Compass }, { id: 'inbox', label: 'Inbox', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
] as const;
type PreviewTab = typeof TABS[number]['id'];

/** Explicit development-only shell: shared production components, no API or invented activity. */
export default function LocalPreview() {
  const { t } = useTranslation();
  const { c, dark } = useTheme();
  const [tab, setTab] = useState<PreviewTab>('home');
  const [settings, setSettings] = useState(false);
  const [filters, setFilters] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState('');
  const theme = useSettings(s => s.theme);
  const setTheme = useSettings(s => s.setTheme);
  const tiles: { label: string; description: string; icon: IconType }[] = [
    { label: 'people', description: 'meet founders and experienced entrepreneurs.', icon: Users },
    { label: 'startups', description: 'discover what the community is building.', icon: Building2 },
    { label: 'events', description: 'meet and exchange ideas.', icon: CalendarDays },
    { label: 'knowledge', description: 'learn and develop your idea.', icon: BookOpen },
  ];
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <View style={{ backgroundColor: c.accentSoft, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.accentBorder }}>
      <Text variant="caption" align="center" color="accentText">{t('Local design preview · no live accounts or activity')}</Text>
    </View>
    <View style={{ flex: 1, width: '100%', maxWidth: 820, alignSelf: 'center' }}>
      <Header titleNode={<Wordmark size={17} society />} right={<>
        <IconButton icon={Bell} accessibilityLabel={t('Notifications')} onPress={() => setDetail(t('Notifications'))} />
        <IconButton icon={Settings} accessibilityLabel={t('Settings')} onPress={() => setSettings(true)} />
      </>} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 28 }}>
        {tab === 'home' && <>
          <View style={{ gap: 7, paddingVertical: 8 }}>
            <Text variant="label" color="textSubtle">FNDRS SOCIETY</Text>
            <Text variant="largeTitle">{t('build something together.')}</Text>
            <Text color="textMuted">{t('your network for the next step.')}</Text>
          </View>
          <Card variant="accent" style={{ gap: 14 }}>
            <Sparkles color={c.accentText} size={24} />
            <Text variant="title2">{t('Find your co-founder')}</Text>
            <Text color="textMuted">{t('explore matching and set your filters.')}</Text>
            <Button title={t('Show matches')} onPress={() => setTab('match')} />
          </Card>
          <Card style={{ gap: 12 }}><Text variant="headline">{t('Share an update, win or question…')}</Text>
            <Button title={t('Write a post')} variant="secondary" onPress={() => setCompose(true)} />
          </Card>
          <EmptyState icon={Newspaper} title={t('Nothing here yet')} message={t('real posts appear after the backend is connected.')} />
        </>}
        {tab === 'match' && <>
          <Text variant="largeTitle">{t('Smart Match')}</Text>
          <Text color="textMuted">{t('explore matching and set your filters.')}</Text>
          <Button title={t('Match filters')} variant="secondary" icon={SlidersHorizontal} onPress={() => setFilters(true)} />
          <Card><EmptyState icon={Users} title={t('no candidates loaded')} message={t('profiles and mutual matches require live accounts.')} /></Card>
        </>}
        {tab === 'discover' && <>
          <Text variant="largeTitle">{t('Discover')}</Text>
          {tiles.map(item => <Card key={item.label} onPress={() => setDetail(t(item.label))} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <item.icon color={c.accentText} size={26} /><View style={{ flex: 1, gap: 5 }}><Text variant="title3">{t(item.label)}</Text><Text color="textSubtle">{t(item.description)}</Text></View>
          </Card>)}
        </>}
        {tab === 'inbox' && <>
          <Text variant="largeTitle">{t('Inbox')}</Text>
          <Card><EmptyState icon={MessageCircle} title={t('no conversations loaded')} message={t('messages will come from real members, never simulated chat partners.')} /></Card>
        </>}
        {tab === 'profile' && <>
          <Text variant="largeTitle">{t('Profile')}</Text>
          <Card style={{ gap: 14 }}><Badge tone="accent">{t('Local design preview')}</Badge>
            <Text variant="title2">{t('a place for your ambitions.')}</Text>
            <Text color="textMuted">{t('your profile will bring together your skills, idea and the people you want to meet.')}</Text>
            <Button title={t('Settings')} variant="secondary" onPress={() => setSettings(true)} />
          </Card>
        </>}
      </ScrollView>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: c.hairline, backgroundColor: c.bg }}>
        {TABS.map(item => <PressableScale key={item.id} onPress={() => setTab(item.id)} accessibilityRole="tab" accessibilityLabel={t(item.label)} accessibilityState={{ selected: tab === item.id }} style={{ flex: 1, gap: 5, alignItems: 'center', paddingVertical: 6 }}>
          <item.icon size={22} color={tab === item.id ? c.accentText : c.textSubtle} /><Text variant="caption" color={tab === item.id ? 'accentText' : 'textSubtle'}>{t(item.label)}</Text>
        </PressableScale>)}
      </View>
    </View>
    <Sheet open={settings} onClose={() => setSettings(false)} title={t('Settings')}>
      <View style={{ gap: 18 }}><Text variant="headline">{t('Theme')}</Text>
        <SegmentedControl<ThemeMode> value={theme} onChange={setTheme} options={[{value:'system',label:t('System')},{value:'dark',label:t('Dark')},{value:'light',label:t('Light')}]} />
        <Text variant="headline">{t('Language')}</Text><LanguagePicker />
      </View>
    </Sheet>
    <FilterSheet open={filters} onClose={() => setFilters(false)} />
    <Sheet open={detail !== null} onClose={() => setDetail(null)} title={detail ?? ''}>
      <EmptyState icon={Compass} title={t('Local design preview')} message={t('this area will load real content after setup.')} />
    </Sheet>
    <Sheet open={compose} onClose={() => setCompose(false)} title={t('Write a post')}>
      <View style={{ gap: 16 }}><Input multiline value={draft} onChangeText={setDraft} maxLength={2000} counter placeholder={t('Share an update, win or question…')} />
        <Text color="textSubtle">{t('this draft stays on this screen and is not published.')}</Text>
        <Button title={t('Close')} variant="secondary" onPress={() => setCompose(false)} />
      </View>
    </Sheet>
  </View>;
}
