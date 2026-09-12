import { useTranslation } from '@/i18n';
import { useRouter, type Href } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';

import { isApiError } from '@/data';
import { useCandidates, useResetPasses, useSwipe, useSwipesLeft } from '@/data/queries';
import type { MatchCandidate, SwipeAction } from '@/data/types';
import { FilterSheet } from '@/features/match/FilterSheet';
import { activeFilterCount, useMatchFilters } from '@/features/match/filters';
import { MatchCelebration } from '@/features/match/MatchCelebration';
import { SwipeDeck, type DeckHandle } from '@/features/match/SwipeDeck';
import { haptic } from '@/lib/haptics';
import { useTabBarPadding } from '@/lib/layout';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/state/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button, EmptyState, Header, IconButton, PressableScale, Skeleton, Text } from '@/ui';
import { Crown, Handshake, RotateCcw, SlidersHorizontal, Sparkles, Star, X } from '@/ui/icons';

function RoundButton({
  onPress,
  size,
  bg,
  border,
  children,
  label,
}: {
  onPress: () => void;
  size: number;
  bg: string;
  border: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.88}
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 8px 20px rgba(0,0,0,0.18)' }}
    >
      {children}
    </PressableScale>
  );
}

export default function Match() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const { isPro } = useAuth();
  const pad = useTabBarPadding(12);
  const filters = useMatchFilters((s) => s.filters);
  const candidates = useCandidates(filters);
  const swipesLeft = useSwipesLeft();
  const swipe = useSwipe();
  const resetPasses = useResetPasses();
  const deckRef = useRef<DeckHandle>(null);
  const [deck, setDeck] = useState<MatchCandidate[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(false);
  const [match, setMatch] = useState<{ candidate: MatchCandidate; conversationId: string | null } | null>(null);
  const filterCount = activeFilterCount(filters);

  const [previousCandidates, setPreviousCandidates] = useState(candidates.data);
  if (previousCandidates !== candidates.data) {
    setPreviousCandidates(candidates.data);
    setDeck(candidates.data ?? []);
  }

  const onSwiped = async (cand: MatchCandidate, action: SwipeAction) => {
    setDeck((d) => d.filter((x) => x.id !== cand.id));
    if (action === 'pass') haptic.light();
    else haptic.medium();
    try {
      const res = await swipe.mutateAsync({ id: cand.id, action });
      if (res.matched) {
        haptic.success();
        setMatch({ candidate: cand, conversationId: res.conversationId });
      }
    } catch (e) {
      setDeck((d) => [cand, ...d]);
      if (isApiError(e, 'SWIPE_LIMIT')) setLimit(true);
      else toast.error(t("That swipe did not save"), e instanceof Error ? e.message : undefined);
    }
  };

  const top = deck[0];
  const act = (a: SwipeAction) => {
    if (!top) return;
    if (limit) return;
    deckRef.current?.swipe(a);
  };

  let body: React.ReactNode;
  if (candidates.isLoading) {
    body = <Skeleton height="100%" r={radius.xl} />;
  } else if (limit) {
    body = (
      <View style={{ flex: 1, borderRadius: radius.xl, borderWidth: 1, borderColor: c.accentBorder, backgroundColor: c.accentSoft, justifyContent: 'center', padding: 24 }}>
        <EmptyState
          icon={Crown}
          title={t("That’s today’s 25 free swipes")}
          message={t("Pro members swipe without limits, see who already liked them and get warm investor intros.")}
        />
        <Button title={t("Unlock unlimited matches")} variant="accent" size="lg" block icon={Sparkles} onPress={() => router.push('/premium')} />
        <Button title={t("Come back tomorrow")} variant="ghost" block onPress={() => setLimit(false)} style={{ marginTop: 6 }} />
      </View>
    );
  } else if (!top) {
    body = (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon={Sparkles}
          title={t("You’re all caught up")}
          message={filterCount ? t("No one else matches these filters right now. Widen them to see more people.") : t("New founders join every day. Check back soon — or look at people you passed.")}
        />
        <View style={{ gap: 10, alignItems: 'center' }}>
          {filterCount > 0 && <Button title={t("Adjust filters")} variant="secondary" icon={SlidersHorizontal} onPress={() => setFiltersOpen(true)} />}
          <Button title={t("Review people you passed")} variant="ghost" icon={RotateCcw} loading={resetPasses.isPending} onPress={() => resetPasses.mutate()} />
        </View>
      </View>
    );
  } else {
    body = <SwipeDeck ref={deckRef} items={deck} onSwiped={onSwiped} onOpen={(cand) => router.push(`/user/${cand.id}` as Href)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        large
        title={t("Smart Match")}
        subtitle={isPro ? t("Unlimited · Pro") : swipesLeft.data != null ? t('{{count}} free swipes left today', {count:swipesLeft.data}) : t("Founder-fit, ranked for you")}
        right={
          <View>
            <IconButton icon={SlidersHorizontal} onPress={() => setFiltersOpen(true)} accessibilityLabel={t("Match filters")} />
            {filterCount > 0 && (
              <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="mono" tint={c.onAccent} style={{ fontSize: 10 }}>{filterCount}</Text>
              </View>
            )}
          </View>
        }
      />

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, width: '100%', maxWidth: 520, alignSelf: 'center' }}>{body}</View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingBottom: pad, opacity: top && !limit ? 1 : 0.35 }}>
        <RoundButton label={t("Pass")} size={60} bg={c.card} border={c.hairlineStrong} onPress={() => act('pass')}>
          <X size={26} color={c.danger} strokeWidth={2.4} />
        </RoundButton>
        <RoundButton label={t("Super-like")} size={50} bg={c.card} border={c.accentBorder} onPress={() => act('superlike')}>
          <Star size={21} color={c.accentText} fill={c.accentText} />
        </RoundButton>
        <RoundButton label={t("Connect")} size={70} bg={c.action} border={c.action} onPress={() => act('connect')}>
          <Handshake size={30} color={c.actionText} strokeWidth={2.1} />
        </RoundButton>
      </View>

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <MatchCelebration match={match} onClose={() => setMatch(null)} />
    </View>
  );
}
