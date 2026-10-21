// Cliff planner: where one more kWh reprices the whole month, and what it costs.
import { View } from 'react-native';
import { spacing } from '@addady/ui-ar';

import { pricedClass } from '../domain/place';
import { monthCliffs } from '../domain/status';
import { t } from '../i18n';
import { useFormat } from '../settings';
import { useHomeData } from '../state';
import { Banner, Body, Caption, Card, Heading, Row, Screen, StatusPill } from '../ui';
import { TierStaircase } from '../ui/TierStaircase';

export default function Cliffs() {
  const { home, status, tariffs, now } = useHomeData();
  const f = useFormat();
  if (!home) return null;
  const cliffs = monthCliffs(tariffs, status?.monthStart ?? now, home);
  const used = status?.kWhSoFar ?? null;

  return (
    <Screen>
      <Body muted>{t('cliffs.intro')}</Body>
      <Caption>{t(`classes.${pricedClass(home)}`)}</Caption>
      {cliffs.length === 0 ? <Banner tone="primary">{t('cliffs.none')}</Banner> : null}
      {cliffs.length > 0 && status?.current && status.current.bandIndex >= 0 ? (
        <Card>
          <TierStaircase
            bandIndex={status.current.bandIndex}
            boundaries={cliffs.map((c) => c.atKWh)}
          />
        </Card>
      ) : null}
      {cliffs.map((c) => {
        const passed = used !== null && used > c.atKWh;
        const close = !passed && used !== null && c.atKWh - used < 30;
        return (
          <Card key={c.atKWh} tone={close ? 'warn' : undefined}>
            <Row>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Heading>{t('cliffs.at', { kWh: f.num(c.atKWh) })}</Heading>
                <Body>{t('cliffs.jump', { next: f.num(c.atKWh + 1), jump: f.money(c.jump) })}</Body>
                <Caption>
                  {t('cliffs.totals', {
                    before: f.money(c.totalBefore),
                    after: f.money(c.totalAfter),
                  })}
                </Caption>
              </View>
              {passed ? <StatusPill tone="warn" label={t('cliffs.passed')} /> : null}
            </Row>
            {!passed && used !== null ? (
              <Body muted>
                {t('cliffs.left', { kWh: f.num(Math.max(0, Math.floor(c.atKWh - used))) })}
              </Body>
            ) : null}
          </Card>
        );
      })}
      <Caption>{t('common.unofficial')}</Caption>
    </Screen>
  );
}
