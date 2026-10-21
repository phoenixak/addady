// The tier "staircase": the place's pricing bands with "إنت هنا". In RTL the cheapest band sits on
// the right, so it reads with the text. Labels sit under the bars so they stay readable at 200%.
import { StyleSheet, View } from 'react-native';
import { ArText, fontFamily, radii, spacing } from '@addady/ui-ar';

import { t } from '../i18n';
import { useFormat } from '../settings';
import { Icon, useColors } from './index';

export function TierStaircase({
  bandIndex,
  boundaries,
}: {
  bandIndex: number;
  /** Last kWh of each bounded band (the cliffs), ascending. */
  boundaries: readonly number[];
}) {
  const c = useColors();
  const f = useFormat();
  const labels = boundaries.map((b, i) =>
    i === 0 ? `${f.num(0)}–${f.num(b)}` : `${f.num(boundaries[i - 1]! + 1)}–${f.num(b)}`,
  );
  labels.push(`+${f.num(boundaries[boundaries.length - 1]!)}`);
  const tones = [c.ok, c.primary, c.warn, c.danger, c.danger];
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('home.staircaseA11y', {
        band: labels[bandIndex] ?? '',
        n: f.num(labels.length),
      })}
      accessibilityValue={{ min: 0, max: labels.length - 1, now: bandIndex }}
    >
      {labels.map((label, i) => {
        const active = i === bandIndex;
        const tone = tones[Math.min(i, tones.length - 1)]!;
        return (
          <View key={label} style={styles.column}>
            <View style={styles.marker}>
              {active ? (
                <>
                  <ArText variant="caption" color={tone} style={{ fontFamily: fontFamily.bold }}>
                    {t('home.youAreHere')}
                  </ArText>
                  <Icon name="menu-down" size={20} color={tone} />
                </>
              ) : null}
            </View>
            <View
              style={[
                styles.step,
                {
                  height: 20 + i * 14,
                  backgroundColor: active ? tone : c.border,
                  opacity: active ? 1 : 0.7,
                },
              ]}
            />
            <ArText
              variant="caption"
              maxFontSizeMultiplier={1.5}
              color={active ? c.text : c.textMuted}
              style={[styles.label, active ? { fontFamily: fontFamily.bold } : null]}
            >
              {label}
            </ArText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  column: { flex: 1, alignItems: 'stretch', gap: 2 },
  marker: { minHeight: 40, alignItems: 'center', justifyContent: 'flex-end' },
  step: { borderRadius: radii.sm / 2 },
  label: { textAlign: 'center' },
});
