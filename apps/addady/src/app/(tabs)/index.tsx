import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { spacing } from '@addady/ui-ar';

import { GRACE } from '../../content/holidays';
import { planNotifications, type PlannedNotification } from '../../domain/notifications';
import { hasBands, pricedClass, PLACE_ICONS } from '../../domain/place';
import { monthCliffs, type HomeStatus } from '../../domain/status';
import { t } from '../../i18n';
import { applyPlan } from '../../services/notifications';
import { useFormat, useSettings } from '../../settings';
import { useHomeData } from '../../state';
import {
  Banner,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  EstimatedBadge,
  HeroNumber,
  Icon,
  IconTile,
  Row,
  Screen,
  Section,
  Stat,
  StatusPill,
  TileGrid,
  Title,
  useColors,
} from '../../ui';
import { TierStaircase } from '../../ui/TierStaircase';

const DAY = 86_400_000;

export default function Dashboard() {
  const { home, homes, loaded, status, readings, tariffs, now } = useHomeData();
  const settings = useSettings();
  const f = useFormat();
  const c = useColors();

  // Re-plan local notifications whenever the numbers change (docs/PLAN.md §6).
  useEffect(() => {
    if (!home || !status || !settings.notifications) return;
    const plan = planNotifications(home.id, status, {
      now,
      grace: GRACE,
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
  const banded = hasBands(pricedClass(home));
  const cliffAhead =
    status?.cliff && status.budget && status.projection
      ? status.projection.kWh.p90 > status.cliff.atKWh
      : false;
  const stale =
    status?.daysSinceLastReading != null && status.daysSinceLastReading >= settings.staleDays;

  return (
    <Screen>
      <Row>
        <Icon name={PLACE_ICONS[home.kind]} size={28} color={c.primary} />
        <View style={{ flex: 1 }}>
          <Title>{home.name}</Title>
          <Caption>
            {`${t(`classes.${pricedClass(home)}`)} · ${t(`meterTypes.${home.meterType}`)}`}
          </Caption>
        </View>
        {homes.length > 1 ? (
          <Button
            kind="secondary"
            icon="swap-horizontal"
            label={t('home.switchPlace')}
            onPress={() => router.push('/settings')}
          />
        ) : null}
      </Row>

      {readings.length === 0 ? (
        <EmptyState
          icon="counter"
          title={t('home.noReadings')}
          body={t('home.noReadingsBody')}
          action={
            <Button
              icon="plus"
              label={t('home.addReading')}
              onPress={() => router.push('/reading')}
            />
          }
        />
      ) : null}

      {status && status.kWhSoFar !== null && status.current ? (
        <Card>
          <Row>
            <View style={{ flex: 1 }}>
              <HeroNumber
                label={t('home.monthSoFar')}
                value={f.num(Math.round(status.kWhSoFar))}
                unit={t('common.kwh')}
                meaning={t('home.daysLeft', { n: f.num(Math.ceil(status.daysLeft)) })}
              />
            </View>
            {estimated ? <EstimatedBadge /> : null}
          </Row>
          {banded && status.current.bandIndex >= 0 ? (
            <>
              <StatusPill
                tone={cliffAhead ? 'warn' : 'ok'}
                label={cliffAhead ? t('home.statusWatch') : t('home.statusSafe')}
              />
              <TierStaircase
                bandIndex={status.current.bandIndex}
                boundaries={monthCliffs(tariffs, status.monthStart, home).map((x) => x.atKWh)}
              />
            </>
          ) : null}
          <Stat
            label={t('home.currentBill')}
            value={f.money(status.current.total + home.otherChargesPiasters)}
          />
        </Card>
      ) : null}

      {cliffAhead && status?.cliff && status.budget ? (
        <Banner tone="warn" title={t('home.cliffTitle')}>
          <Body>
            {t('home.cliffBody', {
              atKWh: f.num(status.cliff.atKWh),
              jump: f.money(status.cliff.jump),
            })}
          </Body>
          <Body>
            {t('home.cliffBudget', { perDay: f.num(Math.max(0, status.budget.kWhPerDay), 1) })}
          </Body>
        </Banner>
      ) : null}

      {prepaid && status && readings.length > 0 ? <RunOutCard status={status} now={now} /> : null}

      {stale ? (
        <Banner tone="warn" icon="clock-alert-outline">
          {t('home.staleReading', { n: f.num(Math.floor(status!.daysSinceLastReading!)) })}
        </Banner>
      ) : null}
      {readings.length === 1 ? <Banner tone="primary">{t('home.oneReading')}</Banner> : null}

      {status?.projection ? (
        <Card>
          <Row>
            <Icon name="chart-timeline-variant" size={22} color={c.primary} />
            <Body>{t('home.projectedTitle')}</Body>
          </Row>
          <Stat
            label={t('home.projectedBill')}
            value={f.money(status.projection.total.p50 + home.otherChargesPiasters)}
            sub={t('common.between', {
              low: f.money(status.projection.total.p10 + home.otherChargesPiasters),
              high: f.money(status.projection.total.p90 + home.otherChargesPiasters),
            })}
          />
          <Stat
            label={t('home.projectedKWh')}
            value={f.kwh(Math.round(status.projection.kWh.p50))}
            sub={t('common.between', {
              low: f.num(Math.round(status.projection.kWh.p10)),
              high: f.num(Math.round(status.projection.kWh.p90)),
            })}
          />
          {status.tariffConfidence !== 'high' ? (
            <Caption>{t('common.lowConfidence')}</Caption>
          ) : null}
        </Card>
      ) : null}

      <Section title={t('home.quickActions')}>
        <TileGrid>
          <IconTile
            icon="counter"
            label={t('home.addReading')}
            onPress={() => router.push('/reading')}
          />
          {prepaid ? (
            <IconTile
              icon="credit-card-plus-outline"
              label={t('home.addRecharge')}
              onPress={() => router.push('/recharge')}
            />
          ) : null}
          <IconTile
            icon="file-document-check-outline"
            label={t('home.billCheck')}
            onPress={() => router.push('/bill-check')}
          />
          {prepaid ? (
            <IconTile
              icon="help-circle-outline"
              label={t('tools.explain')}
              onPress={() => router.push('/explain-recharge')}
            />
          ) : (
            <IconTile
              icon="toolbox-outline"
              label={t('tabs.tools')}
              onPress={() => router.push('/tools')}
            />
          )}
        </TileGrid>
      </Section>

      <View style={{ gap: spacing.xs }}>
        {status ? (
          <Caption>
            {t('home.tariffConfidence', {
              id: status.tariffId,
              level: t(`confidence.${status.tariffConfidence}`),
            })}
          </Caption>
        ) : null}
        <Caption>{t('common.unofficial')}</Caption>
      </View>
    </Screen>
  );
}

function RunOutCard({ status, now }: { status: HomeStatus; now: Date }) {
  const f = useFormat();
  if (status.latestBalance === null || !status.runOut) {
    return (
      <Banner tone="primary" icon="cash">
        {t('home.noBalance')}
      </Banner>
    );
  }
  const { runOut } = status;
  if (!runOut.zeroAt || !runOut.cutAt) {
    return (
      <Card tone="ok">
        <Stat label={t('home.balance')} value={f.money(status.latestBalance)} />
        <StatusPill tone="ok" label={t('home.runOutBeyond')} />
      </Card>
    );
  }
  const soon = runOut.cutAt.p10.getTime() - now.getTime() < 3 * DAY;
  return (
    <Card tone={soon ? 'danger' : 'warn'}>
      <Stat label={t('home.balance')} value={f.money(status.latestBalance)} />
      <StatusPill
        tone={soon ? 'danger' : 'warn'}
        label={soon ? t('home.statusDanger') : t('home.statusWatch')}
      />
      <Body>{t('home.runOutZero', { at: f.dateTime(runOut.zeroAt.p10) })}</Body>
      <Body>{t('home.runOutCut', { at: f.dateTime(runOut.cutAt.p10) })}</Body>
      <Caption>{`${t('home.runOutEarliest')} · ${t('common.estimated')}`}</Caption>
      <Caption>{t('home.runOutGraceNote', { evening: f.num(5), morning: f.num(10) })}</Caption>
    </Card>
  );
}
