// Appliance energy from the label on its back, plus how it's used.
// Every default carries a confidence and a source (docs/research/appliances.md). Label values,
// when the user has them, always win over defaults.

export type EstimateConfidence = 'label-exact' | 'label-derived' | 'default';

export interface Estimate {
  kWhPerDay: number;
  confidence: EstimateConfidence;
  /** Defaults or assumptions used, as stable keys the UI translates (e.g. 'ac.eer.inverter'). */
  assumptions: string[];
}

export interface Default {
  value: number;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export const DEFAULTS = {
  /** BTU/h per marketed "horsepower" in the Egyptian AC market (1.5 HP = 12,000 BTU/h). */
  'ac.btuPerHp': {
    value: 8000,
    confidence: 'medium',
    source: 'Egyptian retailer listings: 1.5 HP = 12,000 BTU/h (btech.com, carrefouregypt.com)',
  },
  'ac.eer.inverter': {
    value: 11.5,
    confidence: 'medium',
    source: 'Carrier 1.5 HP inverter listing: 12,400 BTU/h at 1,080 W (carrefouregypt.com)',
  },
  'ac.eer.fixed': {
    value: 9.5,
    confidence: 'low',
    source: 'Assumption: no published Egyptian label data for fixed-speed units',
  },
  /** Outdoor - set-point difference (°C) at which an AC runs at full duty. */
  'ac.designDeltaC': {
    value: 12,
    confidence: 'low',
    source: 'Assumption; calibrated per home from readings (calibration.ts)',
  },
  'motor.powerFactor': {
    value: 0.8,
    confidence: 'medium',
    source: 'Typical small single-phase induction motor',
  },
  'motor.loadFactor.pump': {
    value: 0.8,
    confidence: 'low',
    source: 'Assumption: nameplate current is the maximum',
  },
  'motor.loadFactor.fan': {
    value: 0.6,
    confidence: 'low',
    source: 'Assumption: nameplate current is the maximum',
  },
  'fridge.kWhPerYear': {
    value: 400,
    confidence: 'low',
    source: 'US ENERGY STAR 16 ft³ units: 347-452 kWh/yr; no Egyptian data found',
  },
  'fridge.dutyCycle': {
    value: 0.4,
    confidence: 'low',
    source: 'Assumption: compressor runs 35-50% of the time',
  },
  'fridge.summerFactor': {
    value: 1.25,
    confidence: 'low',
    source: 'Assumption: hotter kitchen raises consumption 20-30%',
  },
  /** Standby loss of an 80 L tank at ~60 °C; other sizes scale with surface area (volume^(2/3)). */
  'heater.standbyKWhPerDayAt80L': {
    value: 1.0,
    confidence: 'low',
    source: 'Manufacturer figure for an 80 L tank (~1 kWh/day); a measured 72 L tank: 0.5 kWh/day',
  },
  'heater.inletC.winter': {
    value: 16,
    confidence: 'low',
    source: 'Assumption: Nile Valley mains water in winter',
  },
  'heater.inletC.summer': {
    value: 27,
    confidence: 'low',
    source: 'Assumption: Nile Valley mains water in summer',
  },
} as const satisfies Record<string, Default>;

const WATT_PER_HP = 746; // exact by definition (mechanical horsepower)
const KJ_PER_KG_K = 4.186; // specific heat of water
const BTU_PER_WH = 3.412;

function positive(name: string, v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  if (!Number.isFinite(v) || v < 0) throw new RangeError(`${name} must be >= 0, got ${v}`);
  return v;
}

function hoursPerDay(h: number): number {
  if (!Number.isFinite(h) || h < 0 || h > 24)
    throw new RangeError(`hoursPerDay must be 0-24, got ${h}`);
  return h;
}

/** Kettle, iron, oven, heater element, hair dryer: power factor ~1. */
export function resistive(input: {
  watts?: number;
  volts?: number;
  amps?: number;
  hoursPerDay: number;
}): Estimate {
  const h = hoursPerDay(input.hoursPerDay);
  const watts = positive('watts', input.watts);
  if (watts !== undefined)
    return { kWhPerDay: (watts * h) / 1000, confidence: 'label-exact', assumptions: [] };
  const v = positive('volts', input.volts);
  const a = positive('amps', input.amps);
  if (v === undefined || a === undefined)
    throw new RangeError('resistive needs watts, or volts and amps');
  return { kWhPerDay: (v * a * h) / 1000, confidence: 'label-derived', assumptions: [] };
}

/** Water pump, fan, blender, washing-machine motor. Nameplate current is a maximum, so a load factor applies. */
export function motor(input: {
  watts?: number;
  hp?: number;
  volts?: number;
  amps?: number;
  powerFactor?: number;
  kind?: 'pump' | 'fan';
  hoursPerDay: number;
}): Estimate {
  const h = hoursPerDay(input.hoursPerDay);
  const assumptions: string[] = [];
  const loadKey = input.kind === 'fan' ? 'motor.loadFactor.fan' : 'motor.loadFactor.pump';
  const load = DEFAULTS[loadKey].value;
  assumptions.push(loadKey);
  let watts = positive('watts', input.watts);
  let confidence: EstimateConfidence = 'label-exact';
  const hp = positive('hp', input.hp);
  if (watts === undefined && hp !== undefined) {
    watts = hp * WATT_PER_HP;
    confidence = 'label-derived';
  }
  if (watts === undefined) {
    const v = positive('volts', input.volts);
    const a = positive('amps', input.amps);
    if (v === undefined || a === undefined)
      throw new RangeError('motor needs watts, hp, or volts and amps');
    let pf = positive('powerFactor', input.powerFactor);
    if (pf === undefined) {
      pf = DEFAULTS['motor.powerFactor'].value;
      assumptions.push('motor.powerFactor');
    }
    watts = v * a * pf;
    confidence = 'label-derived';
  }
  return { kWhPerDay: (watts * load * h) / 1000, confidence, assumptions };
}

/** Washing machine / dishwasher from the energy label's kWh per cycle. */
export function perCycle(input: { kWhPerCycle: number; cyclesPerWeek: number }): Estimate {
  const k = positive('kWhPerCycle', input.kWhPerCycle)!;
  const c = positive('cyclesPerWeek', input.cyclesPerWeek)!;
  return { kWhPerDay: (k * c) / 7, confidence: 'label-exact', assumptions: [] };
}

/** Fridge / freezer: the label's kWh/year is best; otherwise watts x duty cycle; otherwise a default. */
export function fridge(input: { kWhPerYear?: number; watts?: number; summer?: boolean }): Estimate {
  const assumptions: string[] = [];
  let kWhPerDay: number;
  let confidence: EstimateConfidence;
  const year = positive('kWhPerYear', input.kWhPerYear);
  const watts = positive('watts', input.watts);
  if (year !== undefined) {
    kWhPerDay = year / 365;
    confidence = 'label-exact';
  } else if (watts !== undefined) {
    kWhPerDay = (watts * 24 * DEFAULTS['fridge.dutyCycle'].value) / 1000;
    confidence = 'label-derived';
    assumptions.push('fridge.dutyCycle');
  } else {
    kWhPerDay = DEFAULTS['fridge.kWhPerYear'].value / 365;
    confidence = 'default';
    assumptions.push('fridge.kWhPerYear');
  }
  if (input.summer) {
    kWhPerDay *= DEFAULTS['fridge.summerFactor'].value;
    assumptions.push('fridge.summerFactor');
  }
  return { kWhPerDay, confidence, assumptions };
}

/**
 * Split AC. Input power comes from the label (rated cooling input, W), or capacity / EER.
 * Runtime fraction = clamp(k x (T_out - T_set) / designDelta, 0.2, 1); inverters run at part load.
 */
export function airConditioner(input: {
  inputWatts?: number;
  btuPerHour?: number;
  hp?: number;
  eer?: number;
  inverter: boolean;
  hoursPerDay: number;
  outdoorC: number;
  setpointC: number;
  /** Per-home calibration factor (1 = uncalibrated). */
  k?: number;
}): Estimate {
  const h = hoursPerDay(input.hoursPerDay);
  const assumptions: string[] = [];
  let watts = positive('inputWatts', input.inputWatts);
  let confidence: EstimateConfidence = 'label-exact';
  if (watts === undefined) {
    let btu = positive('btuPerHour', input.btuPerHour);
    if (btu === undefined) {
      const hp = positive('hp', input.hp);
      if (hp === undefined)
        throw new RangeError('airConditioner needs inputWatts, btuPerHour or hp');
      btu = hp * DEFAULTS['ac.btuPerHp'].value;
      assumptions.push('ac.btuPerHp');
    }
    let eer = positive('eer', input.eer);
    if (eer === undefined) {
      const key = input.inverter ? 'ac.eer.inverter' : 'ac.eer.fixed';
      eer = DEFAULTS[key].value;
      assumptions.push(key);
    }
    watts = btu / eer;
    confidence = assumptions.length > 0 ? 'default' : 'label-derived';
  }
  const k = input.k ?? 1;
  const delta = DEFAULTS['ac.designDeltaC'].value;
  assumptions.push('ac.designDeltaC');
  const runtime = Math.min(1, Math.max(0.2, (k * (input.outdoorC - input.setpointC)) / delta));
  const partLoad = input.inverter ? 0.75 : 1;
  return { kWhPerDay: (watts * runtime * partLoad * h) / 1000, confidence, assumptions };
}

/** BTU/h of cooling per watt of input (for showing the label in the other unit). */
export const btuToWatts = (btuPerHour: number) => btuPerHour / BTU_PER_WH;

/** Electric storage water heater: energy to heat the water used, plus standby loss. */
export function waterHeater(input: {
  litresPerDay: number;
  setpointC: number;
  inletC?: number;
  season: 'summer' | 'winter';
  tankLitres: number;
  /** Hours per day the heater is switched on (24 = always on). */
  hoursOnPerDay: number;
  standbyKWhPerDay?: number;
}): Estimate {
  const hOn = hoursPerDay(input.hoursOnPerDay);
  const assumptions: string[] = [];
  let inlet = input.inletC;
  if (inlet === undefined) {
    const key = input.season === 'summer' ? 'heater.inletC.summer' : 'heater.inletC.winter';
    inlet = DEFAULTS[key].value;
    assumptions.push(key);
  }
  const litres = positive('litresPerDay', input.litresPerDay)!;
  const tank = positive('tankLitres', input.tankLitres)!;
  const heating = (litres * Math.max(0, input.setpointC - inlet) * KJ_PER_KG_K) / 3600;
  let standby = positive('standbyKWhPerDay', input.standbyKWhPerDay);
  if (standby === undefined) {
    standby = DEFAULTS['heater.standbyKWhPerDayAt80L'].value * (tank / 80) ** (2 / 3);
    assumptions.push('heater.standbyKWhPerDayAt80L');
  }
  // Standby loss only accrues while the element keeps the tank hot.
  const kWhPerDay = heating + standby * (hOn / 24);
  return { kWhPerDay, confidence: assumptions.length ? 'default' : 'label-exact', assumptions };
}

export function lighting(input: { count: number; watts: number; hoursPerDay: number }): Estimate {
  const h = hoursPerDay(input.hoursPerDay);
  return {
    kWhPerDay: (positive('count', input.count)! * positive('watts', input.watts)! * h) / 1000,
    confidence: 'label-exact',
    assumptions: [],
  };
}

/** TV, router, PC, chargers: on power while used, standby power the rest of the day. */
export function electronics(input: {
  onWatts: number;
  standbyWatts: number;
  hoursOnPerDay: number;
}): Estimate {
  const h = hoursPerDay(input.hoursOnPerDay);
  const on = positive('onWatts', input.onWatts)!;
  const standby = positive('standbyWatts', input.standbyWatts)!;
  return {
    kWhPerDay: (on * h + standby * (24 - h)) / 1000,
    confidence: 'label-exact',
    assumptions: [],
  };
}
