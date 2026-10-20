import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { DEFAULT_GRACE } from '@addady/energy-model';

import { planNotifications, type PlannedNotification } from '../domain/notifications';
import type { HomeStatus } from '../domain/status';
import { t } from '../i18n';
import { applyPlan } from '../services/notifications';
import { useFormat, useSettings } from '../settings';
import { useHomeData } from '../state';
import {
  Body,
  Button,
  Caption,
  Card,
  EstimatedBadge,
  Heading,
  LinkRow,
  Row,
  Screen,
  Stat,
  Title,
} from '../ui';
import { TierBar } from '../ui/TierBar';

const DAY = 86_400_000;

export default function Dashboard() {
  const { home, loaded, status, readings, now } = useHomeData();
  const settings = useSettings();
  const f = useFormat();

  // Re-plan local notifications whenever the numbers change (docs/PLAN.md §6).
  useEffect(() => {
    if (!home || !status || !settings.notifications) return;
    const plan = planNotifications(home.id, status, {
      now,
      grace: DEFAULT_GRACE,
      staleAfterDays: settings.staleDays,
      reminderHour: settings.reminderHour,
      lowBalancePiasters: home.lowBalancePiasters,
    });
    const format = (n: PlannedNotification) =>
      t(`notifications.${n.key}`, {
        ...n.values,
        ...(typeof n.values.jump === 'number' ? { jump: f.money(n.values.jump) } : {}),
        ...(typeof n.values.atKWh === 'number' ? { atKWh: f.num(n.values.atKWh) } : {}),
        ...(typeof n.values.perDay === 'number' ? { perDay: f.num(n.values.perDay, 1) } : {}),
      });
    void applyPlan(home.id, plan, format);
  }, [home, status, settings, now, f]);

  if (!loaded) return null;
  if (!home) return <Redirect href="/setup" />;

  const estimated =
    status &&
    (status.tariffConfidence !== 'high' || status.kWhSoFarEstimated || status.model.fallback);
  const prepaid = home.meterType === 'prepaid';

  return (
    <Screen>
      <Title>{home.name}</Title>
      <Caption>{t(`meterTypes.${home.meterType}`)}</Caption>

      {readings.length === 0 ? (
        <Card tone="warn">
          <Body>{t('home.noReadings')}</Body>
        </Card>
      ) : null}

      {status && status.kWhSoFar !== null && status.current ? (
        <Card>
          <Row>
            <Stat
              label={t('home.monthSoFar')}
              value={f.kwh(Math.round(status.kWhSoFar))}
              sub={t('home.daysLeft', { n: f.num(Math.ceil(status.daysLeft)) })}
            />
            {estimated ? <EstimatedBadge /> : null}
          </Row>
          {status.current.bandIndex >= 0 ? (
            <>
              <Body>
                {t('home.currentTier', { tier: f.num(status.current.lines.at(-1)?.tier ?? 1) })}
              </Body>
              <TierBar bandIndex={status.current.bandIndex} boundaries={[100, 650, 1000]} />
            </>
          ) : null}
          <Stat
            label={t('home.currentBill')}
            value={f.money(status.current.total + home.otherChargesPiasters)}
          />
        </Card>
      ) : null}

      {status?.projection ? (
        <Card>
          <Heading>{t('home.projectedTitle')}</Heading>
          <Stat
            label={t('home.projectedKWh')}
            value={f.kwh(Math.round(status.projection.kWh.p50))}
            sub={t('common.between', {
              low: f.num(Math.round(status.projection.kWh.p10)),
              high: f.num(Math.round(status.projection.kWh.p90)),
            })}
          />
          <Stat
            label={t('home.projectedBill')}
            value={f.money(status.projection.total.p50 + home.otherChargesPiasters)}
            sub={t('common.between', {
              low: f.money(status.projection.total.p10 + home.otherChargesPiasters),
              high: f.money(status.projection.total.p90 + home.otherChargesPiasters),
            })}
          />
          {status.tariffConfidence !== 'high' ? (
            <Caption>{t('common.lowConfidence')}</Caption>
          ) : null}
        </Card>
      ) : null}

      {status?.cliff &&
      status.budget &&
      status.projection &&
      status.projection.kWh.p90 > status.cliff.atKWh ? (
        <Card tone="warn">
          <Heading>{`⚠ ${t('home.cliffTitle')}`}</Heading>
          <Body>
            {t('home.cliffBody', {
              atKWh: f.num(status.cliff.atKWh),
              jump: f.money(status.cliff.jump),
            })}
          </Body>
          <Body>
            {t('home.cliffBudget', { perDay: f.num(Math.max(0, status.budget.kWhPerDay), 1) })}
          </Body>
        </Card>
      ) : null}

      {prepaid && status ? <RunOutCard status={status} now={now} /> : null}

      {status?.daysSinceLastReading !== null &&
      status!.daysSinceLastReading! >= settings.staleDays ? (
        <Card tone="warn">
          <Body>
            {t('home.staleReading', { n: f.num(Math.floor(status!.daysSinceLastReading!)) })}
          </Body>
        </Card>
      ) : null}
      {readings.length === 1 ? <Caption>{t('home.oneReading')}</Caption> : null}

      <Button label={t('home.addReading')} onPress={() => router.push('/reading')} />
      {prepaid ? (
        <Button
          kind="secondary"
          label={t('home.addRecharge')}
          onPress={() => router.push('/recharge')}
        />
      ) : null}

      <LinkRow label={t('home.billCheck')} onPress={() => router.push('/bill-check')} />
      <LinkRow label={t('home.history')} onPress={() => router.push('/history')} />
      <LinkRow label={t('home.appliances')} onPress={() => router.push('/appliances')} />
      <LinkRow label={t('home.whatIf')} onPress={() => router.push('/what-if')} />
      <LinkRow label={t('home.settings')} onPress={() => router.push('/settings')} />

      {status ? (
        <Caption>
          {t('home.tariffConfidence', {
            id: status.tariffId,
            level: t(`confidence.${status.tariffConfidence}`),
          })}
        </Caption>
      ) : null}
      <Caption>{t('common.unofficial')}</Caption>
    </Screen>
  );
}

function RunOutCard({ status, now }: { status: HomeStatus; now: Date }) {
  const f = useFormat();
  if (status.latestBalance === null || !status.runOut) {
    return (
      <Card>
        <Body>{t('home.noBalance')}</Body>
      </Card>
    );
  }
  const { runOut } = status;
  if (!runOut.zeroAt || !runOut.cutAt) {
    return (
      <Card tone="ok">
        <Stat label={t('home.balance')} value={f.money(status.latestBalance)} />
        <Body>{`✓ ${t('home.runOutBeyond')}`}</Body>
      </Card>
    );
  }
  const soon = runOut.cutAt.p10.getTime() - now.getTime() < 3 * DAY;
  return (
    <Card tone={soon ? 'danger' : 'warn'}>
      <Stat label={t('home.balance')} value={f.money(status.latestBalance)} />
      <Heading>{`${soon ? '⚠ ' : ''}${t('home.runOutTitle')}`}</Heading>
      <Body>{t('home.runOutZero', { at: f.dateTime(runOut.zeroAt.p10) })}</Body>
      <Body>{t('home.runOutCut', { at: f.dateTime(runOut.cutAt.p10) })}</Body>
      <Caption>{`${t('home.runOutEarliest')} · ${t('common.estimated')}`}</Caption>
      <Caption>{t('home.runOutGraceNote')}</Caption>
    </Card>
  );
}
