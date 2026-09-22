import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Platform, SectionList, TextInput, View } from 'react-native';

import { useFollowing, useMatches, useOpenConversation } from '@/data/queries';
import type { ProfileLite } from '@/data/types';
import { PersonRow } from '@/features/people/PersonRow';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { EmptyState, Header, SkeletonList, Text } from '@/ui';
import { MessageCircle, Search } from '@/ui/icons';

export default function NewMessage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const { userId } = useAuth();
  const matches = useMatches();
  const following = useFollowing(userId ?? '');
  const open = useOpenConversation();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filter = (p: ProfileLite) => !q || p.full_name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q);
  const matchPeople = (matches.data ?? []).map((m) => m.profile).filter(filter);
  const matchIds = new Set(matchPeople.map((p) => p.id));
  const followPeople = (following.data ?? []).filter((p) => !matchIds.has(p.id)).filter(filter);
  const sections = [
    { title: t("MATCHES"), data: matchPeople },
    { title: t("PEOPLE YOU FOLLOW"), data: followPeople },
  ].filter((s) => s.data.length);

  const start = async (p: ProfileLite) => {
    try {
      const id = await open.mutateAsync(p.id);
      router.replace(`/chat/${id}` as Href);
    } catch {
      // toast via mutation cache
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header modal title={t("New message")} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.input, borderWidth: 1, borderColor: c.border }}>
          <Search size={17} color={c.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder={t("Search matches and people you follow")}
            placeholderTextColor={c.textFaint}
            accessibilityLabel={t("Search people")}
            style={[{ flex: 1, color: c.text, fontFamily: font.sans, fontSize: 15 }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null]}
          />
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(p) => p.id}
        renderSectionHeader={({ section }) => (
          <Text variant="label" color="textSubtle" style={{ paddingTop: 16, paddingBottom: 4, backgroundColor: c.bg }}>{section.title}</Text>
        )}
        renderItem={({ item }) => <PersonRow person={item} onPress={() => start(item)} />}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          matches.isLoading || following.isLoading ? (
            <SkeletonList count={6} />
          ) : (
            <EmptyState icon={MessageCircle} title={q ? t("Nobody found") : t("No one to message yet")} message={t("Match with founders or follow people to message them here. You can also message anyone from their profile.")} />
          )
        }
      />
    </View>
  );
}
