import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';
import { Text } from './Text';

type Block =
  | { t: 'h1' | 'h2' | 'h3' | 'p' | 'quote'; text: string }
  | { t: 'ul' | 'ol'; items: string[] };

function parse(src: string): Block[] {
  const lines = src.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: 'p', text: para.join(' ') });
    para = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    const ul = /^[-*•]\s+(.*)$/.exec(trimmed);
    const ol = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (h) {
      flush();
      blocks.push({ t: (['h1', 'h2', 'h3'] as const)[h[1].length - 1], text: h[2] });
    } else if (ul || ol) {
      flush();
      const kind = ul ? 'ul' : 'ol';
      const text = (ul ?? ol)![1];
      const last = blocks[blocks.length - 1];
      if (last && last.t === kind) last.items.push(text);
      else blocks.push({ t: kind, items: [text] });
    } else if (trimmed.startsWith('>')) {
      flush();
      blocks.push({ t: 'quote', text: trimmed.replace(/^>\s?/, '') });
    } else {
      para.push(trimmed);
    }
  }
  flush();
  return blocks;
}

/** Renders **bold** and `code` spans inside a line. */
function Inline({ text, color }: { text: string; color?: string }) {
  const { c } = useTheme();
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <Text key={i} tint={color ?? c.text} style={{ fontFamily: font.sansSemibold }}>
              {p.slice(2, -2)}
            </Text>
          );
        }
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <Text key={i} tint={c.accentText} style={{ fontFamily: font.mono, fontSize: 13.5 }}>
              {p.slice(1, -1)}
            </Text>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Minimal markdown renderer for guides and Copilot answers: headings, paragraphs,
 * bullet / numbered lists, quotes, **bold** and `code`.
 */
export function Markdown({ source, size = 'md' }: { source: string; size?: 'sm' | 'md' }) {
  const { c } = useTheme();
  const fs = size === 'sm' ? 14.5 : 16;
  const lh = size === 'sm' ? 21 : 25;
  const blocks = parse(source);
  return (
    <View style={{ gap: size === 'sm' ? 8 : 14 }}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h1':
            return <Text key={i} variant="title1" style={{ marginTop: i ? 8 : 0 }}><Inline text={b.text} /></Text>;
          case 'h2':
            return <Text key={i} variant="title2" style={{ marginTop: i ? 6 : 0 }}><Inline text={b.text} /></Text>;
          case 'h3':
            return <Text key={i} variant="title3" style={{ marginTop: i ? 4 : 0 }}><Inline text={b.text} /></Text>;
          case 'quote':
            return (
              <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: 12 }}>
                <Text color="textMuted" style={{ fontSize: fs, lineHeight: lh, fontStyle: 'italic' }}>
                  <Inline text={b.text} />
                </Text>
              </View>
            );
          case 'ul':
          case 'ol':
            return (
              <View key={i} style={{ gap: 6 }}>
                {b.items.map((it, k) => (
                  <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
                    <Text
                      tint={c.accentText}
                      style={{ fontFamily: b.t === 'ol' ? font.monoMedium : font.sansBold, fontSize: b.t === 'ol' ? 13 : fs, lineHeight: lh, minWidth: 14 }}
                    >
                      {b.t === 'ol' ? `${k + 1}.` : '•'}
                    </Text>
                    <Text color="textMuted" style={{ flex: 1, fontSize: fs, lineHeight: lh }}>
                      <Inline text={it} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          default:
            return (
              <Text key={i} color="textMuted" style={{ fontSize: fs, lineHeight: lh }}>
                <Inline text={b.text} />
              </Text>
            );
        }
      })}
    </View>
  );
}
