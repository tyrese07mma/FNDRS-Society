import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCommunities, useCreatePost } from '@/data/queries';
import type { PostKind } from '@/data/types';
import { KAV_BEHAVIOR } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { confirm } from '@/state/dialog';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Avatar, Button, Chip, Header, IconButton, ListGroup, ListRow, Sheet, Text } from '@/ui';
import { ChevronDown, CircleHelp, Globe, Hash, Megaphone, PenLine, Plus, Trophy, UsersRound, Vote, X, type IconType } from '@/ui/icons';

const KINDS: { value: PostKind; label: string; icon: IconType; placeholder: string }[] = [
  { value: 'update', label: 'Update', icon: PenLine, placeholder: 'What are you working on this week?' },
  { value: 'milestone', label: 'Milestone', icon: Trophy, placeholder: 'Share a win — a launch, a first customer, a raise…' },
  { value: 'looking_for', label: 'Looking for', icon: Megaphone, placeholder: 'Who are you looking for? Role, skills, equity, location…' },
  { value: 'question', label: 'Question', icon: CircleHelp, placeholder: 'Ask the community something specific…' },
  { value: 'poll', label: 'Poll', icon: Vote, placeholder: 'What do you want to ask?' },
];
const TAG_IDEAS = ['Fundraising', 'Hiring', 'Launch', 'Co-founder', 'AI / ML', 'SaaS', 'Growth', 'Product'];
const MAX = 1000;

export default function Compose() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ kind?: PostKind; community?: string }>();
  const create = useCreatePost();
  const communities = useCommunities();
  const joined = (communities.data ?? []).filter((x) => x.joined);

  const [kind, setKind] = useState<PostKind>(KINDS.some((k) => k.value === params.kind) ? (params.kind as PostKind) : 'update');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [communityId, setCommunityId] = useState<string | null>(params.community ?? null);
  const [audienceOpen, setAudienceOpen] = useState(false);

  const community = joined.find((x) => x.id === communityId) ?? null;
  const pollOk = kind !== 'poll' || options.filter((o) => o.trim()).length >= 2;
  const canPost = body.trim().length > 0 && body.length <= MAX && pollOk;
  const spec = KINDS.find((k) => k.value === kind)!;

  const addTag = (raw: string) => {
    const t = raw.replace(/^#/, '').trim();
    if (!t || tags.includes(t) || tags.length >= 5) return;
    setTags((x) => [...x, t.slice(0, 24)]);
    setTagDraft('');
  };

  const close = async () => {
    if (body.trim() && !(await confirm({ title: 'Discard this post?', confirmLabel: 'Discard', destructive: true }))) return;
    router.back();
  };

  const submit = async () => {
    if (!canPost) return;
    try {
      await create.mutateAsync({
        kind,
        body: body.trim(),
        tags,
        poll_options: kind === 'poll' ? options.map((o) => o.trim()).filter(Boolean) : undefined,
        community_id: communityId,
      });
      router.back();
    } catch {
      // the mutation cache shows the error toast
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <Header
        modal
        back={close}
        title="New post"
        right={<Button title="Post" size="sm" disabled={!canPost} loading={create.isPending} onPress={submit} />}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 30, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {KINDS.map((k) => (
            <Chip key={k.value} label={k.label} icon={k.icon} selected={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="headline">{profile?.full_name}</Text>
            <Pressable onPress={() => setAudienceOpen(true)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }} accessibilityRole="button" accessibilityLabel="Choose audience">
              {community ? <UsersRound size={12} color={c.textMuted} /> : <Globe size={12} color={c.textMuted} />}
              <Text variant="caption" color="textMuted">{community ? community.name : 'Everyone on FNDRS'}</Text>
              <ChevronDown size={12} color={c.textMuted} />
            </Pressable>
          </View>
        </View>

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={spec.placeholder}
          placeholderTextColor={c.textFaint}
          multiline
          autoFocus
          maxLength={MAX + 50}
          selectionColor={c.accent}
          accessibilityLabel="Post text"
          style={[
            { minHeight: 150, color: c.text, fontFamily: font.sans, fontSize: 17, lineHeight: 25, textAlignVertical: 'top' },
            Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null,
          ]}
        />
        <Text variant="mono" color={body.length > MAX ? 'danger' : 'textFaint'} align="right">
          {body.length}/{MAX}
        </Text>

        {kind === 'poll' && (
          <View style={{ gap: 10 }}>
            <Text variant="label" color="textSubtle">OPTIONS</Text>
            {options.map((o, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={o}
                  onChangeText={(v) => setOptions((opts) => opts.map((x, k) => (k === i ? v : x)))}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={c.textFaint}
                  maxLength={60}
                  accessibilityLabel={`Poll option ${i + 1}`}
                  style={[
                    { flex: 1, height: 46, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.input, color: c.text, fontFamily: font.sans, fontSize: 15 },
                    Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null,
                  ]}
                />
                {options.length > 2 && (
                  <IconButton icon={X} variant="plain" size={34} onPress={() => setOptions((opts) => opts.filter((_, k) => k !== i))} accessibilityLabel={`Remove option ${i + 1}`} />
                )}
              </View>
            ))}
            {options.length < 4 && (
              <Button title="Add option" icon={Plus} variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => setOptions((o) => [...o, ''])} />
            )}
            <Text variant="caption" color="textSubtle">Polls stay open for three days.</Text>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Text variant="label" color="textSubtle">TAGS · {tags.length}/5</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {tags.map((t) => (
              <Chip key={t} label={`#${t}  ✕`} size="sm" selected onPress={() => setTags((x) => x.filter((y) => y !== t))} />
            ))}
            {tags.length < 5 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: c.hairlineStrong, minWidth: 130 }}>
                <Hash size={13} color={c.textSubtle} />
                <TextInput
                  value={tagDraft}
                  onChangeText={setTagDraft}
                  onSubmitEditing={() => addTag(tagDraft)}
                  placeholder="Add tag"
                  placeholderTextColor={c.textFaint}
                  returnKeyType="done"
                  submitBehavior="submit"
                  accessibilityLabel="Add a tag"
                  style={[{ flex: 1, color: c.text, fontFamily: font.sans, fontSize: 13.5 }, Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null]}
                />
              </View>
            )}
          </View>
          {tags.length < 5 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {TAG_IDEAS.filter((t) => !tags.includes(t)).slice(0, 6).map((t) => (
                <Chip key={t} label={`+ ${t}`} size="sm" onPress={() => addTag(t)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Sheet open={audienceOpen} onClose={() => setAudienceOpen(false)} title="Who can see this?">
        <ListGroup>
          <ListRow
            icon={Globe}
            title="Everyone on FNDRS"
            subtitle="Shows in feeds across the network"
            right={!communityId ? <Text variant="headline">✓</Text> : undefined}
            onPress={() => {
              setCommunityId(null);
              setAudienceOpen(false);
            }}
            last={!joined.length}
          />
          {joined.map((x, i) => (
            <ListRow
              key={x.id}
              icon={UsersRound}
              title={x.name}
              subtitle="Members of this space"
              right={communityId === x.id ? <Text variant="headline">✓</Text> : undefined}
              onPress={() => {
                setCommunityId(x.id);
                setAudienceOpen(false);
              }}
              last={i === joined.length - 1}
            />
          ))}
        </ListGroup>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
