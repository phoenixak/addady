// Validation for one anonymous monthly contribution. Dependency-free so it runs in Deno (the
// Edge Function) and in vitest. Mirrors the CHECK constraints in the v2 migration: the database
// is the final authority, this gives clean 400s and a strict allow-list of fields.

export const GOVERNORATES = [
  'cairo',
  'giza',
  'alexandria',
  'qalyubia',
  'sharqia',
  'dakahlia',
  'beheira',
  'kafrElSheikh',
  'gharbia',
  'monufia',
  'damietta',
  'portSaid',
  'ismailia',
  'suez',
  'northSinai',
  'southSinai',
  'redSea',
  'faiyum',
  'beniSuef',
  'minya',
  'asyut',
  'sohag',
  'qena',
  'luxor',
  'aswan',
  'newValley',
  'matrouh',
] as const;

const METER_TYPES = ['postpaid', 'prepaid', 'coded'] as const;
const HOUSEHOLD_SIZES = ['1', '2', '3-4', '5-6', '7+'] as const;
const DWELLINGS = ['apartment', 'house', 'rural'] as const;

export interface Contribution {
  month: string;
  governorate: (typeof GOVERNORATES)[number];
  meter_type: (typeof METER_TYPES)[number];
  tariff_version: string;
  kwh: number;
  bill_piasters: number | null;
  household_size: (typeof HOUSEHOLD_SIZES)[number];
  ac_count: number;
  electric_water_heater: boolean;
  dwelling: (typeof DWELLINGS)[number];
}

const ALLOWED_KEYS = new Set([
  'month',
  'governorate',
  'meterType',
  'tariffVersion',
  'kWh',
  'billPiasters',
  'householdSize',
  'acCount',
  'electricWaterHeater',
  'dwelling',
]);

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const oneOf = <T extends string>(v: unknown, list: readonly T[]): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

/** Returns the row to insert, or null if anything is missing, extra, or out of range. */
export function validateContribution(body: unknown, today: Date = new Date()): Contribution | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  // Unknown fields are rejected outright, so a client can never smuggle extra data in.
  if (Object.keys(b).some((k) => !ALLOWED_KEYS.has(k))) return null;

  const month = b.month;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  // Only completed months, no older than 24 months.
  const current = today.toISOString().slice(0, 7);
  const [y, m] = month.split('-').map(Number) as [number, number];
  const ageMonths = (today.getUTCFullYear() - y) * 12 + (today.getUTCMonth() + 1 - m);
  if (month >= current || ageMonths > 24) return null;

  if (!oneOf(b.governorate, GOVERNORATES)) return null;
  if (!oneOf(b.meterType, METER_TYPES)) return null;
  if (typeof b.tariffVersion !== 'string' || !/^\d{4}-\d{2}$/.test(b.tariffVersion)) return null;
  if (!isInt(b.kWh, 0, 10_000)) return null;
  const bill = b.billPiasters ?? null;
  if (bill !== null && !isInt(bill, 0, 5_000_000)) return null;
  if (!oneOf(b.householdSize, HOUSEHOLD_SIZES)) return null;
  if (!isInt(b.acCount, 0, 10)) return null;
  if (typeof b.electricWaterHeater !== 'boolean') return null;
  if (!oneOf(b.dwelling, DWELLINGS)) return null;

  return {
    month,
    governorate: b.governorate,
    meter_type: b.meterType,
    tariff_version: b.tariffVersion,
    kwh: b.kWh,
    bill_piasters: bill,
    household_size: b.householdSize,
    ac_count: b.acCount,
    electric_water_heater: b.electricWaterHeater,
    dwelling: b.dwelling,
  };
}
