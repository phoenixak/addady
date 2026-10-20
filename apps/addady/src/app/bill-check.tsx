import { useState } from 'react';
import { cairoDateKey } from '@addady/energy-model';

import { checkBill, type BillCheck } from '../domain/billCheck';
import { t } from '../i18n';
import { useFormat } from '../settings';
import { useCurrentHome, useTariffs } from '../state';
import {
  Body,
  Button,
  Caption,
  Card,
  EstimatedBadge,
  Field,
  Heading,
  Row,
  Screen,
  Stat,
  parseNumber,
  parsePiasters,
} from '../ui';

export default function BillCheckScreen() {
  const { home } = useCurrentHome();
  const { tariffs } = useTariffs();
  const f = useFormat();
  const [kWh, setKWh] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(cairoDateKey(Date.now()).slice(0, 7));
  const [result, setResult] = useState<BillCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!home) return null;

  const run = () => {
    const k = parseNumber(kWh);
    const billed = parsePiasters(amount);
    if (k === null || billed === null || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      setError(t('common.invalidNumber'));
      return;
    }
    try {
      setResult(
        checkBill({
          tariffs,
          month,
          kWh: k,
          billedPiasters: billed,
          meterType: home.meterType,
          otherChargesPiasters: home.otherChargesPiasters,
        }),
      );
      setError(null);
    } catch {
      setError(t('common.invalidNumber'));
    }
  };

  return (
    <Screen>
      <Body muted>{t('billCheck.intro')}</Body>
      <Field
        label={t('billCheck.kWh')}
        value={kWh}
        onChangeText={setKWh}
        keyboardType="number-pad"
      />
      <Field
        label={t('billCheck.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Field label={t('billCheck.month')} hint="YYYY-MM" value={month} onChangeText={setMonth} />
      {error ? <Body>{`⚠ ${error}`}</Body> : null}
      <Button label={t('billCheck.check')} onPress={run} />

      {result ? (
        <Card tone={result.verdict === 'match' ? 'ok' : 'warn'}>
          <Row>
            <Heading>{t('billCheck.expected')}</Heading>
            {result.expected.confidence !== 'high' ? <EstimatedBadge /> : null}
          </Row>
          {result.expected.lines.map((l) => (
            <Body key={`${l.tier}-${l.fromKWh}`}>
              {`${
                // Tier 6/7 bands and coded meters (tier 0) price every kWh of the month at one rate.
                l.tier === 0 || l.tier >= 6
                  ? t('billCheck.flatLine', { kWh: f.num(l.kWh), rate: f.num(l.rate, 2) })
                  : t('billCheck.line', {
                      tier: f.num(l.tier),
                      kWh: f.num(l.kWh),
                      rate: f.num(l.rate, 2),
                    })
              } = ${f.money(l.amount)}`}
            </Body>
          ))}
          <Body>{`${t('billCheck.serviceFee')} = ${f.money(result.expected.serviceFee)}`}</Body>
          {result.otherCharges ? (
            <Body>{`${t('billCheck.otherCharges')} = ${f.money(result.otherCharges)}`}</Body>
          ) : null}
          <Stat label={t('billCheck.expected')} value={f.money(result.expectedTotal)} />
          <Heading>
            {result.verdict === 'match'
              ? `✓ ${t('billCheck.match')}`
              : `⚠ ${t(`billCheck.${result.verdict}`, { gap: f.money(Math.abs(result.gap)) })}`}
          </Heading>
          {result.causes.length ? (
            <>
              <Body>{t('billCheck.causes')}</Body>
              {result.causes.map((c) => (
                <Body
                  key={c}
                  muted
                >{`• ${t(`billCheck.cause${c[0]!.toUpperCase()}${c.slice(1)}`)}`}</Body>
              ))}
              <Caption>{t('billCheck.reportHint')}</Caption>
            </>
          ) : null}
        </Card>
      ) : null}
      <Caption>{t('common.unofficial')}</Caption>
    </Screen>
  );
}
