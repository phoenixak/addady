import { describe, expect, it } from 'vitest';

import {
  airConditioner,
  btuToWatts,
  DEFAULTS,
  electronics,
  fridge,
  lighting,
  motor,
  perCycle,
  resistive,
  waterHeater,
} from './appliances';

describe('defaults', () => {
  it('every default has a source and a confidence', () => {
    for (const [key, d] of Object.entries(DEFAULTS)) {
      expect(d.source.length, key).toBeGreaterThan(10);
      expect(['high', 'medium', 'low']).toContain(d.confidence);
    }
  });

  it('maps a 1.5 HP AC to 12,000 BTU/h as sold in Egypt', () => {
    expect(1.5 * DEFAULTS['ac.btuPerHp'].value).toBe(12000);
  });
});

describe('resistive', () => {
  it('uses watts when known, else volts x amps', () => {
    expect(resistive({ watts: 2000, hoursPerDay: 0.5 })).toEqual({
      kWhPerDay: 1,
      confidence: 'label-exact',
      assumptions: [],
    });
    expect(resistive({ volts: 220, amps: 10, hoursPerDay: 1 }).kWhPerDay).toBeCloseTo(2.2);
    expect(resistive({ volts: 220, amps: 10, hoursPerDay: 1 }).confidence).toBe('label-derived');
  });

  it('rejects missing or invalid label values', () => {
    expect(() => resistive({ volts: 220, hoursPerDay: 1 })).toThrow(RangeError);
    expect(() => resistive({ watts: -5, hoursPerDay: 1 })).toThrow(RangeError);
    expect(() => resistive({ watts: 5, hoursPerDay: 25 })).toThrow(RangeError);
  });
});

describe('motor', () => {
  it('applies the pump load factor to nameplate watts', () => {
    const e = motor({ watts: 750, hoursPerDay: 2 });
    expect(e.kWhPerDay).toBeCloseTo((750 * 0.8 * 2) / 1000);
    expect(e.assumptions).toEqual(['motor.loadFactor.pump']);
  });

  it('converts horsepower (1 HP = 746 W) and uses the fan load factor', () => {
    const e = motor({ hp: 1, kind: 'fan', hoursPerDay: 10 });
    expect(e.kWhPerDay).toBeCloseTo((746 * 0.6 * 10) / 1000);
    expect(e.confidence).toBe('label-derived');
  });

  it('uses V x A x PF, defaulting the power factor', () => {
    expect(motor({ volts: 220, amps: 5, hoursPerDay: 1 }).assumptions).toContain(
      'motor.powerFactor',
    );
    expect(motor({ volts: 220, amps: 5, powerFactor: 0.9, hoursPerDay: 1 }).kWhPerDay).toBeCloseTo(
      (220 * 5 * 0.9 * 0.8) / 1000,
    );
    expect(() => motor({ hoursPerDay: 1 })).toThrow(RangeError);
  });
});

describe('perCycle, lighting, electronics', () => {
  it('computes from label values', () => {
    expect(perCycle({ kWhPerCycle: 0.7, cyclesPerWeek: 7 }).kWhPerDay).toBeCloseTo(0.7);
    expect(lighting({ count: 10, watts: 9, hoursPerDay: 5 }).kWhPerDay).toBeCloseTo(0.45);
    expect(electronics({ onWatts: 100, standbyWatts: 1, hoursOnPerDay: 4 }).kWhPerDay).toBeCloseTo(
      0.42,
    );
  });
});

describe('fridge', () => {
  it('prefers the label kWh/year, then watts x duty, then a default', () => {
    expect(fridge({ kWhPerYear: 365 })).toEqual({
      kWhPerDay: 1,
      confidence: 'label-exact',
      assumptions: [],
    });
    expect(fridge({ watts: 150 }).kWhPerDay).toBeCloseTo((150 * 24 * 0.4) / 1000);
    expect(fridge({}).confidence).toBe('default');
  });

  it('raises consumption in summer', () => {
    expect(fridge({ kWhPerYear: 365, summer: true }).kWhPerDay).toBeCloseTo(1.25);
  });
});

describe('airConditioner', () => {
  it('runs at full duty in heat and part load for inverters', () => {
    const fixed = airConditioner({
      inputWatts: 1200,
      inverter: false,
      hoursPerDay: 8,
      outdoorC: 40,
      setpointC: 22,
    });
    expect(fixed.kWhPerDay).toBeCloseTo(9.6);
    const inv = airConditioner({
      inputWatts: 1080,
      inverter: true,
      hoursPerDay: 8,
      outdoorC: 40,
      setpointC: 22,
    });
    expect(inv.kWhPerDay).toBeCloseTo((1080 * 0.75 * 8) / 1000);
  });

  it('clamps the runtime fraction at 20% on mild days', () => {
    expect(
      airConditioner({
        inputWatts: 1000,
        inverter: false,
        hoursPerDay: 10,
        outdoorC: 23,
        setpointC: 24,
      }).kWhPerDay,
    ).toBeCloseTo(2);
  });

  it('derives input power from HP and a default EER, flagged as a default', () => {
    const e = airConditioner({
      hp: 1.5,
      inverter: false,
      hoursPerDay: 1,
      outdoorC: 40,
      setpointC: 20,
    });
    expect(e.kWhPerDay).toBeCloseTo(12000 / 9.5 / 1000);
    expect(e.confidence).toBe('default');
    expect(e.assumptions).toEqual(['ac.btuPerHp', 'ac.eer.fixed', 'ac.designDeltaC']);
  });

  it('is label-derived from BTU and the label EER, and uses the calibration factor k', () => {
    const e = airConditioner({
      btuPerHour: 18000,
      eer: 12,
      inverter: true,
      hoursPerDay: 1,
      outdoorC: 28,
      setpointC: 22,
      k: 1,
    });
    expect(e.confidence).toBe('label-derived');
    expect(e.kWhPerDay).toBeCloseTo((1500 * 0.5 * 0.75) / 1000);
    const hotter = airConditioner({
      btuPerHour: 18000,
      eer: 12,
      inverter: true,
      hoursPerDay: 1,
      outdoorC: 28,
      setpointC: 22,
      k: 1.5,
    });
    expect(hotter.kWhPerDay).toBeGreaterThan(e.kWhPerDay);
    expect(() =>
      airConditioner({ inverter: true, hoursPerDay: 1, outdoorC: 30, setpointC: 24 }),
    ).toThrow(RangeError);
    expect(
      airConditioner({
        btuPerHour: 12000,
        inverter: true,
        hoursPerDay: 1,
        outdoorC: 40,
        setpointC: 20,
      }).assumptions,
    ).toContain('ac.eer.inverter');
  });

  it('converts BTU/h to watts', () => {
    expect(btuToWatts(3412)).toBeCloseTo(1000);
  });
});

describe('waterHeater', () => {
  it('matches the physics: 60 L from 16 to 60 °C = 3.07 kWh, plus standby', () => {
    const e = waterHeater({
      litresPerDay: 60,
      setpointC: 60,
      season: 'winter',
      tankLitres: 80,
      hoursOnPerDay: 24,
    });
    expect(e.kWhPerDay).toBeCloseTo((60 * 44 * 4.186) / 3600 + 1.0);
    expect(e.assumptions).toEqual(['heater.inletC.winter', 'heater.standbyKWhPerDayAt80L']);
  });

  it('scales standby with tank surface and the hours the heater is on', () => {
    const e = waterHeater({
      litresPerDay: 0,
      setpointC: 60,
      inletC: 25,
      season: 'summer',
      tankLitres: 50,
      hoursOnPerDay: 12,
    });
    expect(e.kWhPerDay).toBeCloseTo((50 / 80) ** (2 / 3) * 0.5);
  });

  it('is label-exact with all values given, and never negative when inlet is hotter', () => {
    const e = waterHeater({
      litresPerDay: 40,
      setpointC: 25,
      inletC: 30,
      season: 'summer',
      tankLitres: 50,
      hoursOnPerDay: 24,
      standbyKWhPerDay: 0.6,
    });
    expect(e).toEqual({ kWhPerDay: 0.6, confidence: 'label-exact', assumptions: [] });
    expect(
      waterHeater({
        litresPerDay: 0,
        setpointC: 50,
        season: 'summer',
        tankLitres: 80,
        hoursOnPerDay: 0,
      }).assumptions,
    ).toContain('heater.inletC.summer');
  });
});
