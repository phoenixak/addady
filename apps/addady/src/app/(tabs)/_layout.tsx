// Bottom tabs (docs/research/ux.md). In RTL the first tab, الرئيسية, sits on the right.
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArText, TOUCH_TARGET, fontFamily, spacing } from '@addady/ui-ar';

import { t } from '../../i18n';
import { Icon, useColors, type IconName } from '../../ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', label: 'tabs.home', icon: 'home-outline', iconActive: 'home' },
  { name: 'readings', label: 'tabs.readings', icon: 'gauge', iconActive: 'gauge' },
  { name: 'tools', label: 'tabs.tools', icon: 'toolbox-outline', iconActive: 'toolbox' },
  { name: 'rights', label: 'tabs.rights', icon: 'scale-balance', iconActive: 'scale-balance' },
  { name: 'settings', label: 'tabs.settings', icon: 'cog-outline', iconActive: 'cog' },
];

function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const c = useColors();
  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border }]}
    >
      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const tab = TABS.find((x) => x.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const color = focused ? c.primary : c.textMuted;
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityLabel={t(tab.label)}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={styles.tab}
            >
              <View style={[styles.pill, focused ? { backgroundColor: c.primarySoft } : null]}>
                <Icon name={focused ? tab.iconActive : tab.icon} size={24} color={color} />
              </View>
              <ArText
                variant="caption"
                color={color}
                numberOfLines={1}
                // Five labels must fit one row; the icon and accessibilityLabel carry the meaning
                // at larger sizes.
                maxFontSizeMultiplier={1.3}
                style={focused ? { fontFamily: fontFamily.bold } : null}
              >
                {t(tab.label)}
              </ArText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: fontFamily.bold },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.name === 'index' ? t('app.name') : t(tab.label) }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', paddingVertical: spacing.xs },
  tab: { flex: 1, minHeight: TOUCH_TARGET + 12, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 2 },
});
