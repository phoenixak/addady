import { router } from 'expo-router';
import { Linking } from 'react-native';

import { HOTLINE, RIGHTS } from '../../content/rights';
import { t } from '../../i18n';
import { useFormat } from '../../settings';
import { Banner, Button, Caption, ListItem, Screen } from '../../ui';

export default function Rights() {
  const f = useFormat();
  return (
    <Screen>
      <Banner tone="primary" icon="phone-in-talk" title={t('rights.hotlineTitle')}>
        {t('rights.hotlineBody')}
      </Banner>
      <Button
        icon="phone"
        label={t('rights.call', { n: f.num(Number(HOTLINE)) })}
        onPress={() => void Linking.openURL(`tel:${HOTLINE}`)}
      />
      {RIGHTS.map((r) => (
        <ListItem
          key={r.id}
          icon={r.icon}
          title={r.title}
          subtitle={r.summary}
          onPress={() => router.push({ pathname: '/rights/[id]', params: { id: r.id } })}
        />
      ))}
      <Caption>{t('rights.disclaimer')}</Caption>
    </Screen>
  );
}
