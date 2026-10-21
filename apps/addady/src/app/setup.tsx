// "مين إنت؟": three short steps (docs/research/ux.md). 1) what kind of place, 2) how it is priced
// and metered, 3) where and when the meter month starts.
import { router } from 'expo-router';
import { useState } from 'react';
import type { CustomerClass, MeterType } from 'eg-electricity-tariff';

import type { PlaceKind } from '../db/schema';
import { createHome } from '../db/repo';
import { PLACE_ICONS, PLACE_PROFILES } from '../domain/place';
import { GOVERNORATES, t, type Governorate } from '../i18n';
import { useFormat } from '../settings';
import {
  Body,
  Button,
  Caption,
  Card,
  Choice,
  Field,
  Heading,
  Row,
  Screen,
  Title,
  parseNumber,
  parsePiasters,
  useToast,
} from '../ui';

const KINDS: PlaceKind[] = ['home', 'shop', 'office', 'factory', 'farm'];

export default function Setup() {
  const toast = useToast();
  const f = useFormat();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<PlaceKind>('home');
  const profile = PLACE_PROFILES[kind];
  const [customerClass, setCustomerClass] = useState<CustomerClass>('residential');
  const [meterType, setMeterType] = useState<MeterType>('prepaid');
  const [name, setName] = useState(t('places.home.defaultName'));
  const [governorate, setGovernorate] = useState<Governorate>('cairo');
  const [startDay, setStartDay] = useState('1');
  const [load, setLoad] = useState('');
  const [lowBalance, setLowBalance] = useState('50');
  const [showAllGovs, setShowAllGovs] = useState(false);

  const chooseKind = (k: PlaceKind) => {
    setKind(k);
    setCustomerClass(PLACE_PROFILES[k].classes[0]!);
    setMeterType(PLACE_PROFILES[k].meterTypes[0]!);
    setName(t(`places.${k}.defaultName`));
  };

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
      name: name.trim() || t(`places.${kind}.defaultName`),
      kind,
      customerClass,
      meterType,
      governorate,
      meterMonthStartDay: day!,
      contractedLoadKW: loadValue,
      lowBalancePiasters: meterType === 'prepaid' ? parsePiasters(lowBalance) : null,
    });
    toast(t('setup.saved'));
    router.replace('/');
  };

  const govOptions = (showAllGovs ? GOVERNORATES : GOVERNORATES.slice(0, 6)).map((g) => ({
    value: g,
    label: t(`governorates.${g}`),
  }));
  if (!showAllGovs && !GOVERNORATES.slice(0, 6).includes(governorate))
    govOptions.push({ value: governorate, label: t(`governorates.${governorate}`) });

  const progress = <Caption>{t('setup.step', { n: f.num(step + 1), of: f.num(3) })}</Caption>;

  if (step === 0) {
    return (
      <Screen>
        <Title>{t('setup.whoTitle')}</Title>
        <Body muted>{t('setup.whoIntro')}</Body>
        {progress}
        <Choice
          value={kind}
          onChange={chooseKind}
          options={KINDS.map((k) => ({
            value: k,
            label: t(`places.${k}.label`),
            hint: t(`places.${k}.hint`),
            icon: PLACE_ICONS[k],
          }))}
        />
        <Button icon="arrow-left" label={t('common.next')} onPress={() => setStep(1)} />
        <Caption>{t('common.dataStaysOnPhone')}</Caption>
        <Caption>{t('common.unofficial')}</Caption>
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen>
        <Title>{t(`places.${kind}.label`)}</Title>
        {progress}
        <Field label={t('setup.placeName')} value={name} onChangeText={setName} />
        {profile.classes.length > 1 ? (
          <>
            <Heading>{t(`setup.classQuestion.${kind}`)}</Heading>
            <Choice
              value={customerClass}
              onChange={setCustomerClass}
              options={profile.classes.map((c) => ({
                value: c,
                label: t(`classPlain.${c}`),
                hint: t(`classPlain.${c}Hint`),
              }))}
            />
          </>
        ) : null}
        {profile.meterTypes.length > 1 ? (
          <>
            <Heading>{t('setup.meterType')}</Heading>
            <Choice
              value={meterType}
              onChange={setMeterType}
              options={profile.meterTypes.map((m) => ({
                value: m,
                label: t(`meterTypes.${m}`),
                hint: t(`meterTypes.${m}Hint`),
              }))}
            />
          </>
        ) : null}
        <Row>
          <Button kind="secondary" label={t('common.back')} onPress={() => setStep(0)} />
          <Button icon="arrow-left" label={t('common.next')} onPress={() => setStep(2)} />
        </Row>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{t('setup.whereTitle')}</Title>
      {progress}
      <Heading>{t('setup.governorate')}</Heading>
      <Choice value={governorate} onChange={setGovernorate} options={govOptions} />
      {!showAllGovs ? (
        <Button
          kind="secondary"
          label={t('setup.moreGovernorates')}
          onPress={() => setShowAllGovs(true)}
        />
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
            unit={t('common.egp')}
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

      <Row>
        <Button kind="secondary" label={t('common.back')} onPress={() => setStep(1)} />
        <Button
          icon="check"
          label={t('setup.start')}
          onPress={save}
          disabled={!!dayError || !!loadError}
        />
      </Row>
      <Caption>{t('common.dataStaysOnPhone')}</Caption>
    </Screen>
  );
}
