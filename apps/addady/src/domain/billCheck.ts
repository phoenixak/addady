// Bill checker: what a bill for N kWh should be, line by line, and why a printed bill may differ.
import {
  bill,
  versionFor,
  type Bill,
  type CustomerClass,
  type MeterType,
  type TariffFile,
} from 'eg-electricity-tariff';

export type GapCause = 'estimated' | 'month' | 'other' | 'coded';

export interface BillCheck {
  expected: Bill;
  otherCharges: number;
  expectedTotal: number;
  /** Printed amount minus expected (piasters); positive = billed more than expected. */
  gap: number;
  verdict: 'match' | 'higher' | 'lower';
  causes: GapCause[];
}

/** Differences up to 2 EGP are treated as rounding / small fees (docs/PLAN.md §11, feature 7). */
export const MATCH_TOLERANCE = 200;

export function checkBill(input: {
  tariffs: TariffFile;
  month: string;
  kWh: number;
  billedPiasters: number;
  meterType: MeterType;
  customerClass?: CustomerClass;
  otherChargesPiasters: number;
}): BillCheck {
  const version = versionFor(input.tariffs, input.month);
  const customerClass = input.customerClass ?? 'residential';
  const expected = bill(version, Math.round(input.kWh), {
    customerClass,
    meterType: input.meterType,
  });
  const expectedTotal = expected.total + input.otherChargesPiasters;
  const gap = input.billedPiasters - expectedTotal;
  const verdict = Math.abs(gap) <= MATCH_TOLERANCE ? 'match' : gap > 0 ? 'higher' : 'lower';
  const causes: GapCause[] = [];
  if (verdict !== 'match') {
    causes.push('estimated', 'month');
    if (gap > 0) causes.push('other');
    if (customerClass === 'residential' && input.meterType !== 'coded' && gap > 0) {
      // A coded meter bills every kWh at the flat rate: check whether that explains the gap.
      const coded = version.classes.coded
        ? bill(version, Math.round(input.kWh), { meterType: 'coded' }).total
        : null;
      if (
        coded !== null &&
        Math.abs(input.billedPiasters - coded - input.otherChargesPiasters) <= MATCH_TOLERANCE
      )
        causes.unshift('coded');
    }
  }
  return {
    expected,
    otherCharges: input.otherChargesPiasters,
    expectedTotal,
    gap,
    verdict,
    causes,
  };
}
