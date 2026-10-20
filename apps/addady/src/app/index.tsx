import { Link } from 'expo-router';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArText, palette, spacing } from '@addady/ui-ar';

import ar from '../../i18n/ar.json';

export default function Home() {
  const colors = palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <ArText variant="title" color={colors.text}>
          {ar.app.name}
        </ArText>
        <ArText color={colors.textMuted}>{ar.app.tagline}</ArText>
        <ArText variant="caption" color={colors.textMuted}>
          {ar.common.unofficial}
        </ArText>
        <Link href="/spike">
          <ArText variant="heading" color={colors.primary}>
            {ar.home.chartsSpike}
          </ArText>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
});
