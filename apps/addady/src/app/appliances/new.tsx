import { router } from 'expo-router';
import { useState } from 'react';
import { Switch } from 'react-native';

import { addAppliance } from '../../db/repo';
import { FORM_FIELDS, estimateAppliance, type ApplianceKind } from '../../domain/appliances';
import { t } from '../../i18n';
import { useFormat } from '../../settings';
import { useCurrentHome } from '../../state';
import { Body, Button, Card, Choice, Field, Heading, Row, Screen, parseNumber } from '../../ui';

const KINDS: ApplianceKind[] = [
  'ac',
  'fridge',
  'waterHeater',
  'resistive',
  'motor',
  'washer',
  'lighting',
  'electronics',
];

export default function NewAppliance() {
  const { home } = useCurrentHome();
  const f = useFormat();
  const [kind, setKind] = useState<ApplianceKind>('ac');
  const [name, setName] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [inverter, setInverter] = useState(false);
  if (!home) return null;

  const params: Record<string, number | boolean> = { inverter };
  for (const key of FORM_FIELDS[kind]) {
    const n = parseNumber(values[key] ?? '');
    if (n !== null) params[key] = n;
  }
  const summer = estimateAppliance(kind, params, 'summer');

  const save = async () => {
    await addAppliance({
      homeId: home.id,
      kind,
      name: name.trim() || t(`appliances.kinds.${kind}`),
      params,
    });
    router.back();
  };

  return (
    <Screen>
      <Heading>{t('appliances.kind')}</Heading>
      <Choice
        value={kind}
        onChange={(k) => {
          setKind(k);
          setValues({});
        }}
        options={KINDS.map((k) => ({ value: k, label: t(`appliances.kinds.${k}`) }))}
      />
      <Field
        label={t('appliances.name')}
        value={name}
        onChangeText={setName}
        placeholder={t(`appliances.kinds.${kind}`)}
      />
      {FORM_FIELDS[kind].map((key) => (
        <Field
          key={key}
          label={t(`appliances.fields.${key}`)}
          value={values[key] ?? ''}
          onChangeText={(v) => setValues((s) => ({ ...s, [key]: v }))}
          keyboardType="decimal-pad"
          error={
            values[key] && parseNumber(values[key]!) === null ? t('common.invalidNumber') : null
          }
        />
      ))}
      {kind === 'ac' ? (
        <Row>
          <Switch
            value={inverter}
            onValueChange={setInverter}
            accessibilityLabel={t('appliances.fields.inverter')}
          />
          <Body>{t('appliances.fields.inverter')}</Body>
        </Row>
      ) : null}
      {summer ? (
        <Card>
          <Body>{t('appliances.perMonth', { kWh: f.num(summer.kWhPerDay * 30) })}</Body>
          {summer.assumptions.length ? <Body muted>{t('appliances.assumption')}</Body> : null}
        </Card>
      ) : null}
      <Button label={t('common.save')} onPress={save} disabled={!summer} />
    </Screen>
  );
}
