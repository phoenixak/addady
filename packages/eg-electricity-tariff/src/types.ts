/** Integer number of piasters (1 EGP = 100 piasters). */
export type Piasters = number;

export type Confidence = 'high' | 'medium' | 'low';

export type MeterType = 'postpaid' | 'prepaid' | 'coded';

export interface Tier {
  /** Official tier number (1-7), as printed on bills and in the news. */
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

export interface ResidentialTariff {
  /** Ordered by upTo; the month's total kWh selects the first band with kWh <= upTo. */
  bands: Band[];
  serviceFees: FeeStep[];
  /** Fee for a meter read at zero or a closed account. */
  zeroReadFee: Piasters;
}

export interface CodedTariff {
  rate: number;
  confidence: Confidence;
}

export interface TariffVersion {
  id: string;
  /** First consumption month this version applies to, 'YYYY-MM'. */
  validFrom: string;
  confidence: Confidence;
  residential: ResidentialTariff;
  coded: CodedTariff | null;
  sources: string[];
}

export interface TariffFile {
  schemaVersion: 1;
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
  meterType: MeterType;
  kWh: number;
  /** Index into residential.bands, or -1 for coded meters and zero reads. */
  bandIndex: number;
  lines: BillLine[];
  energy: Piasters;
  serviceFee: Piasters;
  total: Piasters;
  confidence: Confidence;
}
