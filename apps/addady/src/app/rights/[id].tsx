import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { ArText, spacing } from '@addady/ui-ar';

import { HOTLINE, rightsCard } from '../../content/rights';
import { t } from '../../i18n';
import { useFormat } from '../../settings';
import { Body, Button, Caption, Card, ListItem, Screen, Section, useColors } from '../../ui';

export default function RightsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = rightsCard(id);
  const c = useColors();
  const f = useFormat();
  if (!card) return null;
  return (
    <Screen>
      <Stack.Screen options={{ title: card.title }} />
      <Body muted>{card.summary}</Body>
      <Card>
        {card.steps.map((step, i) => (
          <View key={step} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: c.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArText variant="caption" color={c.primary}>
                {f.num(i + 1)}
              </ArText>
            </View>
            <View style={{ flex: 1 }}>
              <Body>{step}</Body>
            </View>
          </View>
        ))}
      </Card>
      {card.tool ? (
        <Button
          icon="toolbox-outline"
          label={card.tool.label}
          onPress={() => router.push(card.tool!.href)}
        />
      ) : null}
      <Button
        kind="secondary"
        icon="phone"
        label={t('rights.call', { n: f.num(Number(HOTLINE)) })}
        onPress={() => void Linking.openURL(`tel:${HOTLINE}`)}
      />
      <Section title={t('rights.sources')}>
        {card.sources.map((s) => (
          <ListItem
            key={s.url}
            icon="link-variant"
            title={s.label}
            subtitle={new URL(s.url).hostname}
            onPress={() => void Linking.openURL(s.url)}
          />
        ))}
      </Section>
      <Caption>{t('rights.confidence', { level: t(`confidence.${card.confidence}`) })}</Caption>
      <Caption>{t('rights.disclaimer')}</Caption>
    </Screen>
  );
}
