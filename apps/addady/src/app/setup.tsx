import { router } from 'expo-router';
import { useState } from 'react';

import { createHome } from '../db/repo';
import { GOVERNORATES, t, type Governorate } from '../i18n';
import {
  Body,
  Button,
  Caption,
  Card,
  Choice,
  Field,
  Heading,
  Screen,
  Title,
  parseNumber,
  parsePiasters,
} from '../ui';

type MeterType = 'postpaid' | 'prepaid' | 'coded';

export default function Setup() {
  const [name, setName] = useState(t('setup.homeNameDefault'));
  const [meterType, setMeterType] = useState<MeterType>('prepaid');
  const [governorate, setGovernorate] = useState<Governorate>('cairo');
  const [startDay, setStartDay] = useState('1');
  const [load, setLoad] = useState('');
  const [lowBalance, setLowBalance] = useState('50');
  const [showAllGovs, setShowAllGovs] = useState(false);

  const day = parseNumber(startDay);
  const dayError =
    day === null || !Number.isInteger(day) || day < 1 || day > 28
      ? t('common.invalidNumber')
      : null;
  const loadValue = load.trim() === '' ? null : parseNumber(load);
  const loadError = load.trim() !== '' && loadValue === null ? t('common.invalidNumber') : null;

  const save = async () => {
    if (dayError || loadError) return;
    await createHome({
      name: name.trim() || t('setup.homeNameDefault'),
      meterType,
      governorate,
      meterMonthStartDay: day!,
      contractedLoadKW: loadValue,
      lowBalancePiasters: meterType === 'prepaid' ? parsePiasters(lowBalance) : null,
    });
    router.replace('/');
  };

  const govOptions = (showAllGovs ? GOVERNORATES : GOVERNORATES.slice(0, 6)).map((g) => ({
    value: g,
    label: t(`governorates.${g}`),
  }));
  if (!showAllGovs && !GOVERNORATES.slice(0, 6).includes(governorate))
    govOptions.push({ value: governorate, label: t(`governorates.${governorate}`) });

  return (
    <Screen>
      <Title>{t('app.name')}</Title>
      <Body muted>{t('setup.intro')}</Body>
      <Caption>{t('common.unofficial')}</Caption>

      <Field label={t('setup.homeName')} value={name} onChangeText={setName} />

      <Heading>{t('setup.meterType')}</Heading>
      <Choice
        value={meterType}
        onChange={setMeterType}
        options={(['prepaid', 'postpaid', 'coded'] as const).map((m) => ({
          value: m,
          label: t(`meterTypes.${m}`),
          hint: t(`meterTypes.${m}Hint`),
        }))}
      />

      <Heading>{t('setup.governorate')}</Heading>
      <Choice value={governorate} onChange={setGovernorate} options={govOptions} />
      {!showAllGovs ? (
        <Button kind="secondary" label="…" onPress={() => setShowAllGovs(true)} />
      ) : null}

      <Card>
        <Field
          label={t('setup.monthStartDay')}
          hint={t('setup.monthStartHint')}
          value={startDay}
          onChangeText={setStartDay}
          keyboardType="number-pad"
          error={dayError}
        />
        {meterType === 'prepaid' ? (
          <Field
            label={t('setup.lowBalance')}
            value={lowBalance}
            onChangeText={setLowBalance}
            keyboardType="decimal-pad"
          />
        ) : null}
        <Field
          label={`${t('setup.contractedLoad')} (${t('common.optional')})`}
          hint={t('setup.contractedLoadHint')}
          value={load}
          onChangeText={setLoad}
          keyboardType="decimal-pad"
          error={loadError}
        />
      </Card>

      <Button label={t('setup.start')} onPress={save} disabled={!!dayError || !!loadError} />
      <Caption>{t('common.dataStaysOnPhone')}</Caption>
    </Screen>
  );
}
