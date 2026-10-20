import { router } from 'expo-router';
import { cairo } from '@addady/energy-model';

import { deleteAppliance } from '../../db/repo';
import { estimateAppliance, seasonOf } from '../../domain/appliances';
import { t } from '../../i18n';
import { useFormat } from '../../settings';
import { useHomeData } from '../../state';
import { Body, Button, Caption, Card, EstimatedBadge, Heading, Row, Screen } from '../../ui';

export default function Appliances() {
  const { home, appliances, status, now } = useHomeData();
  const f = useFormat();
  if (!home) return null;
  const season = seasonOf(cairo(now).getMonth() + 1);
  const estimates = appliances.map((a) => ({ a, e: estimateAppliance(a.kind, a.params, season) }));
  const modelled = estimates.reduce((s, x) => s + (x.e?.kWhPerDay ?? 0), 0);
  const metered = status?.model.fallback ? null : (status?.model.meanPerDay ?? null);

  return (
    <Screen>
      <Body muted>{t('appliances.intro')}</Body>
      {appliances.length === 0 ? <Body muted>{t('appliances.empty')}</Body> : null}
      {estimates.map(({ a, e }) => (
        <Card key={a.id}>
          <Row>
            <Heading>{a.name}</Heading>
            {e && e.confidence === 'default' ? <EstimatedBadge /> : null}
          </Row>
          <Caption>{t(`appliances.kinds.${a.kind}`)}</Caption>
          {e ? (
            <>
              <Body>{t('appliances.perMonth', { kWh: f.num(e.kWhPerDay * 30) })}</Body>
              {metered ? (
                <Caption>{`${f.num(Math.min(100, (e.kWhPerDay / metered) * 100))}٪ ${t('appliances.share')}`}</Caption>
              ) : null}
              {e.assumptions.length ? <Caption>{t('appliances.assumption')}</Caption> : null}
            </>
          ) : (
            <Body muted>{`⚠ ${t('common.invalidNumber')}`}</Body>
          )}
          <Button
            kind="danger"
            label={t('common.delete')}
            onPress={() => void deleteAppliance(home.id, a.id)}
          />
        </Card>
      ))}
      {metered && appliances.length ? (
        <Card>
          <Body>{`${t('appliances.unknown')}: ${t('appliances.perMonth', { kWh: f.num(Math.max(0, metered - modelled) * 30) })}`}</Body>
        </Card>
      ) : null}
      <Button label={t('appliances.add')} onPress={() => router.push('/appliances/new')} />
    </Screen>
  );
}
