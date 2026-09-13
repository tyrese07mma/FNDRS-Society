import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStartups, useUserPosts } from '@/data/queries';
import type { Profile, PublicProfile } from '@/data/types';
import { PostCard } from '@/features/feed/PostCard';
import { StartupCard } from '@/features/startups/StartupCard';
import { hashHue } from '@/lib/color';
import { compact, ensureUrl, prettyUrl, ROLE_LABEL, STAGE_LABEL } from '@/lib/format';
import { CONTENT_MAX } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import {
  Avatar,
  Badge,
  Card,
  Chip,
  EmptyState,
  GradientCover,
  ProgressBar,
  ScoreRing,
  SegmentedControl,
  SkeletonList,
  Text,
} from '@/ui';
import {
  AtSign,
  BadgeCheck,
  Check,
  ChevronRight,
  Flame,
  Globe,
  Handshake,
  Link,
  Lock,
  MapPin,
  Newspaper,
  PenLine,
  Rocket,
  Star,
  Trophy,
  Users,
  type IconType,
} from '@/ui/icons';
import { profileStrength } from './strength';

type Tab = 'about' | 'posts' | 'startups';

function Stat({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, alignItems: 'center', gap: 2 }} accessibilityRole={onPress ? 'button' : 'text'}>
      <Text variant="number" style={{ fontSize: 19 }}>{value}</Text>
      <Text variant="caption" color="textSubtle">{label}</Text>
    </Pressable>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="label" color="textSubtle">{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

export interface ProfileViewProps {
  profile: Profile | PublicProfile;
  isMe: boolean;
  isPro?: boolean;
  /** Buttons under the avatar (edit / follow / message). */
  actions: React.ReactNode;
  /** Floating buttons over the cover (back, share, settings…). */
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  bottomPadding: number;
  refreshControl?: React.ReactElement<import('react-native').RefreshControlProps>;
}

export function ProfileView({ profile: p, isMe, isPro, actions, topLeft, topRight, bottomPadding, refreshControl }: ProfileViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [tab, setTab] = useState<Tab>('about');
  const posts = useUserPosts(p.id);
  const startups = useStartups('new');
  const mine = (startups.data ?? []).filter((s) => s.owner.id === p.id);
  const pub = 'is_following' in p ? (p as PublicProfile) : null;
  const strength = isMe ? profileStrength(p) : null;
  const xpInLevel = p.xp % 500;

  const achievements: { icon: IconType; label: string; done: boolean }[] = [
    { icon: BadgeCheck, label: t("Verified"), done: p.verified },
    { icon: PenLine, label: t("First post"), done: p.posts_count > 0 },
    { icon: Users, label: t("Connector"), done: p.following_count >= 5 },
    { icon: Flame, label: t("Rising"), done: p.level >= 3 },
    { icon: Trophy, label: t("Top founder"), done: p.founder_score >= 85 },
    { icon: Star, label: t("Magnet"), done: p.followers_count >= 100 },
  ];

  const links = [
    p.links?.website && { icon: Globe, label: prettyUrl(p.links.website), url: ensureUrl(p.links.website) },
    p.links?.linkedin && {
      icon: Link,
      label: t("LinkedIn"),
      url: /^https?:/.test(p.links.linkedin) ? p.links.linkedin : `https://www.linkedin.com/in/${p.links.linkedin.replace(/^@/, '')}`,
    },
    p.links?.x && { icon: AtSign, label: `@${p.links.x.replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '')}`, url: /^https?:/.test(p.links.x) ? p.links.x : `https://x.com/${p.links.x.replace(/^@/, '')}` },
  ].filter(Boolean) as { icon: IconType; label: string; url: string }[];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding }} refreshControl={refreshControl} showsVerticalScrollIndicator={false}>
        <GradientCover hue={hashHue(p.full_name)} height={insets.top + 120} />
        <View style={{ paddingHorizontal: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -48 }}>
            <View style={{ borderRadius: 60, borderWidth: 4, borderColor: c.bg }}>
              <Avatar uri={p.avatar_url} name={p.full_name} size={96} ring={p.verified} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>{actions}</View>
          </View>

          <View style={{ marginTop: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="title1" numberOfLines={1} style={{ flexShrink: 1 }}>{p.full_name}</Text>
              {p.verified && <BadgeCheck size={20} color={c.accentText} />}
            </View>
            <Text variant="mono" color="textSubtle">@{p.handle}</Text>
            {!!p.headline && <Text variant="callout" color="textMuted" style={{ marginTop: 4 }}>{p.headline}</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
              {!!p.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} color={c.textSubtle} />
                  <Text variant="caption" color="textSubtle">{p.location}</Text>
                </View>
              )}
              <Badge>{t(ROLE_LABEL[p.role])}</Badge>
              <Badge>{t(STAGE_LABEL[p.stage])}</Badge>
              {isMe && isPro && <Badge tone="accent" dot>Pro</Badge>}
              {p.open_to.includes('cofounder') && <Badge tone="success" icon={Handshake}>{t("Open to co-founding")}</Badge>}
              {pub?.follows_me && <Badge tone="info">{t("Follows you")}</Badge>}
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 18, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.hairline }}>
            <Stat value={compact(p.followers_count)} label={t("Followers")} onPress={() => router.push({ pathname: '/connections/[id]', params: { id: p.id, tab: 'followers' } })} />
            <Stat value={compact(p.following_count)} label={t("Following")} onPress={() => router.push({ pathname: '/connections/[id]', params: { id: p.id, tab: 'following' } })} />
            <Stat value={String(p.founder_score)} label={t("Founder score")} />
            <Stat value={t("Level {{level}}", {level:p.level})} label={`${compact(p.xp)} XP`} onPress={isMe ? () => router.push('/challenges') : undefined} />
          </View>

          <View style={{ gap: 14, marginTop: 16 }}>
            {pub && !pub.is_me && pub.match_score != null && (
              <Card variant="accent" style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <ScoreRing value={pub.match_score} size={62} accent label={t("FIT")} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="headline">{pub.is_match ? t("You matched") : t("Why you fit")}</Text>
                  {pub.match_reasons.slice(0, 3).map((r) => (
                    <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Check size={13} color={c.accentText} strokeWidth={2.6} />
                      <Text variant="footnote" color="textMuted" style={{ flex: 1 }}>{r}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {isMe && (
              <Card style={{ gap: 12 }} onPress={() => router.push('/challenges')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Trophy size={18} color={c.accentText} />
                  <Text variant="headline" style={{ flex: 1 }}>{t("Level {{level}}", {level:p.level})}</Text>
                  <Text variant="mono" color="textSubtle">{t("{{xp}} XP to level {{level}}", {xp:500-xpInLevel,level:p.level+1})}</Text>
                </View>
                <ProgressBar value={xpInLevel} max={500} tone="gold" />
              </Card>
            )}

            {strength && strength.pct < 100 && (
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="headline">{t("Profile strength")}</Text>
                  <Text variant="mono" color="textSubtle">{strength.pct}%</Text>
                </View>
                <ProgressBar value={strength.pct} />
                {strength.missing.slice(0, 3).map((m) => (
                  <Pressable key={m.key} onPress={() => router.push('/edit-profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="button">
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: c.tint20 }} />
                    <Text variant="callout" color="textMuted" style={{ flex: 1 }}>{t(m.label)}</Text>
                    <ChevronRight size={16} color={c.textFaint} />
                  </Pressable>
                ))}
              </Card>
            )}

            <SegmentedControl<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'about', label: t("About") },
                { value: 'posts', label: t("Posts") + (p.posts_count ? ` · ${p.posts_count}` : '') },
                { value: 'startups', label: t("Startups") },
              ]}
            />

            {tab === 'about' && (
              <View style={{ gap: 22 }}>
                {!!p.bio && (
                  <Block title={t("About")}>
                    <Text color="textMuted" style={{ lineHeight: 23 }}>{p.bio}</Text>
                  </Block>
                )}
                {p.looking_for.length > 0 && (
                  <Block title={t("Looking for")}>
                    <View style={{ gap: 8 }}>
                      {p.looking_for.map((l) => (
                        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Handshake size={16} color={c.accentText} />
                          <Text color="textMuted">{t(l)}</Text>
                        </View>
                      ))}
                    </View>
                  </Block>
                )}
                {p.skills.length > 0 && (
                  <Block title={t("Skills")}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {p.skills.map((s) => <Chip key={s} label={t(s)} size="sm" static />)}
                    </View>
                  </Block>
                )}
                {p.industries.length > 0 && (
                  <Block title={t("Industries")}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {p.industries.map((s) => <Chip key={s} label={t(s)} size="sm" static />)}
                    </View>
                  </Block>
                )}
                {links.length > 0 && (
                  <Block title={t("Links")}>
                    <View style={{ gap: 8 }}>
                      {links.map((l) => {
                        const Icon = l.icon;
                        return (
                          <Pressable
                            key={l.url}
                            onPress={() => WebBrowser.openBrowserAsync(l.url)}
                            accessibilityRole="link"
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.tint04 }}
                          >
                            <Icon size={16} color={c.textMuted} />
                            <Text variant="callout" style={{ flex: 1 }} numberOfLines={1}>{l.label}</Text>
                            <ChevronRight size={16} color={c.textFaint} />
                          </Pressable>
                        );
                      })}
                    </View>
                  </Block>
                )}
                <Block title={t("Achievements")}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {achievements.map((a) => {
                      const Icon = a.done ? a.icon : Lock;
                      return (
                        <View
                          key={a.label}
                          style={{ width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.md, backgroundColor: a.done ? c.accentSoft : c.tint04, borderWidth: 1, borderColor: a.done ? c.accentBorder : c.hairline, opacity: a.done ? 1 : 0.6 }}
                        >
                          <Icon size={20} color={a.done ? c.accentText : c.textSubtle} />
                          <Text variant="caption" color={a.done ? 'text' : 'textSubtle'}>{a.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Block>
              </View>
            )}

            {tab === 'posts' &&
              (posts.isLoading ? (
                <SkeletonList variant="post" count={2} />
              ) : (posts.data ?? []).length ? (
                <View style={{ gap: 12 }}>
                  {(posts.data ?? []).map((post) => <PostCard key={post.id} post={post} />)}
                </View>
              ) : (
                <EmptyState
                  compact
                  icon={Newspaper}
                  title={isMe ? t("You haven’t posted yet") : t("No posts yet")}
                  message={isMe ? t("Share a milestone or ask the community something.") : undefined}
                  actionLabel={isMe ? t("Write a post") : undefined}
                  onAction={() => router.push('/compose')}
                />
              ))}

            {tab === 'startups' &&
              (mine.length ? (
                <View style={{ gap: 12 }}>
                  {mine.map((s) => <StartupCard key={s.id} startup={s} />)}
                </View>
              ) : (
                <EmptyState
                  compact
                  icon={Rocket}
                  title={isMe ? t("Launch your startup") : t("No startups listed")}
                  message={isMe ? t("Show the community what you are building and who you want to meet.") : undefined}
                  actionLabel={isMe ? t("Launch on FNDRS") : undefined}
                  onAction={() => router.push('/startups/new' as Href)}
                />
              ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', top: insets.top + 6, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', pointerEvents: 'box-none' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>{topLeft}</View>
        <View style={{ flexDirection: 'row', gap: 8 }}>{topRight}</View>
      </View>
    </View>
  );
}
