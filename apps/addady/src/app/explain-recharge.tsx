// "ليه رصيدي اتخصم؟": what the published rules explain, and what to ask the company about.
import { router } from 'expo-router';
import { useState } from 'react';
import { consumptionMonth, meterMonthStart } from '@addady/energy-model';
import { versionFor } from 'eg-electricity-tariff';

import { billOptions } from '../domain/place';
import { explainRecharge, type RechargeExplanation } from '../domain/rechargeExplain';
import { t } from '../i18n';
import { useFormat } from '../settings';
import { useHomeData } from '../state';
import {
  Banner,
  Body,
  Button,
  Caption,
  Card,
  Field,
  Heading,
  Screen,
  Segmented,
  Stat,
  parseNumber,
  parsePiasters,
} from '../ui';

export default function ExplainRecharge() {
  const { home, status, tariffs, now } = useHomeData();
  const f = useFormat();
  const typical = status ? Math.round(status.model.meanPerDay * 30) : 0;
  const [paid, setPaid] = useState('');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [months, setMonths] = useState(1);
  const [grace, setGrace] = useState<'yes' | 'no'>('no');
  const [monthKWh, setMonthKWh] = useState(typical > 0 ? String(typical) : '150');
  const [result, setResult] = useState<RechargeExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const p = parsePiasters(paid);
    const b = before.trim() === '' ? 0 : parsePiasters(before);
    const a = parsePiasters(after);
    const k = parseNumber(monthKWh);
    if (p === null || p <= 0 || b === null || a === null || k === null) {
      setError(t('common.invalidNumber'));
      return;
    }
    const month = consumptionMonth(meterMonthStart(now, home?.meterMonthStartDay ?? 1));
    setResult(
      explainRecharge({
        version: versionFor(tariffs, month),
        options: home ? billOptions(home) : { meterType: 'prepaid' },
        paid: p,
        balanceBefore: b,
        balanceAfter: a,
        months,
        typicalMonthKWh: k,
        usedGrace: grace === 'yes',
      }),
    );
    setError(null);
  };

  return (
    <Screen>
      <Body muted>{t('explain.intro')}</Body>
      <Field
        label={t('explain.paid')}
        unit={t('common.egp')}
        big
        value={paid}
        onChangeText={setPaid}
        keyboardType="decimal-pad"
      />
      <Field
        label={t('explain.before')}
        hint={t('explain.beforeHint')}
        unit={t('common.egp')}
        value={before}
        onChangeText={setBefore}
        keyboardType="decimal-pad"
      />
      <Field
        label={t('explain.after')}
        hint={t('explain.afterHint')}
        unit={t('common.egp')}
        value={after}
        onChangeText={setAfter}
        keyboardType="decimal-pad"
      />
      <Body>{t('explain.months')}</Body>
      <Segmented
        value={months}
        onChange={setMonths}
        options={[0, 1, 2, 3, 6].map((n) => ({ value: n, label: f.num(n) }))}
      />
      <Body>{t('explain.grace')}</Body>
      <Segmented
        value={grace}
        onChange={setGrace}
        options={[
          { value: 'yes', label: t('common.yes') },
          { value: 'no', label: t('common.no') },
        ]}
      />
      <Field
        label={t('explain.monthKWh')}
        hint={t('explain.monthKWhHint')}
        unit={t('common.kwh')}
        value={monthKWh}
        onChangeText={setMonthKWh}
        keyboardType="number-pad"
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button icon="calculator-variant" label={t('explain.run')} onPress={run} />

      {result ? (
        <Card tone={result.verdict === 'none' || result.verdict === 'fees' ? 'ok' : 'warn'}>
          <Stat label={t('explain.deducted')} value={f.money(result.deducted)} />
          <Heading>{t(`explain.verdict.${result.verdict}`)}</Heading>
          {result.serviceFees > 0 ? (
            <Body>
              {t('explain.feesLine', {
                n: f.num(Math.round(result.serviceFees / result.serviceFeePerMonth)),
                fee: f.money(result.serviceFeePerMonth),
                total: f.money(result.serviceFees),
              })}
            </Body>
          ) : null}
          {result.causes.length > 0 ? (
            <>
              <Body>{t('explain.unexplained', { amount: f.money(result.unexplained) })}</Body>
              {result.causes.map((c) => (
                <Body key={c} muted>{`• ${t(`explain.cause.${c}`)}`}</Body>
              ))}
              <Body>{t('explain.askStatement')}</Body>
              <Button
                kind="secondary"
                icon="scale-balance"
                label={t('explain.rights')}
                onPress={() =>
                  router.push({ pathname: '/rights/[id]', params: { id: 'prepaid-deductions' } })
                }
              />
            </>
          ) : null}
        </Card>
      ) : null}
      <Caption>{t('common.unofficial')}</Caption>
    </Screen>
  );
}
