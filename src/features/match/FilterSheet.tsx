import { useTranslation } from '@/i18n';
import React, { useState } from 'react';
import { View } from 'react-native';

import type { MatchFilters, StartupStage, UserRole } from '@/data/types';
import { INDUSTRIES, ROLE_LABEL, STAGE_LABEL } from '@/lib/format';
import { Button, Chip, SegmentedControl, Sheet, Text } from '@/ui';
import { DEFAULT_FILTERS, useMatchFilters } from './filters';

const ROLES = Object.keys(ROLE_LABEL) as UserRole[];
const STAGES = Object.keys(STAGE_LABEL) as StartupStage[];
type Min = '0' | '60' | '75' | '90';

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10, marginBottom: 20 }}>
      <Text variant="label" color="textSubtle">{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

export function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const filters = useMatchFilters((s) => s.filters);
  const setFilters = useMatchFilters((s) => s.setFilters);
  const [draft, setDraft] = useState<MatchFilters>(filters);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setDraft(filters);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("Match filters")}
      subtitle={t("Narrow Smart Match to the people you need right now.")}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={t("Reset")} variant="secondary" style={{ flex: 1 }} onPress={() => setDraft(DEFAULT_FILTERS)} />
          <Button
            title={t("Show matches")}
            style={{ flex: 2 }}
            onPress={() => {
              setFilters(draft);
              onClose();
            }}
          />
        </View>
      }
    >
      <Group title={t("ROLE")}>
        {ROLES.map((r) => (
          <Chip key={r} label={t(ROLE_LABEL[r])} size="sm" selected={draft.roles.includes(r)} onPress={() => setDraft((d) => ({ ...d, roles: toggle(d.roles, r) }))} />
        ))}
      </Group>
      <Group title={t("STAGE")}>
        {STAGES.map((s) => (
          <Chip key={s} label={t(STAGE_LABEL[s])} size="sm" selected={draft.stages.includes(s)} onPress={() => setDraft((d) => ({ ...d, stages: toggle(d.stages, s) }))} />
        ))}
      </Group>
      <Group title={t("INDUSTRY")}>
        {INDUSTRIES.map((i) => (
          <Chip key={i} label={t(i)} size="sm" selected={draft.industries.includes(i)} onPress={() => setDraft((d) => ({ ...d, industries: toggle(d.industries, i) }))} />
        ))}
      </Group>
      <View style={{ gap: 10 }}>
        <Text variant="label" color="textSubtle">{t("MINIMUM FIT")}</Text>
        <SegmentedControl<Min>
          size="sm"
          value={String(draft.minScore) as Min}
          onChange={(v) => setDraft((d) => ({ ...d, minScore: Number(v) }))}
          options={[
            { value: '0', label: t("Any") },
            { value: '60', label: '60%+' },
            { value: '75', label: '75%+' },
            { value: '90', label: '90%+' },
          ]}
        />
      </View>
    </Sheet>
  );
}
