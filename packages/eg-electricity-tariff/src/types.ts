/** Integer number of piasters (1 EGP = 100 piasters). */
export type Piasters = number;

export type Confidence = 'high' | 'medium' | 'low';

export type MeterType = 'postpaid' | 'prepaid' | 'coded';

/**
 * Customer classes as EgyptERA publishes them (docs/research/tariff-classes.md).
 * Voltage classes: extra-high 220-132 kV, high 66-33 kV, medium 22-11 kV, low 380 V.
 */
export const CUSTOMER_CLASSES = [
  'residential',
  'commercial',
  'coded',
  'lowVoltage',
  'mediumVoltage',
  'highVoltage',
  'extraHighVoltage',
  'irrigationLowVoltage',
  'irrigationMediumVoltage',
  'publicLighting',
] as const;

export type CustomerClass = (typeof CUSTOMER_CLASSES)[number];

export interface Tier {
  /** Official tier number (1-7 for homes), as printed on bills and in the news; 0 = untiered. */
  tier: number;
  /** Upper bound in kWh (inclusive) within the band; null = unbounded. */
  upTo: number | null;
  /** Piasters per kWh, at most 2 decimals. */
  rate: number;
}

/** Every kWh of the month is priced from zero through the band's tiers. */
export interface ProgressiveBand {
  upTo: number | null;
  mode: 'progressive';
  tiers: Tier[];
}

/** Every kWh of the month is priced at one rate. */
export interface FlatBand {
  upTo: number | null;
  mode: 'flat';
  tier: number;
  rate: number;
}

export type Band = ProgressiveBand | FlatBand;

export interface FeeStep {
  upTo: number | null;
  fee: Piasters;
}

/** Government stamps that apply per kWh to some classes (Law 111/1980, Art. 96). */
export interface Stamps {
  /** Piasters per kWh (commercial and lighting uses: 3). */
  perKWh?: number;
  /** Piasters per 10 kWh (industrial, non-lighting uses: 0.6). */
  per10KWh?: number;
}

export interface ClassTariff {
  /** Ordered by upTo; the month's total kWh selects the first band with kWh <= upTo. */
  bands: Band[];
  serviceFees: FeeStep[];
  /** Fee for a meter read at zero or a closed account (omitted = the first fee step). */
  zeroReadFee?: Piasters;
  stamps?: Stamps;
  confidence: Confidence;
}

export interface TariffVersion {
  id: string;
  /** First consumption month this version applies to, 'YYYY-MM'. */
  validFrom: string;
  /** Confidence of the version as a whole (its least certain class shown per bill). */
  confidence: Confidence;
  classes: Partial<Record<CustomerClass, ClassTariff>>;
  sources: string[];
}

export interface TariffFile {
  schemaVersion: 2;
  updated: string;
  currency: 'EGP';
  notes?: string[];
  versions: TariffVersion[];
}

export interface BillLine {
  tier: number;
  /** First kWh of this line (1-based, inclusive). */
  fromKWh: number;
  /** Last kWh of this line (inclusive). */
  toKWh: number;
  kWh: number;
  rate: number;
  amount: Piasters;
}

export interface Bill {
  versionId: string;
  customerClass: CustomerClass;
  meterType: MeterType;
  kWh: number;
  /** Index into the class's bands, or -1 for zero reads. */
  bandIndex: number;
  lines: BillLine[];
  energy: Piasters;
  serviceFee: Piasters;
  /** Consumption stamp (commercial/lighting per kWh, industrial per 10 kWh). */
  stamps: Piasters;
  total: Piasters;
  confidence: Confidence;
}
