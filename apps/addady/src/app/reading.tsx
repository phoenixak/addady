import { router } from 'expo-router';
import { useState } from 'react';

import { addReading } from '../db/repo';
import { t } from '../i18n';
import { useFormat } from '../settings';
import { useCurrentHome } from '../state';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { queries } from '../db/repo';
import { Body, Button, Card, Field, Screen, parseNumber, parsePiasters, useToast } from '../ui';

export default function AddReading() {
  const toast = useToast();
  const { home } = useCurrentHome();
  const { data: rows } = useLiveQuery(queries.readings(home?.id ?? -1), [home?.id]);
  const f = useFormat();
  const [kWh, setKWh] = useState('');
  const [balance, setBalance] = useState('');
  const [confirmLower, setConfirmLower] = useState(false);
  if (!home) return null;

  const prepaid = home.meterType === 'prepaid';
  const value = parseNumber(kWh);
  const balancePt = balance.trim() === '' ? null : parsePiasters(balance);
  const kWhError = kWh.trim() !== '' && value === null ? t('common.invalidNumber') : null;
  const balanceError =
    balance.trim() !== '' && balancePt === null ? t('common.invalidNumber') : null;
  const nothing = value === null && balancePt === null;

  // Postpaid registers only go up; a lower value is a typo or a replaced meter.
  const last = [...(rows ?? [])].reverse().find((r) => r.registerKWh !== null);
  const lower = !prepaid && value !== null && last?.registerKWh != null && value < last.registerKWh;

  const save = async () => {
    if (nothing || kWhError || balanceError) return;
    if (lower && !confirmLower) {
      setConfirmLower(true);
      return;
    }
    await addReading({
      homeId: home.id,
      at: Date.now(),
      registerKWh: prepaid ? null : value,
      monthKWh: prepaid ? value : null,
      balancePiasters: prepaid ? balancePt : null,
    });
    toast(t('common.saved'));
    router.back();
  };

  return (
    <Screen>
      <Field
        label={prepaid ? t('reading.monthKWh') : t('reading.register')}
        hint={prepaid ? t('reading.monthKWhHint') : t('reading.registerHint')}
        value={kWh}
        onChangeText={(v) => {
          setKWh(v);
          setConfirmLower(false);
        }}
        keyboardType="decimal-pad"
        autoFocus
        error={kWhError}
      />
      {prepaid ? (
        <Field
          label={t('reading.balance')}
          hint={t('reading.balanceHint')}
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          error={balanceError}
        />
      ) : null}
      {confirmLower && last?.registerKWh != null ? (
        <Card tone="warn">
          <Body>{`⚠ ${t('reading.lowerThanLast', { last: f.num(last.registerKWh) })}`}</Body>
        </Card>
      ) : null}
      {nothing && kWh + balance !== '' ? <Body muted>{t('reading.needOne')}</Body> : null}
      <Button
        label={confirmLower ? t('reading.saveAnyway') : t('common.save')}
        onPress={save}
        disabled={nothing || !!kWhError || !!balanceError}
      />
    </Screen>
  );
}
