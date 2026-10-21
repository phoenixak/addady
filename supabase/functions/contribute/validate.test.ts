import { describe, expect, it } from 'vitest';

import { GOVERNORATES, validateContribution } from './validate';

const today = new Date('2026-10-21T12:00:00Z');
const valid = {
  month: '2026-09',
  governorate: 'cairo',
  meterType: 'prepaid',
  tariffVersion: '2026-07',
  kWh: 320,
  billPiasters: 41400,
  householdSize: '3-4',
  acCount: 2,
  electricWaterHeater: true,
  dwelling: 'apartment',
};

describe('validateContribution', () => {
  it('accepts a complete, in-range record and maps it to column names', () => {
    expect(validateContribution(valid, today)).toEqual({
      month: '2026-09',
      governorate: 'cairo',
      meter_type: 'prepaid',
      tariff_version: '2026-07',
      kwh: 320,
      bill_piasters: 41400,
      household_size: '3-4',
      ac_count: 2,
      electric_water_heater: true,
      dwelling: 'apartment',
    });
  });

  it('allows the bill to be omitted', () => {
    const withoutBill: Record<string, unknown> = { ...valid };
    delete withoutBill.billPiasters;
    expect(validateContribution(withoutBill, today)!.bill_piasters).toBeNull();
  });

  it('rejects unknown fields so nothing extra can be smuggled in', () => {
    expect(validateContribution({ ...valid, phone: '+201000000000' }, today)).toBeNull();
    expect(validateContribution({ ...valid, deviceId: 'abc' }, today)).toBeNull();
  });

  it('rejects the current month, future months and months older than 24', () => {
    expect(validateContribution({ ...valid, month: '2026-10' }, today)).toBeNull();
    expect(validateContribution({ ...valid, month: '2027-01' }, today)).toBeNull();
    expect(validateContribution({ ...valid, month: '2024-09' }, today)).toBeNull();
    expect(validateContribution({ ...valid, month: '2024-10' }, today)).not.toBeNull();
  });

  const bad: [string, unknown][] = [
    ['non-object', 'x'],
    ['array', []],
    ['null', null],
    ['bad month', { ...valid, month: '2026-13' }],
    ['month not string', { ...valid, month: 202609 }],
    ['governorate', { ...valid, governorate: 'paris' }],
    ['meter type', { ...valid, meterType: 'solar' }],
    ['tariff version', { ...valid, tariffVersion: 'latest' }],
    ['negative kWh', { ...valid, kWh: -1 }],
    ['fractional kWh', { ...valid, kWh: 1.5 }],
    ['huge kWh', { ...valid, kWh: 20000 }],
    ['bill out of range', { ...valid, billPiasters: -5 }],
    ['household size', { ...valid, householdSize: '4' }],
    ['ac count', { ...valid, acCount: 11 }],
    ['heater not boolean', { ...valid, electricWaterHeater: 'yes' }],
    ['dwelling', { ...valid, dwelling: 'villa' }],
  ];
  for (const [name, body] of bad) {
    it(`rejects ${name}`, () => expect(validateContribution(body, today)).toBeNull());
  }

  it('knows all 27 governorates', () => {
    expect(GOVERNORATES).toHaveLength(27);
  });

  it('defaults "today" to the current date', () => {
    expect(validateContribution({ ...valid, month: '1999-01' })).toBeNull();
  });
});
