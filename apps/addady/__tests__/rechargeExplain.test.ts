import { bundledTariffs, versionById } from 'eg-electricity-tariff';

import { explainRecharge } from '../src/domain/rechargeExplain';

const version = versionById(bundledTariffs, '2026-07');
const base = {
  version,
  options: { meterType: 'prepaid' as const },
  paid: 10_000,
  balanceBefore: 500,
  balanceAfter: 10_500,
  months: 1,
  typicalMonthKWh: 150,
  usedGrace: false,
};

describe('explainRecharge', () => {
  it('nothing deducted when the whole amount reached the meter', () => {
    expect(explainRecharge(base)).toMatchObject({ deducted: 0, verdict: 'none', causes: [] });
  });

  it('service fees explain the gap: 2 months x 6 EGP (101-200 kWh band)', () => {
    const r = explainRecharge({ ...base, months: 2, balanceAfter: 10_500 - 1200 });
    expect(r).toMatchObject({
      deducted: 1200,
      serviceFeePerMonth: 600,
      serviceFees: 1200,
      unexplained: 0,
      verdict: 'fees',
    });
  });

  it('grace debt comes first when the balance had run out', () => {
    const r = explainRecharge({ ...base, balanceBefore: 0, balanceAfter: 6000 });
    expect(r.deducted).toBe(4000);
    expect(r.serviceFees).toBe(600);
    expect(r.unexplained).toBe(3400);
    expect(r.verdict).toBe('partly');
    expect(r.causes[0]).toBe('grace');
  });

  it('without fees owed, the gap is unexplained and grace is only listed if it happened', () => {
    const r = explainRecharge({ ...base, months: 0, balanceAfter: 5500 });
    expect(r.verdict).toBe('unexplained');
    expect(r.causes).toEqual(['tierDifference', 'priceDifference', 'instalments']);
  });

  it('uses the commercial fee schedule for shops', () => {
    const r = explainRecharge({
      ...base,
      options: { customerClass: 'commercial', meterType: 'prepaid' },
      balanceAfter: 9000,
    });
    expect(r.serviceFeePerMonth).toBe(1500); // 101-250 kWh: 15 EGP
  });
});
