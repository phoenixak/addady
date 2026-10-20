import { cairo, consumptionMonth } from '@addady/energy-model';
import { versionFor } from 'eg-electricity-tariff';

import { estimateAppliance, priceSaving, seasonOf } from '../domain/appliances';
import { t } from '../i18n';
import { useFormat } from '../settings';
import { useHomeData } from '../state';
import { Body, Caption, Card, Heading, Screen } from '../ui';

export default function WhatIf() {
  const { home, appliances, status, tariffs, now } = useHomeData();
  const f = useFormat();
  if (!home || !status?.projection) {
    return (
      <Screen>
        <Body muted>{t('home.noReadings')}</Body>
      </Screen>
    );
  }
  const version = versionFor(tariffs, consumptionMonth(status.monthStart));
  const season = seasonOf(cairo(now).getMonth() + 1);
  const monthKWh = status.projection.kWh.p50;
  const days = 30;

  const scenarios: { title: string; kWhPerDay: number }[] = [];
  for (const a of appliances) {
    const base = estimateAppliance(a.kind, a.params, season);
    if (!base || base.kWhPerDay === 0) continue;
    const hours = typeof a.params.hoursPerDay === 'number' ? a.params.hoursPerDay : null;
    if (hours !== null && hours > 2) {
      const fewer = estimateAppliance(a.kind, { ...a.params, hoursPerDay: hours - 2 }, season);
      if (fewer)
        scenarios.push({
          title: `${a.name}: ${t('whatIf.fewerHours')}`,
          kWhPerDay: base.kWhPerDay - fewer.kWhPerDay,
        });
    }
    if (a.kind === 'ac' && season === 'summer') {
      const warmer = estimateAppliance(a.kind, { ...a.params, setpoint: 26 }, season);
      const cooler = estimateAppliance(a.kind, { ...a.params, setpoint: 22 }, season);
      if (warmer && cooler)
        scenarios.push({
          title: `${a.name}: ${t('whatIf.warmerAc')}`,
          kWhPerDay: cooler.kWhPerDay - warmer.kWhPerDay,
        });
    }
    if (
      a.kind === 'waterHeater' &&
      (typeof a.params.hoursOn !== 'number' || a.params.hoursOn > 2)
    ) {
      const timer = estimateAppliance(a.kind, { ...a.params, hoursOn: 2 }, season);
      if (timer)
        scenarios.push({
          title: `${a.name}: ${t('whatIf.heaterTimer')}`,
          kWhPerDay: base.kWhPerDay - timer.kWhPerDay,
        });
    }
  }
  // Always available: 10 x 40 W bulbs -> 9 W LED, 5 hours a day.
  scenarios.push({ title: t('whatIf.led'), kWhPerDay: (10 * (40 - 9) * 5) / 1000 });

  return (
    <Screen>
      <Body muted>{t('whatIf.intro')}</Body>
      {scenarios
        .map((s) => ({
          ...s,
          saving: priceSaving(version, monthKWh, s.kWhPerDay, days, home.meterType),
        }))
        .sort((a, b) => b.saving.piastersPerMonth - a.saving.piastersPerMonth)
        .map((s) => (
          <Card key={s.title} tone={s.saving.cheaperBand ? 'ok' : undefined}>
            <Heading>{s.title}</Heading>
            <Body>
              {t('whatIf.saves', {
                kWh: f.num(s.saving.kWhPerMonth),
                egp: f.money(s.saving.piastersPerMonth),
              })}
            </Body>
            {s.saving.cheaperBand ? <Body>{`✓ ${t('whatIf.tierEffect')}`}</Body> : null}
          </Card>
        ))}
      <Caption>{t('common.estimated')}</Caption>
    </Screen>
  );
}
