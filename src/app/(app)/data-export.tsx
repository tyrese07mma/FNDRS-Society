import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/data';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Header, Text } from '@/ui';
import { collectExport } from '@/lib/export-data';
import { saveExport } from '@/lib/save-export';
import { describeError } from '@/lib/errors';
import { CONTENT_MAX } from '@/lib/layout';

export default function DataExport() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { userId } = useAuth();
  const mounted = useRef(true);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const assertCurrent = async () => {
    if (!mounted.current || !userId || (await api.getSession())?.userId !== userId) throw new Error('Export canceled');
  };
  const prepare = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true); setError(null); setData(null);
    try {
      const result = await collectExport((dataset, after) => api.exportDataPage(dataset, after), assertCurrent,
        (done, total) => { if (mounted.current) setProgress(`${done} / ${total}`); });
      await assertCurrent();
      setData(result);
    } catch (e) { if (mounted.current) setError(describeError(e)); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  const save = async () => {
    if (!data || running.current) return;
    running.current = true; setBusy(true); setError(null);
    try { await assertCurrent(); await saveExport(data); }
    catch (e) { if (mounted.current) setError(describeError(e)); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <Header back title={t('Export my data')} />
    <ScrollView contentContainerStyle={{ padding: 20, gap: 20, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
      <Text>{t('Download your account details, settings, contributions, sent messages, Copilot history and activity as a JSON file.')}</Text>
      <Text color="textSubtle">{t('The file contains personal data. Save it somewhere private. Media files and messages written by other members are not included. Data changed during the export may differ between pages.')}</Text>
      {!!error && <Text color="danger" accessibilityRole="alert">{error}</Text>}
      {!!progress && busy && <Text>{t('Preparing export')} · {progress}</Text>}
      <Button title={t('Prepare export')} loading={busy && !data} disabled={busy} onPress={prepare} />
      {data && <Button title={t('Save export file')} loading={busy} disabled={busy} onPress={save} />}
    </ScrollView>
  </View>;
}
