import { useTranslation } from '@/i18n';
import { describeError } from '@/lib/errors';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/data';
import { useUpdateMe } from '@/data/queries';
import type { ProfilePatch, StartupStage, UserRole } from '@/data/types';
import { INDUSTRIES, LOOKING_FOR, OPEN_TO, ROLE_LABEL, SKILLS, STAGE_LABEL } from '@/lib/format';
import { KAV_BEHAVIOR } from '@/lib/layout';
import { pickSquareImage } from '@/lib/pickImage';
import { useAuth } from '@/providers/AuthProvider';
import { confirm } from '@/state/dialog';
import { toast } from '@/state/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Chip, Header, Input, Text } from '@/ui';
import { AtSign, Camera, Globe, Link, MapPin, User } from '@/ui/icons';

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View>
        <Text variant="label" color="textSubtle">{title}</Text>
        {!!hint && <Text variant="caption" color="textFaint" style={{ marginTop: 2 }}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function toggle<T>(list: T[], item: T, max = 99) {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return list.length >= max ? list : [...list, item];
}

export default function EditProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile } = useAuth();
  const update = useUpdateMe();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    full_name: profile?.full_name ?? '',
    handle: profile?.handle ?? '',
    headline: profile?.headline ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    role: (profile?.role ?? 'founder') as UserRole,
    stage: (profile?.stage ?? 'idea') as StartupStage,
    industries: profile?.industries ?? [],
    skills: profile?.skills ?? [],
    looking_for: profile?.looking_for ?? [],
    open_to: profile?.open_to ?? [],
    website: profile?.links?.website ?? '',
    linkedin: profile?.links?.linkedin ?? '',
    x: profile?.links?.x ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!profile) return null;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const dirty =
    !!avatar ||
    JSON.stringify(form) !==
      JSON.stringify({
        full_name: profile.full_name, handle: profile.handle, headline: profile.headline, bio: profile.bio, location: profile.location,
        role: profile.role, stage: profile.stage, industries: profile.industries, skills: profile.skills, looking_for: profile.looking_for,
        open_to: profile.open_to, website: profile.links?.website ?? '', linkedin: profile.links?.linkedin ?? '', x: profile.links?.x ?? '',
      });

  const close = async () => {
    if (dirty && !(await confirm({ title: t("Discard changes?"), confirmLabel: t("Discard"), destructive: true }))) return;
    router.back();
  };

  const save = async () => {
    if (form.full_name.trim().length < 2) return setError(t("Please enter your name."));
    if (!/^[a-z0-9_]{3,20}$/.test(form.handle.trim().toLowerCase())) return setError(t("Handles use 3–20 lowercase letters, numbers or underscores."));
    setSaving(true);
    setError(null);
    try {
      const patch: ProfilePatch = {
        full_name: form.full_name.trim(),
        handle: form.handle.trim().toLowerCase(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        role: form.role,
        stage: form.stage,
        industries: form.industries,
        skills: form.skills,
        looking_for: form.looking_for,
        open_to: form.open_to,
        links: {
          ...(form.website.trim() ? { website: form.website.trim() } : {}),
          ...(form.linkedin.trim() ? { linkedin: form.linkedin.trim() } : {}),
          ...(form.x.trim() ? { x: form.x.trim().replace(/^@/, '') } : {}),
        },
      };
      if (avatar) patch.avatar_url = await api.uploadAvatar(avatar);
      await update.mutateAsync(patch);
      toast.success(t("Profile updated"));
      router.back();
    } catch (e) {
      setError(describeError(e));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={KAV_BEHAVIOR}>
      <Header modal back={close} title={t("Edit profile")} right={<Button title={t("Save")} size="sm" loading={saving} disabled={!dirty} onPress={save} />} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 26, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <Pressable
          onPress={async () => {
            const uri = await pickSquareImage();
            if (uri) setAvatar(uri);
          }}
          style={{ alignSelf: 'center', alignItems: 'center', gap: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t("Change profile photo")}
        >
          <View>
            <Avatar uri={avatar ?? profile.avatar_url} name={form.full_name} size={100} ring={profile.verified} />
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.bg }}>
              <Camera size={15} color={c.actionText} />
            </View>
          </View>
          <Text variant="footnote" color="textMuted">{t("Change photo")}</Text>
        </Pressable>

        {!!error && <Text variant="footnote" color="danger" align="center">{error}</Text>}

        <Group title={t("BASICS")}>
          <Input label={t("Full name")} icon={User} value={form.full_name} onChangeText={(v) => set('full_name', v)} autoComplete="name" />
          <Input label={t("Handle")} icon={AtSign} value={form.handle} onChangeText={(v) => set('handle', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} autoCapitalize="none" maxLength={20} hint={t("Your public @handle")} />
          <Input label={t("Headline")} value={form.headline} onChangeText={(v) => set('headline', v)} maxLength={120} counter placeholder={t("Founder @ Loomwork · AI back-office for agencies")} />
          <Input label={t("Location")} icon={MapPin} value={form.location} onChangeText={(v) => set('location', v)} placeholder={t("Berlin, Germany")} />
          <Input label={t("About")} value={form.bio} onChangeText={(v) => set('bio', v)} multiline maxLength={600} counter placeholder={t("What are you building, and why you?")} />
        </Group>

        <Group title={t("ROLE")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <Chip key={r} label={t(ROLE_LABEL[r])} selected={form.role === r} onPress={() => set('role', r)} />
            ))}
          </View>
        </Group>

        <Group title={t("STAGE")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(STAGE_LABEL) as StartupStage[]).map((s) => (
              <Chip key={s} label={t(STAGE_LABEL[s])} selected={form.stage === s} onPress={() => set('stage', s)} />
            ))}
          </View>
        </Group>

        <Group title={t("INDUSTRIES")} hint={t("Up to five")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {INDUSTRIES.map((i) => (
              <Chip key={i} label={t(i)} selected={form.industries.includes(i)} onPress={() => set('industries', toggle(form.industries, i, 5))} />
            ))}
          </View>
        </Group>

        <Group title={t("SKILLS")} hint={t("Up to six — what you bring to a team")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SKILLS.map((s) => (
              <Chip key={s} label={t(s)} selected={form.skills.includes(s)} onPress={() => set('skills', toggle(form.skills, s, 6))} />
            ))}
          </View>
        </Group>

        <Group title={t("LOOKING FOR")} hint={t("Powers Smart Match")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LOOKING_FOR.map((l) => (
              <Chip key={l} label={t(l)} selected={form.looking_for.includes(l)} onPress={() => set('looking_for', toggle(form.looking_for, l))} />
            ))}
          </View>
        </Group>

        <Group title={t("OPEN TO")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {OPEN_TO.map((o) => (
              <Chip key={o.key} label={t(o.label)} selected={form.open_to.includes(o.key)} onPress={() => set('open_to', toggle(form.open_to, o.key))} />
            ))}
          </View>
        </Group>

        <Group title={t("LINKS")}>
          <Input label={t("Website")} icon={Globe} value={form.website} onChangeText={(v) => set('website', v)} autoCapitalize="none" keyboardType="url" placeholder="loomwork.ai" />
          <Input label={t("LinkedIn")} icon={Link} value={form.linkedin} onChangeText={(v) => set('linkedin', v)} autoCapitalize="none" placeholder={t("linkedin.com/in/you or your handle")} />
          <Input label={t("X")} icon={AtSign} value={form.x} onChangeText={(v) => set('x', v)} autoCapitalize="none" placeholder="@handle" />
        </Group>

        <Button title={t("Save changes")} size="lg" block loading={saving} disabled={!dirty} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
