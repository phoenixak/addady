import { router } from 'expo-router';
import { useState } from 'react';

import { addRecharge } from '../db/repo';
import { t } from '../i18n';
import { useCurrentHome } from '../state';
import { Body, Button, Field, Screen, parsePiasters, useToast } from '../ui';

export default function Recharge() {
  const toast = useToast();
  const { home } = useCurrentHome();
  const [amount, setAmount] = useState('');
  if (!home) return null;
  const piasters = parsePiasters(amount);
  const error =
    amount.trim() !== '' && (piasters === null || piasters <= 0) ? t('common.invalidNumber') : null;

  const save = async () => {
    if (!piasters || error) return;
    await addRecharge({ homeId: home.id, at: Date.now(), amountPiasters: piasters });
    // The new balance comes from the meter screen, so go straight to a reading.
    toast(t('common.saved'));
    router.replace('/reading');
  };

  return (
    <Screen>
      <Field
        label={t('recharge.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        autoFocus
        error={error}
      />
      <Body muted>{t('recharge.hint')}</Body>
      <Button label={t('common.save')} onPress={save} disabled={!piasters || !!error} />
    </Screen>
  );
}
