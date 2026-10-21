// Shared building blocks. Big tap targets, colour always paired with an icon or word, start/end only.
import { useRef, type ComponentRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArText,
  MAX_FONT_SCALE,
  TOUCH_TARGET,
  fontFamily,
  normalizeDigits,
  palette,
  spacing,
  type Colors,
} from '@addady/ui-ar';

import { t } from '../i18n';

export function useColors(): Colors {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const c = useColors();
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: c.background }]}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  tone,
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'warn' | 'danger' | 'ok';
}) {
  const c = useColors();
  const border = tone ? c[tone] : c.border;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: border, borderStartWidth: tone ? 4 : 1 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ArText variant="title" color={c.text}>
      {children}
    </ArText>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ArText variant="heading" color={c.text}>
      {children}
    </ArText>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const c = useColors();
  return <ArText color={muted ? c.textMuted : c.text}>{children}</ArText>;
}

export function Caption({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ArText variant="caption" color={c.textMuted}>
      {children}
    </ArText>
  );
}

/** Big value with a label above it (e.g. "الفاتورة المتوقعة" / "٣٥٦ ج.م"). */
export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={styles.stat}>
      <ArText variant="caption" color={c.textMuted}>
        {label}
      </ArText>
      <ArText variant="title" color={c.text}>
        {value}
      </ArText>
      {sub ? (
        <ArText variant="caption" color={c.textMuted}>
          {sub}
        </ArText>
      ) : null}
    </View>
  );
}

/** "تقديري" badge for results that rely on medium/low-confidence data. */
export function EstimatedBadge() {
  const c = useColors();
  return (
    <View style={[styles.badge, { borderColor: c.warn }]}>
      <ArText variant="caption" color={c.warn}>{`≈ ${t('common.estimated')}`}</ArText>
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.primary : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'danger' ? c.danger : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: kind === 'danger' ? c.danger : c.primary,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <ArText variant="heading" color={fg}>
        {label}
      </ArText>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const c = useColors();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <View style={styles.field}>
      {/* Tapping the label or hint focuses the input (bigger target, screen-reader friendly). */}
      <Pressable onPress={() => ref.current?.focus()} accessible={false} style={styles.fieldLabel}>
        <ArText color={c.text}>{label}</ArText>
        {hint ? (
          <ArText variant="caption" color={c.textMuted}>
            {hint}
          </ArText>
        ) : null}
      </Pressable>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          { color: c.text, borderColor: error ? c.danger : c.border, backgroundColor: c.surface },
        ]}
        {...input}
      />
      {error ? <ArText variant="caption" color={c.danger}>{`⚠ ${error}`}</ArText> : null}
    </View>
  );
}

/** Parses a number typed with Arabic-Indic or Latin digits; null when empty or invalid. */
export function parseNumber(text: string): number | null {
  const s = normalizeDigits(text).replace(/,/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** EGP typed by the user -> integer piasters. */
export function parsePiasters(text: string): number | null {
  const n = parseNumber(text);
  return n === null ? null : Math.round(n * 100);
}

export function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              styles.choice,
              {
                borderColor: selected ? c.primary : c.border,
                backgroundColor: c.surface,
                borderWidth: selected ? 2 : 1,
              },
            ]}
          >
            <ArText color={c.text}>{`${selected ? '◉' : '○'}  ${o.label}`}</ArText>
            {o.hint ? (
              <ArText variant="caption" color={c.textMuted}>
                {o.hint}
              </ArText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.linkRow, { borderColor: c.border, backgroundColor: c.surface }]}
    >
      <ArText color={c.text}>{label}</ArText>
      {/* Chevron points to the end side; flips automatically in RTL via the text direction. */}
      <ArText color={c.primary} style={{ fontFamily: fontFamily.bold }}>
        {'‹'}
      </ArText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  stat: { gap: 2 },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
  },
  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  field: { gap: spacing.xs },
  fieldLabel: { gap: spacing.xs },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: 20,
  },
  choices: { gap: spacing.sm },
  choice: {
    minHeight: TOUCH_TARGET,
    borderRadius: 12,
    padding: spacing.md,
    gap: 2,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  linkRow: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
