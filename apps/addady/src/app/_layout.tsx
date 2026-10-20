import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { fontFamily } from '@addady/ui-ar';

import migrations from '../../drizzle/migrations';
import { db } from '../db/client';
import { t } from '../i18n';
import { initNotifications } from '../services/notifications';
import { TariffProvider } from '../state';
import { Body, Screen, useColors } from '../ui';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const c = useColors();
  useEffect(initNotifications, []);

  if (error) {
    return (
      <Screen>
        <Body>{`⚠ ${error.message}`}</Body>
      </Screen>
    );
  }
  if (!success) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator color={c.primary} accessibilityLabel={t('common.loading')} />
      </View>
    );
  }

  return (
    <TariffProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.text,
          headerTitleStyle: { fontFamily: fontFamily.bold },
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: t('app.name') }} />
        <Stack.Screen name="setup" options={{ title: t('setup.title') }} />
        <Stack.Screen
          name="reading"
          options={{ title: t('reading.title'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="recharge"
          options={{ title: t('recharge.title'), presentation: 'modal' }}
        />
        <Stack.Screen name="bill-check" options={{ title: t('billCheck.title') }} />
        <Stack.Screen name="history" options={{ title: t('history.title') }} />
        <Stack.Screen name="appliances/index" options={{ title: t('appliances.title') }} />
        <Stack.Screen name="appliances/new" options={{ title: t('appliances.add') }} />
        <Stack.Screen name="what-if" options={{ title: t('whatIf.title') }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      </Stack>
    </TariffProvider>
  );
}
