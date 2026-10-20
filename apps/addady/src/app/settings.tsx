import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { setSetting } from '../db/repo';
import { t } from '../i18n';
import { exportCsv, restoreFromPicker, shareBackup } from '../services/backup';
import { cancelAll, requestPermission } from '../services/notifications';
import { useSettings } from '../settings';
import { useCurrentHome, useTariffs } from '../state';
import { Body, Button, Caption, Card, Choice, Heading, LinkRow, Screen } from '../ui';

const REPO = 'https://github.com/phoenixak/addady';

export default function Settings() {
  const settings = useSettings();
  const { homes, home } = useCurrentHome();
  const { tariffs, refresh } = useTariffs();
  const [message, setMessage] = useState<string | null>(null);
  const latest = tariffs.versions[tariffs.versions.length - 1]!;

  const toggleNotifications = async () => {
    if (settings.notifications) {
      await setSetting('notifications', 'off');
      await cancelAll();
      return;
    }
    // Explained on screen before Android asks (docs/PLAN.md §6).
    const granted = await requestPermission();
    await setSetting('notifications', granted ? 'on' : 'off');
  };

  const restore = () =>
    Alert.alert(t('settings.restore'), t('settings.restoreConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.restore'),
        style: 'destructive',
        onPress: async () => {
          const r = await restoreFromPicker();
          if (r === 'restored') setMessage(t('settings.restoreDone'));
          if (r === 'invalid') setMessage(t('settings.restoreInvalid'));
        },
      },
    ]);

  const checkTariffs = async () => {
    const r = await refresh();
    setMessage(
      t(
        r === 'updated'
          ? 'settings.tariffUpdated'
          : r === 'up-to-date'
            ? 'settings.tariffUpToDate'
            : 'settings.tariffFailed',
      ),
    );
  };

  return (
    <Screen>
      {message ? (
        <Card tone="ok">
          <Body>{message}</Body>
        </Card>
      ) : null}

      <Heading>{t('settings.notifications')}</Heading>
      <Body muted>{t('settings.notificationsWhy')}</Body>
      <Button
        kind={settings.notifications ? 'secondary' : 'primary'}
        label={
          settings.notifications
            ? `✓ ${t('settings.notifications')}`
            : t('settings.enableNotifications')
        }
        onPress={toggleNotifications}
      />
      <Body>{t('settings.reminderHour')}</Body>
      <Choice
        value={settings.reminderHour}
        onChange={(h) => void setSetting('reminderHour', String(h))}
        options={[8, 14, 20].map((h) => ({ value: h, label: `${h}:00` }))}
      />
      <Body>{t('settings.staleDays')}</Body>
      <Choice
        value={settings.staleDays}
        onChange={(d) => void setSetting('staleDays', String(d))}
        options={[2, 4, 7].map((d) => ({ value: d, label: t('common.days', { n: d }) }))}
      />

      <Heading>{t('settings.digits')}</Heading>
      <Choice
        value={settings.digits}
        onChange={(d) => void setSetting('digits', d)}
        options={[
          { value: 'arab', label: t('settings.digitsArab') },
          { value: 'latn', label: t('settings.digitsLatn') },
        ]}
      />

      <Heading>{t('settings.homes')}</Heading>
      {homes.length > 1 ? (
        <Choice
          value={home?.id ?? 0}
          onChange={(id) => void setSetting('currentHomeId', String(id))}
          options={homes.map((h) => ({ value: h.id, label: h.name }))}
        />
      ) : null}
      <LinkRow label={t('settings.addHome')} onPress={() => router.push('/setup')} />

      <LinkRow label={t('settings.export')} onPress={() => void exportCsv()} />
      <LinkRow label={t('settings.backup')} onPress={() => void shareBackup()} />
      <LinkRow label={t('settings.restore')} onPress={restore} />

      <Heading>{t('settings.tariff')}</Heading>
      <Body>{t('settings.tariffVersion', { id: latest.id })}</Body>
      <Caption>
        {t('home.tariffConfidence', { id: latest.id, level: t(`confidence.${latest.confidence}`) })}
      </Caption>
      <Button kind="secondary" label={t('settings.checkTariff')} onPress={checkTariffs} />
      <Caption>{t('settings.tariffSources')}</Caption>
      {latest.sources.map((s) => (
        <LinkRow key={s} label={new URL(s).hostname} onPress={() => void Linking.openURL(s)} />
      ))}

      <Card>
        <Heading>{t('settings.about')}</Heading>
        <Body>{t('settings.aboutBody')}</Body>
        <Heading>{t('settings.privacy')}</Heading>
        <Body>{t('settings.privacyBody')}</Body>
      </Card>
      <LinkRow label={t('settings.sourceCode')} onPress={() => void Linking.openURL(REPO)} />
    </Screen>
  );
}
