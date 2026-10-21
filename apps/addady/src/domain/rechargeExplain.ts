// "ليه رصيدي اتخصم؟" (pain point #1, docs/research/voices.md): splits the money that didn't reach
// the meter into what the published rules explain (monthly service fees) and what only the
// distribution company's statement can itemise (grace debt, tier differences, price differences,
// instalments). It never claims more certainty than that.
import { bill, type BillOptions, type Piasters, type TariffVersion } from 'eg-electricity-tariff';

export type DeductionCause = 'grace' | 'tierDifference' | 'priceDifference' | 'instalments';

export interface RechargeExplanation {
  /** Paid minus the credit that reached the meter (piasters, >= 0). */
  deducted: Piasters;
  /** Service fees for the months since the last recharge, as far as they fit in `deducted`. */
  serviceFees: Piasters;
  serviceFeePerMonth: Piasters;
  /** What the published fees don't explain. */
  unexplained: Piasters;
  /** Likely causes of the unexplained part, most likely first. */
  causes: DeductionCause[];
  verdict: 'none' | 'fees' | 'partly' | 'unexplained';
}

/** Differences up to 2 EGP are rounding or small fees. */
const SMALL = 200;

export function explainRecharge(input: {
  version: TariffVersion;
  options: BillOptions;
  paid: Piasters;
  balanceBefore: Piasters;
  balanceAfter: Piasters;
  /** Meter months since the previous recharge (each one owes a service fee). */
  months: number;
  /** Typical kWh per month: the service fee depends on the consumption band. */
  typicalMonthKWh: number;
  /** The balance reached zero and the meter kept supplying (grace hours, Fridays, holidays). */
  usedGrace: boolean;
}): RechargeExplanation {
  const credited = input.balanceAfter - input.balanceBefore;
  const deducted = Math.max(0, input.paid - credited);
  const serviceFeePerMonth = bill(
    input.version,
    Math.max(1, Math.round(input.typicalMonthKWh)),
    input.options,
  ).serviceFee;
  const serviceFees = Math.min(
    deducted,
    Math.max(0, Math.round(input.months)) * serviceFeePerMonth,
  );
  const unexplained = deducted - serviceFees;

  const causes: DeductionCause[] = [];
  if (unexplained > SMALL) {
    if (input.usedGrace || input.balanceBefore <= 0) causes.push('grace');
    causes.push('tierDifference', 'priceDifference', 'instalments');
  }
  const verdict =
    deducted <= SMALL
      ? 'none'
      : unexplained <= SMALL
        ? 'fees'
        : serviceFees > 0
          ? 'partly'
          : 'unexplained';
  return { deducted, serviceFees, serviceFeePerMonth, unexplained, causes, verdict };
}
