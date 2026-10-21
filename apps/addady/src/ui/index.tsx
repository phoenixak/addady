// Design system v2 (docs/research/ux.md). Big tap targets, status = colour + icon + word, start/end
// only (never left/right), numbers are the hero, every icon has a word next to it.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
} from 'react';
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
  radii,
  spacing,
  type Colors,
  type Tone,
} from '@addady/ui-ar';

import { t } from '../i18n';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function useColors(): Colors {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** Decorative icon: the words next to it carry the meaning for screen readers. */
export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const TONE_ICON: Record<Exclude<Tone, 'primary'>, IconName> = {
  ok: 'check-circle',
  warn: 'alert',
  danger: 'alert-octagon',
};

function toneColors(c: Colors, tone: Tone) {
  if (tone === 'primary') return { fg: c.primary, bg: c.primarySoft };
  return { fg: c[tone], bg: c[`${tone}Soft`] };
}

export function Screen({
  children,
  scroll = true,
  edges = ['bottom'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const c = useColors();
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: c.background }]}>
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
  tone?: Exclude<Tone, 'primary'>;
}) {
  const c = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone ? c[`${tone}Soft`] : c.surface,
          borderColor: tone ? c[tone] : c.border,
          shadowColor: c.shadow,
        },
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
    <ArText variant="title" color={c.text} accessibilityRole="header">
      {children}
    </ArText>
  );
}

export function Heading({ children, color }: { children: ReactNode; color?: string }) {
  const c = useColors();
  return (
    <ArText variant="heading" color={color ?? c.text} accessibilityRole="header">
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

/** A section heading above a group of cards or rows. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <ArText variant="heading" color={c.textMuted} accessibilityRole="header">
        {title}
      </ArText>
      {children}
    </View>
  );
}

/** The number is the hero: big value, unit after it, one line saying what it means. */
export function HeroNumber({
  label,
  value,
  unit,
  meaning,
}: {
  label: string;
  value: string;
  unit?: string;
  meaning?: string;
}) {
  const c = useColors();
  return (
    <View
      style={styles.hero}
      accessible
      accessibilityLabel={[label, value, unit, meaning].join(' ')}
    >
      <ArText variant="caption" color={c.textMuted}>
        {label}
      </ArText>
      <View style={styles.heroRow}>
        <ArText variant="hero" color={c.text}>
          {value}
        </ArText>
        {unit ? (
          <ArText variant="heading" color={c.textMuted}>
            {unit}
          </ArText>
        ) : null}
      </View>
      {meaning ? <ArText color={c.text}>{meaning}</ArText> : null}
    </View>
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

/** ✓ أمان / ⚠ خد بالك / ⛔ خطر: colour, icon and word together. */
export function StatusPill({ tone, label }: { tone: Exclude<Tone, 'primary'>; label: string }) {
  const c = useColors();
  const { fg, bg } = toneColors(c, tone);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Icon name={TONE_ICON[tone]} size={16} color={fg} />
      <ArText variant="caption" color={fg} style={{ fontFamily: fontFamily.bold }}>
        {label}
      </ArText>
    </View>
  );
}

/** "تقديري" badge for results that rely on medium/low-confidence data. */
export function EstimatedBadge() {
  const c = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: c.warnSoft }]}>
      <Icon name="approximately-equal" size={16} color={c.warn} />
      <ArText variant="caption" color={c.warn}>
        {t('common.estimated')}
      </ArText>
    </View>
  );
}

/** A message strip with an icon: info (primary), ok, warn or danger. */
export function Banner({
  tone,
  title,
  children,
  icon,
}: {
  tone: Tone;
  title?: string;
  children?: ReactNode;
  icon?: IconName;
}) {
  const c = useColors();
  const { fg, bg } = toneColors(c, tone);
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: fg }]}>
      <Icon
        name={icon ?? (tone === 'primary' ? 'information' : TONE_ICON[tone])}
        size={24}
        color={fg}
      />
      <View style={styles.flex}>
        {title ? <Heading color={fg}>{title}</Heading> : null}
        {typeof children === 'string' ? <Body>{children}</Body> : children}
      </View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: IconName;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.primary : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'danger' ? c.danger : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
      {icon ? <Icon name={icon} size={22} color={fg} /> : null}
      <ArText variant="heading" color={fg}>
        {label}
      </ArText>
    </Pressable>
  );
}

/** A 48dp round button with only an icon; `label` is read by screen readers. */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'primary',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: Tone;
}) {
  const c = useColors();
  const { fg, bg } = toneColors(c, tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={24} color={fg} />
    </Pressable>
  );
}

/** A big square tile (icon above a short word), as in the wallet apps people already use. */
export function IconTile({
  icon,
  label,
  onPress,
  hint,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  hint?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}، ${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          shadowColor: c.shadow,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: c.primarySoft }]}>
        <Icon name={icon} size={28} color={c.primary} />
      </View>
      <ArText color={c.text} style={styles.center}>
        {label}
      </ArText>
      {hint ? (
        <ArText variant="caption" color={c.textMuted} style={styles.center}>
          {hint}
        </ArText>
      ) : null}
    </Pressable>
  );
}

/** Lays tiles out two per row (one per row is too sparse, three too small at 200% text). */
export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function ListItem({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const c = useColors();
  const content = (
    <>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: c.primarySoft }]}>
          <Icon name={icon} size={22} color={c.primary} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <ArText color={c.text}>{title}</ArText>
        {subtitle ? (
          <ArText variant="caption" color={c.textMuted}>
            {subtitle}
          </ArText>
        ) : null}
      </View>
      {trailing}
      {/* Forward in Arabic (RTL) points left. */}
      {onPress ? <Icon name="chevron-left" size={24} color={c.textMuted} /> : null}
    </>
  );
  const style = [styles.listItem, { backgroundColor: c.surface, borderColor: c.border }];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}، ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [...style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

/** Kept for existing screens: a ListItem without an icon. */
export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return <ListItem title={label} onPress={onPress} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Icon name={icon} size={40} color={c.primary} />
      </View>
      <ArText variant="heading" color={c.text} style={styles.center}>
        {title}
      </ArText>
      {body ? (
        <ArText color={c.textMuted} style={styles.center}>
          {body}
        </ArText>
      ) : null}
      {action}
    </View>
  );
}

export function Field({
  label,
  hint,
  error,
  unit,
  big,
  ...input
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  /** Shown after the number (e.g. "ج.م", "ك.و.س"). */
  unit?: string;
  /** Big numeric entry for the one number a screen asks for. */
  big?: boolean;
}) {
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
      <View
        style={[
          styles.inputBox,
          {
            borderColor: error ? c.danger : c.border,
            backgroundColor: c.surface,
            minHeight: big ? 72 : TOUCH_TARGET + 8,
          },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={unit ? `${label} (${unit})` : label}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          placeholderTextColor={c.textMuted}
          style={[
            styles.input,
            {
              color: c.text,
              fontSize: big ? 32 : 20,
              fontFamily: big ? fontFamily.bold : fontFamily.regular,
            },
          ]}
          {...input}
        />
        {unit ? (
          <ArText variant="heading" color={c.textMuted}>
            {unit}
          </ArText>
        ) : null}
      </View>
      {error ? (
        <View style={styles.inline}>
          <Icon name="alert-circle" size={16} color={c.danger} />
          <ArText variant="caption" color={c.danger}>
            {error}
          </ArText>
        </View>
      ) : null}
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

/** Radio list of big cards, optionally with an icon each. */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.choices} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.hint ? `${o.label}، ${o.hint}` : o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              styles.choice,
              {
                borderColor: selected ? c.primary : c.border,
                backgroundColor: selected ? c.primarySoft : c.surface,
                borderWidth: selected ? 2 : 1,
              },
            ]}
          >
            {o.icon ? (
              <Icon name={o.icon} size={28} color={selected ? c.primary : c.textMuted} />
            ) : null}
            <View style={styles.flex}>
              <ArText color={c.text} style={selected ? { fontFamily: fontFamily.bold } : null}>
                {o.label}
              </ArText>
              {o.hint ? (
                <ArText variant="caption" color={c.textMuted}>
                  {o.hint}
                </ArText>
              ) : null}
            </View>
            <Icon
              name={selected ? 'radiobox-marked' : 'radiobox-blank'}
              size={24}
              color={selected ? c.primary : c.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Two to four short options side by side (wraps at large text sizes). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { borderColor: c.border, backgroundColor: c.surface }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected ? { backgroundColor: c.primary } : null]}
          >
            <ArText color={selected ? c.onPrimary : c.text}>{o.label}</ArText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

// --- Toast: a short confirmation after every save, with a haptic tick ---

const ToastContext = createContext<(message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2500);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <SafeAreaView edges={['bottom']} style={styles.toastWrap} pointerEvents="none">
          <View
            style={[styles.toast, { backgroundColor: c.text }]}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <Icon name="check-circle" size={20} color={c.background} />
            <ArText color={c.background}>{message}</ArText>
          </View>
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, gap: 2 },
  center: { textAlign: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    elevation: 1,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  section: { gap: spacing.sm },
  hero: { gap: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  stat: { gap: 2 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderRadius: radii.card,
    borderStartWidth: 4,
    padding: spacing.md,
  },
  button: {
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radii.button,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 120,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    minHeight: TOUCH_TARGET + 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { gap: spacing.xs },
  fieldLabel: { gap: spacing.xs },
  inputBox: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  choices: { gap: spacing.sm },
  choice: {
    minHeight: TOUCH_TARGET + 8,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: radii.button,
    padding: 4,
    gap: 4,
  },
  segment: {
    flexGrow: 1,
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  toastWrap: { position: 'absolute', start: 0, end: 0, bottom: 96, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxWidth: '90%',
  },
});
