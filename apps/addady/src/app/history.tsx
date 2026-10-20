import { Alert, View } from 'react-native';
import { spacing } from '@addady/ui-ar';

import { deleteReading } from '../db/repo';
import { monthlyUsage } from '../domain/monthly';
import { cumulativeReadings } from '../domain/series';
import { t } from '../i18n';
import { useFormat } from '../settings';
import { useHomeData } from '../state';
import { Body, Button, Caption, Card, Heading, Row, Screen } from '../ui';
import { ArabicBarChart } from '../ui/charts';

export default function History() {
  const { home, readings, now, status } = useHomeData();
  const f = useFormat();
  if (!home) return null;
  const months = monthlyUsage(cumulativeReadings(home, readings), home.meterMonthStartDay, now);

  const confirmDelete = (id: number) =>
    Alert.alert(t('common.delete'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void deleteReading(id) },
    ]);

  return (
    <Screen>
      <Heading>{t('history.monthly')}</Heading>
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
        <Body muted>{t('history.empty')}</Body>
      )}

      <Heading>{t('history.readings')}</Heading>
      {[...readings].reverse().map((r) => (
        <Card key={r.id}>
          <Row>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Caption>{f.dateTime(r.at)}</Caption>
              {r.registerKWh !== null ? <Body>{f.kwh(r.registerKWh)}</Body> : null}
              {r.monthKWh !== null ? (
                <Body>{`${t('reading.monthKWh')}: ${f.num(r.monthKWh)}`}</Body>
              ) : null}
              {r.balancePiasters !== null ? (
                <Body>{`${t('home.balance')}: ${f.money(r.balancePiasters)}`}</Body>
              ) : null}
            </View>
            <Button kind="danger" label={t('common.delete')} onPress={() => confirmDelete(r.id)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
