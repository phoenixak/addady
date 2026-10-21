// Every customer class's prices in the version in force, with sources and confidence.
import { Linking } from 'react-native';
import { consumptionMonth } from '@addady/energy-model';
import { CUSTOMER_CLASSES, versionFor, type Band } from 'eg-electricity-tariff';

import { t } from '../i18n';
import { useFormat } from '../settings';
import { useTariffs } from '../state';
import {
  Body,
  Caption,
  Card,
  EstimatedBadge,
  Heading,
  ListItem,
  Row,
  Screen,
  Section,
} from '../ui';

export default function Prices() {
  const { tariffs } = useTariffs();
  const f = useFormat();
  const version = versionFor(tariffs, consumptionMonth(new Date()));

  const range = (from: number, to: number | null) =>
    to === null
      ? t('prices.above', { kWh: f.num(from - 1) })
      : t('prices.range', { from: f.num(from), to: f.num(to) });

  const bandLines = (bands: Band[]) => {
    let prev = 0;
    return bands.map((b) => {
      // A single unbounded band is one price for every kWh.
      const head =
        bands.length === 1 ? t('prices.allKWh') : range(prev === 0 ? 0 : prev + 1, b.upTo);
      prev = b.upTo ?? prev;
      if (b.mode === 'flat') return `${head}: ${t('prices.flat', { rate: f.num(b.rate, 2) })}`;
      let from = 0;
      const tiers = b.tiers.map((x) => {
        const line = t('prices.tier', {
          from: f.num(from),
          to: x.upTo === null ? '…' : f.num(x.upTo),
          rate: f.num(x.rate, 2),
        });
        from = (x.upTo ?? from) + 1;
        return line;
      });
      return `${head}: ${tiers.join('، ')}`;
    });
  };

  return (
    <Screen>
      <Body muted>{t('prices.intro', { id: version.id })}</Body>
      {CUSTOMER_CLASSES.filter((c) => version.classes[c]).map((c) => {
        const tariff = version.classes[c]!;
        return (
          <Card key={c}>
            <Row>
              <Heading>{t(`classes.${c}`)}</Heading>
              {tariff.confidence !== 'high' ? <EstimatedBadge /> : null}
            </Row>
            {bandLines(tariff.bands).map((line) => (
              <Body key={line}>{line}</Body>
            ))}
            <Caption>
              {t('prices.fee', { fees: tariff.serviceFees.map((s) => f.money(s.fee)).join(' / ') })}
            </Caption>
            {tariff.stamps?.perKWh ? (
              <Caption>{t('prices.stampKWh', { n: f.num(tariff.stamps.perKWh, 2) })}</Caption>
            ) : null}
            {tariff.stamps?.per10KWh ? (
              <Caption>{t('prices.stamp10', { n: f.num(tariff.stamps.per10KWh, 2) })}</Caption>
            ) : null}
          </Card>
        );
      })}
      <Caption>{t('prices.notes')}</Caption>
      <Section title={t('settings.tariffSources')}>
        {version.sources.map((s) => (
          <ListItem
            key={s}
            icon="link-variant"
            title={new URL(s).hostname}
            onPress={() => void Linking.openURL(s)}
          />
        ))}
      </Section>
    </Screen>
  );
}
