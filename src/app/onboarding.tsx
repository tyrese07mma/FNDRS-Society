import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/data';
import { useUpdateMe } from '@/data/queries';
import type { StartupStage, UserRole } from '@/data/types';
import { INDUSTRIES, LOOKING_FOR, SKILLS, STAGE_LABEL } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { pickSquareImage } from '@/lib/pickImage';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/state/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Avatar, Button, Chip, IconButton, Input, PressableScale, ProgressBar, Switch, Text } from '@/ui';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Camera,
  Check,
  GraduationCap,
  Handshake,
  MapPin,
  Palette,
  Rocket,
  TrendingUp,
  type IconType,
} from '@/ui/icons';

const ROLES: { value: UserRole; icon: IconType; title: string; desc: string }[] = [
  { value: 'founder', icon: Rocket, title: 'Founder', desc: 'I am building a company' },
  { value: 'cofounder_seeker', icon: Handshake, title: 'Future co-founder', desc: 'I want to join or start something' },
  { value: 'investor', icon: TrendingUp, title: 'Investor', desc: 'Angel, fund or syndicate' },
  { value: 'operator', icon: Briefcase, title: 'Operator', desc: 'Product, growth, engineering, ops' },
  { value: 'mentor', icon: GraduationCap, title: 'Mentor', desc: 'I help founders level up' },
  { value: 'agency', icon: Palette, title: 'Agency / freelancer', desc: 'I work with startups' },
];

const STAGES: { value: StartupStage; desc: string }[] = [
  { value: 'idea', desc: 'Exploring a problem' },
  { value: 'mvp', desc: 'Building the first version' },
  { value: 'launched', desc: 'Live with first users' },
  { value: 'pre_seed', desc: 'Raising or raised pre-seed' },
  { value: 'seed', desc: 'Seed-funded and scaling' },
  { value: 'series_a_plus', desc: 'Series A and beyond' },
];

const STEPS = [
  { title: 'What best describes you?', sub: 'We tailor your feed, matches and intros to this.' },
  { title: 'Where are you on the journey?', sub: 'Just an idea is completely fine.' },
  { title: 'Which spaces are you in?', sub: 'Pick up to five.' },
  { title: 'Who are you looking for?', sub: 'This is the strongest signal Smart Match uses.' },
  { title: 'What do you bring?', sub: 'Pick up to six — people looking for these skills will find you.' },
  { title: 'Put a face to the name', sub: 'Profiles with a photo and headline get 4× more replies.' },
];

function toggle<T>(list: T[], item: T, max = 99): T[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return list.length >= max ? list : [...list, item];
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { profile } = useAuth();
  const updateMe = useUpdateMe();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole | null>(null);
  const [stage, setStage] = useState<StartupStage | null>(null);
  const [industries, setIndustries] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [openCofounder, setOpenCofounder] = useState(false);
  const [busy, setBusy] = useState(false);

  const canContinue = [
    !!role,
    !!stage,
    industries.length > 0,
    lookingFor.length > 0,
    skills.length > 0,
    headline.trim().length >= 3,
  ][step];

  const next = () => {
    haptic.selection();
    if (step === 3 && lookingFor.some((l) => l.includes('co-founder'))) setOpenCofounder(true);
    setStep((s) => s + 1);
  };

  const finish = async () => {
    setBusy(true);
    try {
      const avatar_url = avatar ? await api.uploadAvatar(avatar) : profile?.avatar_url ?? null;
      await updateMe.mutateAsync({
        role: role ?? 'founder',
        stage: stage ?? 'idea',
        industries,
        looking_for: lookingFor,
        skills,
        headline: headline.trim(),
        location: location.trim(),
        bio: bio.trim(),
        open_to: openCofounder ? ['cofounder'] : [],
        avatar_url,
        onboarded: true,
      });
      haptic.success();
      toast.accent('Welcome to FNDRS Society', '+100 XP — your first matches are ready.');
    } catch (e) {
      toast.error('Could not save your profile', e instanceof Error ? e.message : undefined);
      setBusy(false);
    }
  };

  const last = step === STEPS.length - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38 }}>
            {step > 0 && (
              <IconButton icon={ArrowLeft} variant="plain" size={38} onPress={() => setStep((s) => s - 1)} accessibilityLabel="Previous step" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <ProgressBar value={step + 1} max={STEPS.length} height={5} />
          </View>
          <Text variant="mono" color="textSubtle" style={{ width: 38, textAlign: 'right' }}>
            {step + 1}/{STEPS.length}
          </Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, maxWidth: 620, width: '100%', alignSelf: 'center' }}
      >
        <Animated.View key={step} entering={FadeInRight.duration(260)} exiting={FadeOutLeft.duration(140)} style={{ gap: 20 }}>
          <View style={{ gap: 8, marginTop: 8 }}>
            <Text variant="largeTitle">{STEPS[step].title}</Text>
            <Text color="textMuted">{STEPS[step].sub}</Text>
          </View>

          {step === 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {ROLES.map((r) => {
                const on = role === r.value;
                const Icon = r.icon;
                return (
                  <PressableScale
                    key={r.value}
                    haptics="selection"
                    onPress={() => setRole(r.value)}
                    accessibilityState={{ selected: on }}
                    style={{
                      width: '48%',
                      flexGrow: 1,
                      minHeight: 120,
                      padding: 16,
                      gap: 10,
                      borderRadius: radius.lg,
                      borderWidth: 1.5,
                      borderColor: on ? c.text : c.hairline,
                      backgroundColor: on ? c.tint08 : c.card,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: on ? c.action : c.tint08, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color={on ? c.actionText : c.text} />
                      </View>
                      {on && <Check size={18} color={c.text} />}
                    </View>
                    <View>
                      <Text variant="headline">{r.title}</Text>
                      <Text variant="caption" color="textSubtle">{r.desc}</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}

          {step === 1 && (
            <View style={{ gap: 10 }}>
              {STAGES.map((s) => {
                const on = stage === s.value;
                return (
                  <PressableScale
                    key={s.value}
                    haptics="selection"
                    scaleTo={0.985}
                    onPress={() => setStage(s.value)}
                    accessibilityState={{ selected: on }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderRadius: radius.lg,
                      borderWidth: 1.5,
                      borderColor: on ? c.text : c.hairline,
                      backgroundColor: on ? c.tint08 : c.card,
                    }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? c.text : c.tint20, alignItems: 'center', justifyContent: 'center' }}>
                      {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.text }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="headline">{STAGE_LABEL[s.value]}</Text>
                      <Text variant="caption" color="textSubtle">{s.desc}</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}

          {step === 2 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {INDUSTRIES.map((i) => (
                <Chip key={i} label={i} size="lg" selected={industries.includes(i)} onPress={() => setIndustries((l) => toggle(l, i, 5))} />
              ))}
            </View>
          )}

          {step === 3 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {LOOKING_FOR.map((i) => (
                <Chip key={i} label={i} size="lg" selected={lookingFor.includes(i)} onPress={() => setLookingFor((l) => toggle(l, i))} />
              ))}
            </View>
          )}

          {step === 4 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SKILLS.map((i) => (
                <Chip key={i} label={i} size="lg" selected={skills.includes(i)} onPress={() => setSkills((l) => toggle(l, i, 6))} />
              ))}
            </View>
          )}

          {step === 5 && (
            <View style={{ gap: 16 }}>
              <Pressable
                onPress={async () => {
                  const uri = await pickSquareImage();
                  if (uri) setAvatar(uri);
                }}
                accessibilityRole="button"
                accessibilityLabel="Choose a profile photo"
                style={{ alignSelf: 'center', alignItems: 'center', gap: 10 }}
              >
                <View>
                  <Avatar uri={avatar ?? profile?.avatar_url} name={profile?.full_name} size={104} />
                  <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.bg }}>
                    <Camera size={15} color={c.actionText} />
                  </View>
                </View>
                <Text variant="footnote" color="textMuted">{avatar ? 'Change photo' : 'Add a photo'}</Text>
              </Pressable>
              <Input label="Headline" value={headline} onChangeText={setHeadline} placeholder="Founder @ Loomwork · AI back-office for agencies" maxLength={120} counter />
              <Input label="Location" icon={MapPin} value={location} onChangeText={setLocation} placeholder="Berlin, Germany" />
              <Input label="About you (optional)" value={bio} onChangeText={setBio} placeholder="What are you building and why you?" multiline maxLength={600} counter />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.hairline }}>
                <Handshake size={20} color={c.accentText} />
                <View style={{ flex: 1 }}>
                  <Text variant="headline">Open to co-founding</Text>
                  <Text variant="caption" color="textSubtle">Shows a badge and boosts you in co-founder matches.</Text>
                </View>
                <Switch value={openCofounder} onValueChange={setOpenCofounder} accessibilityLabel="Open to co-founding" />
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: c.hairline, gap: 8 }}>
        <Button
          title={last ? 'Enter FNDRS' : 'Continue'}
          size="lg"
          block
          disabled={!canContinue}
          loading={busy}
          iconRight={ArrowRight}
          onPress={last ? finish : next}
          style={{ maxWidth: 620, width: '100%', alignSelf: 'center' }}
        />
        {step === 0 && (
          <Button title="Sign out" variant="ghost" size="sm" onPress={() => api.signOut()} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
