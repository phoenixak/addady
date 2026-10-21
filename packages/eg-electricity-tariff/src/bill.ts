import type {
  Band,
  Bill,
  BillLine,
  ClassTariff,
  Confidence,
  CustomerClass,
  FeeStep,
  MeterType,
  Piasters,
  Stamps,
  TariffFile,
  TariffVersion,
} from './types';

/** kWh x rate (piasters, <= 2 decimals) in integer piasters, rounding half up once per line. */
function lineAmount(kWh: number, rate: number): Piasters {
  const centiPiasters = kWh * Math.round(rate * 100);
  return Math.floor((centiPiasters + 50) / 100);
}

/** Consumption stamp in integer piasters, rounded half up once. */
function stampAmount(stamps: Stamps | undefined, kWh: number): Piasters {
  if (!stamps) return 0;
  // Thousandths of a piaster: perKWh per kWh, per10KWh per 10 kWh.
  const milli =
    kWh * Math.round((stamps.perKWh ?? 0) * 100) * 10 +
    kWh * Math.round((stamps.per10KWh ?? 0) * 100);
  return Math.floor((milli + 500) / 1000);
}

function assertKWh(kWh: number): void {
  if (!Number.isSafeInteger(kWh) || kWh < 0) {
    throw new RangeError(`kWh must be a non-negative integer, got ${kWh}`);
  }
}

function within(upTo: number | null, kWh: number): boolean {
  return upTo === null || kWh <= upTo;
}

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

function lowest(a: Confidence, b: Confidence): Confidence {
  return RANK[a] <= RANK[b] ? a : b;
}

export interface BillOptions {
  /** Default 'residential'; a 'coded' meter type always uses the coded class. */
  customerClass?: CustomerClass;
  meterType?: MeterType;
}

function resolveClass(options: BillOptions): CustomerClass {
  if (options.meterType === 'coded') return 'coded';
  return options.customerClass ?? 'residential';
}

/** The prices for one customer class, or an error if the version doesn't publish them. */
export function classTariff(version: TariffVersion, customerClass: CustomerClass): ClassTariff {
  const tariff = version.classes[customerClass];
  if (!tariff) throw new Error(`tariff ${version.id} has no ${customerClass} prices`);
  return tariff;
}

/** The band that prices a month with this total consumption. */
export function bandFor(
  version: TariffVersion,
  kWh: number,
  options: BillOptions = {},
): { band: Band; index: number } {
  assertKWh(kWh);
  const { bands } = classTariff(version, resolveClass(options));
  const index = bands.findIndex((b) => within(b.upTo, kWh));
  // parseTariffFile guarantees the last band is unbounded, so index is never -1.
  return { band: bands[index]!, index };
}

function feeFor(steps: FeeStep[], kWh: number): Piasters {
  return steps.find((s) => within(s.upTo, kWh))!.fee;
}

function bandLines(band: Band, kWh: number): BillLine[] {
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

/**
 * The expected bill for one month's total consumption under one tariff version.
 * Prepaid meters use the same prices within the meter's own month.
 */
export function bill(version: TariffVersion, kWh: number, options: BillOptions = {}): Bill {
  assertKWh(kWh);
  const customerClass = resolveClass(options);
  const tariff = classTariff(version, customerClass);
  const meterType = options.meterType ?? (customerClass === 'coded' ? 'coded' : 'postpaid');
  const confidence = lowest(version.confidence, tariff.confidence);

  if (kWh === 0) {
    const serviceFee = tariff.zeroReadFee ?? tariff.serviceFees[0]!.fee;
    return {
      versionId: version.id,
      customerClass,
      meterType,
      kWh,
      bandIndex: -1,
      lines: [],
      energy: 0,
      serviceFee,
      stamps: 0,
      total: serviceFee,
      confidence,
    };
  }

  const { band, index } = bandFor(version, kWh, { customerClass });
  const lines = bandLines(band, kWh);
  const energy = lines.reduce((s, l) => s + l.amount, 0);
  const serviceFee = feeFor(tariff.serviceFees, kWh);
  const stamps = stampAmount(tariff.stamps, kWh);
  return {
    versionId: version.id,
    customerClass,
    meterType,
    kWh,
    bandIndex: index,
    lines,
    energy,
    serviceFee,
    stamps,
    total: energy + serviceFee + stamps,
    confidence,
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
  return classTariff(version, resolveClass(options))
    .bands.filter((b): b is Band & { upTo: number } => b.upTo !== null)
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
