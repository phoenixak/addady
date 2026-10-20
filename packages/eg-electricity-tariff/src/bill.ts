import type {
  Band,
  Bill,
  BillLine,
  FeeStep,
  MeterType,
  Piasters,
  TariffFile,
  TariffVersion,
} from './types';

/** kWh x rate (piasters, <= 2 decimals) in integer piasters, rounding half up once per line. */
function lineAmount(kWh: number, rate: number): Piasters {
  const centiPiasters = kWh * Math.round(rate * 100);
  return Math.floor((centiPiasters + 50) / 100);
}

function assertKWh(kWh: number): void {
  if (!Number.isSafeInteger(kWh) || kWh < 0) {
    throw new RangeError(`kWh must be a non-negative integer, got ${kWh}`);
  }
}

function within(upTo: number | null, kWh: number): boolean {
  return upTo === null || kWh <= upTo;
}

/** The band that prices a month with this total consumption. */
export function bandFor(version: TariffVersion, kWh: number): { band: Band; index: number } {
  assertKWh(kWh);
  const bands = version.residential.bands;
  const index = bands.findIndex((b) => within(b.upTo, kWh));
  // parseTariffFile guarantees the last band is unbounded, so index is never -1.
  return { band: bands[index]!, index };
}

function feeFor(steps: FeeStep[], kWh: number): Piasters {
  return steps.find((s) => within(s.upTo, kWh))!.fee;
}

function residentialLines(band: Band, kWh: number): BillLine[] {
  if (band.mode === 'flat') {
    return [
      {
        tier: band.tier,
        fromKWh: 1,
        toKWh: kWh,
        kWh,
        rate: band.rate,
        amount: lineAmount(kWh, band.rate),
      },
    ];
  }
  const lines: BillLine[] = [];
  let done = 0;
  for (const t of band.tiers) {
    if (done >= kWh) break;
    const top = t.upTo === null ? kWh : Math.min(t.upTo, kWh);
    const n = top - done;
    lines.push({
      tier: t.tier,
      fromKWh: done + 1,
      toKWh: top,
      kWh: n,
      rate: t.rate,
      amount: lineAmount(n, t.rate),
    });
    done = top;
  }
  return lines;
}

export interface BillOptions {
  meterType?: MeterType;
}

/**
 * The expected bill for one month's total consumption under one tariff version.
 * Prepaid meters use the residential tiers within the meter's own month.
 */
export function bill(version: TariffVersion, kWh: number, options: BillOptions = {}): Bill {
  assertKWh(kWh);
  const meterType = options.meterType ?? 'postpaid';
  const { residential } = version;

  if (meterType === 'coded') {
    if (!version.coded) throw new Error(`tariff ${version.id} has no coded-meter rate`);
    const lines =
      kWh === 0
        ? []
        : [
            {
              tier: 0,
              fromKWh: 1,
              toKWh: kWh,
              kWh,
              rate: version.coded.rate,
              amount: lineAmount(kWh, version.coded.rate),
            },
          ];
    const energy = lines.reduce((s, l) => s + l.amount, 0);
    // No separate coded-meter fee is published; the residential schedule is the best estimate (low confidence).
    const serviceFee = feeFor(residential.serviceFees, kWh);
    return {
      versionId: version.id,
      meterType,
      kWh,
      bandIndex: -1,
      lines,
      energy,
      serviceFee,
      total: energy + serviceFee,
      confidence: 'low',
    };
  }

  if (kWh === 0) {
    const serviceFee = residential.zeroReadFee;
    return {
      versionId: version.id,
      meterType,
      kWh,
      bandIndex: -1,
      lines: [],
      energy: 0,
      serviceFee,
      total: serviceFee,
      confidence: version.confidence,
    };
  }

  const { band, index } = bandFor(version, kWh);
  const lines = residentialLines(band, kWh);
  const energy = lines.reduce((s, l) => s + l.amount, 0);
  const serviceFee = feeFor(residential.serviceFees, kWh);
  return {
    versionId: version.id,
    meterType,
    kWh,
    bandIndex: index,
    lines,
    energy,
    serviceFee,
    total: energy + serviceFee,
    confidence: version.confidence,
  };
}

/** The version that applies to a consumption month ('YYYY-MM'). */
export function versionFor(file: TariffFile, month: string): TariffVersion {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new RangeError(`month must be 'YYYY-MM', got ${month}`);
  const candidates = file.versions.filter((v) => v.validFrom <= month);
  const version = candidates[candidates.length - 1];
  if (!version) throw new RangeError(`no tariff version covers ${month}`);
  return version;
}

export function versionById(file: TariffFile, id: string): TariffVersion {
  const version = file.versions.find((v) => v.id === id);
  if (!version) throw new RangeError(`unknown tariff version ${id}`);
  return version;
}

export interface Cliff {
  /** Last kWh of the cheaper band. */
  atKWh: number;
  totalBefore: Piasters;
  totalAfter: Piasters;
  /** How much the bill jumps when the month reaches atKWh + 1. */
  jump: Piasters;
}

/** Band boundaries where one more kWh moves the whole month into a different pricing rule. */
export function cliffs(version: TariffVersion, options: BillOptions = {}): Cliff[] {
  return version.residential.bands
    .filter((b): b is Band & { upTo: number } => b.upTo !== null)
    .map((b) => {
      const totalBefore = bill(version, b.upTo, options).total;
      const totalAfter = bill(version, b.upTo + 1, options).total;
      return { atKWh: b.upTo, totalBefore, totalAfter, jump: totalAfter - totalBefore };
    });
}

/** The next cliff above the current consumption, or null if there is none. */
export function nextCliff(
  version: TariffVersion,
  kWh: number,
  options: BillOptions = {},
): Cliff | null {
  assertKWh(kWh);
  return cliffs(version, options).find((c) => c.atKWh >= kWh) ?? null;
}
