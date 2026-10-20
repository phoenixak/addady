// Stored appliance -> daily kWh estimate, and what-if savings priced with the real tariff.
import {
  airConditioner,
  electronics,
  fridge,
  lighting,
  motor,
  perCycle,
  resistive,
  waterHeater,
  type Estimate,
} from '@addady/energy-model';
import { bill, type MeterType, type TariffVersion } from 'eg-electricity-tariff';

import type { ApplianceRow } from '../db/schema';

export type ApplianceKind = ApplianceRow['kind'];
export type Season = 'summer' | 'winter';

type Params = Record<string, number | boolean | string>;

const num = (p: Params, key: string): number | undefined =>
  typeof p[key] === 'number' ? (p[key] as number) : undefined;

/** Typical outdoor afternoon temperature used for AC runtime until weather data exists (v2). */
const OUTDOOR_C: Record<Season, number> = { summer: 35, winter: 20 };

/** The numeric fields each appliance form asks for (keys of appliances.fields.* in ar.json). */
export const FORM_FIELDS: Record<ApplianceKind, string[]> = {
  ac: ['hp', 'watts', 'hoursPerDay', 'setpoint'],
  fridge: ['kWhPerYear', 'watts'],
  waterHeater: ['tankLitres', 'litresPerDay', 'hoursOn'],
  resistive: ['watts', 'hoursPerDay'],
  motor: ['watts', 'hp', 'hoursPerDay'],
  washer: ['kWhPerCycle', 'cyclesPerWeek'],
  lighting: ['count', 'watts', 'hoursPerDay'],
  electronics: ['watts', 'standbyWatts', 'hoursPerDay'],
};

/** Daily kWh for one appliance, or null when the form values can't produce an estimate. */
export function estimateAppliance(kind: ApplianceKind, p: Params, season: Season): Estimate | null {
  try {
    switch (kind) {
      case 'ac':
        if (season === 'winter') return { kWhPerDay: 0, confidence: 'default', assumptions: [] };
        return airConditioner({
          inputWatts: num(p, 'watts'),
          hp: num(p, 'hp'),
          inverter: p.inverter === true,
          hoursPerDay: num(p, 'hoursPerDay') ?? 0,
          setpointC: num(p, 'setpoint') ?? 24,
          outdoorC: OUTDOOR_C[season],
        });
      case 'fridge':
        return fridge({
          kWhPerYear: num(p, 'kWhPerYear'),
          watts: num(p, 'watts'),
          summer: season === 'summer',
        });
      case 'waterHeater':
        return waterHeater({
          tankLitres: num(p, 'tankLitres') ?? 50,
          litresPerDay: num(p, 'litresPerDay') ?? 60,
          setpointC: 60,
          season,
          hoursOnPerDay: num(p, 'hoursOn') ?? 24,
        });
      case 'resistive':
        return resistive({ watts: num(p, 'watts'), hoursPerDay: num(p, 'hoursPerDay') ?? 0 });
      case 'motor':
        return motor({
          watts: num(p, 'watts'),
          hp: num(p, 'hp'),
          hoursPerDay: num(p, 'hoursPerDay') ?? 0,
        });
      case 'washer':
        return perCycle({
          kWhPerCycle: num(p, 'kWhPerCycle') ?? 1,
          cyclesPerWeek: num(p, 'cyclesPerWeek') ?? 0,
        });
      case 'lighting':
        return lighting({
          count: num(p, 'count') ?? 0,
          watts: num(p, 'watts') ?? 0,
          hoursPerDay: num(p, 'hoursPerDay') ?? 0,
        });
      case 'electronics':
        return electronics({
          onWatts: num(p, 'watts') ?? 0,
          standbyWatts: num(p, 'standbyWatts') ?? 0,
          hoursOnPerDay: num(p, 'hoursPerDay') ?? 0,
        });
    }
  } catch {
    return null;
  }
}

/** Summer = May-October in Egypt (AC season). Month is 1-12. */
export const seasonOf = (month: number): Season =>
  month >= 5 && month <= 10 ? 'summer' : 'winter';

export interface Saving {
  kWhPerMonth: number;
  piastersPerMonth: number;
  /** The change moves the month into a cheaper pricing band. */
  cheaperBand: boolean;
}

/** Saving `kWhPerDay` from a month projected at `monthKWh`, priced with the real tariff. */
export function priceSaving(
  version: TariffVersion,
  monthKWh: number,
  kWhPerDay: number,
  days: number,
  meterType: MeterType,
): Saving {
  const saved = Math.max(0, kWhPerDay * days);
  const before = bill(version, Math.round(monthKWh), { meterType });
  const after = bill(version, Math.max(0, Math.round(monthKWh - saved)), { meterType });
  return {
    kWhPerMonth: saved,
    piastersPerMonth: before.total - after.total,
    cheaperBand:
      after.bandIndex >= 0 && before.bandIndex >= 0 && after.bandIndex < before.bandIndex,
  };
}
