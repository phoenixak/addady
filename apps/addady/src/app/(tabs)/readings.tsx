import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { spacing } from '@addady/ui-ar';

import { deleteReading } from '../../db/repo';
import { monthlyUsage } from '../../domain/monthly';
import { cumulativeReadings } from '../../domain/series';
import { t } from '../../i18n';
import { useFormat } from '../../settings';
import { useHomeData } from '../../state';
import {
  Banner,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  IconButton,
  Row,
  Screen,
  Section,
} from '../../ui';
import { ArabicBarChart } from '../../ui/charts';

export default function Readings() {
  const { home, readings, now, status } = useHomeData();
  const f = useFormat();
  if (!home) return null;
  const months = monthlyUsage(cumulativeReadings(home, readings), home.meterMonthStartDay, now);

  const confirmDelete = (id: number) =>
    Alert.alert(t('history.deleteTitle'), t('history.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void deleteReading(id) },
    ]);

  if (readings.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="counter"
          title={t('history.empty')}
          body={t('home.noReadingsBody')}
          action={
            <Button
              icon="plus"
              label={t('home.addReading')}
              onPress={() => router.push('/reading')}
            />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Button icon="plus" label={t('home.addReading')} onPress={() => router.push('/reading')} />

      <Section title={t('history.monthly')}>
        {months.length ? (
          <Card>
            <ArabicBarChart
              data={months.map((m) => ({ label: f.month(m.start), value: Math.round(m.kWh) }))}
              formatValue={(v) => f.num(v)}
            />
            {status ? (
              <Caption>{t('history.perDay', { kWh: f.num(status.model.meanPerDay, 1) })}</Caption>
            ) : null}
          </Card>
        ) : (
          <Banner tone="primary" icon="chart-bar">
            {t('history.needMore')}
          </Banner>
        )}
      </Section>

      <Section title={t('history.readings')}>
        {[...readings].reverse().map((r) => (
          <Card key={r.id}>
            <Row>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Caption>{f.dateTime(r.at)}</Caption>
                {r.registerKWh !== null ? <Body>{f.kwh(r.registerKWh)}</Body> : null}
                {r.monthKWh !== null ? (
                  <Body>{`${t('history.monthCounter')}: ${f.kwh(r.monthKWh)}`}</Body>
                ) : null}
                {r.balancePiasters !== null ? (
                  <Body>{`${t('home.balance')}: ${f.money(r.balancePiasters)}`}</Body>
                ) : null}
              </View>
              <IconButton
                icon="trash-can-outline"
                tone="danger"
                label={t('history.deleteReading', { at: f.dateTime(r.at) })}
                onPress={() => confirmDelete(r.id)}
              />
            </Row>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
