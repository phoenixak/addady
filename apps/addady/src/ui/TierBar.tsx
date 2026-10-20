// The tier "staircase": the four pricing bands with "you are here". In RTL the cheapest band
// sits on the right, so the bar reads in the same direction as the text.
import { StyleSheet, View } from 'react-native';
import { ArText, spacing } from '@addady/ui-ar';

import { useFormat } from '../settings';
import { useColors } from './index';

export function TierBar({ bandIndex, boundaries }: { bandIndex: number; boundaries: number[] }) {
  const c = useColors();
  const f = useFormat();
  const labels = boundaries.map((b, i) =>
    i === 0 ? `${f.num(0)}–${f.num(b)}` : `${f.num(boundaries[i - 1]! + 1)}–${f.num(b)}`,
  );
  labels.push(`+${f.num(boundaries[boundaries.length - 1]!)}`);
  const tones = [c.ok, c.primary, c.warn, c.danger];
  return (
    <View
      style={styles.bar}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: labels.length - 1, now: bandIndex }}
    >
      {labels.map((label, i) => {
        const active = i === bandIndex;
        return (
          <View
            key={label}
            style={[
              styles.step,
              { backgroundColor: active ? tones[i] : c.border, height: 28 + i * 10 },
            ]}
          >
            <ArText variant="caption" color={active ? c.onPrimary : c.textMuted}>
              {active ? `▼ ${label}` : label}
            </ArText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  step: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
});
