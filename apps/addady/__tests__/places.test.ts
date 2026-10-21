import { bundledTariffs, CUSTOMER_CLASSES, versionById } from 'eg-electricity-tariff';
import { cairoTime, DEFAULT_GRACE } from '@addady/energy-model';

import { CONFIRMED_HOLIDAYS, GRACE } from '../src/content/holidays';
import { RIGHTS, rightsCard } from '../src/content/rights';
import { PLACE_KINDS, type Home, type ReadingRow } from '../src/db/schema';
import { checkBill } from '../src/domain/billCheck';
import { billOptions, hasBands, PLACE_PROFILES, pricedClass } from '../src/domain/place';
import { homeStatus, monthCliffs } from '../src/domain/status';
import { t } from '../src/i18n';

const place = (over: Partial<Home> = {}): Home => ({
  id: 1,
  name: 'المحل',
  kind: 'shop',
  customerClass: 'commercial',
  meterType: 'postpaid',
  powerFactor: null,
  governorate: 'cairo',
  meterMonthStartDay: 1,
  contractedLoadKW: null,
  lowBalancePiasters: null,
  otherChargesPiasters: 0,
  createdAt: 0,
  ...over,
});

const reading = (id: number, at: Date, registerKWh: number): ReadingRow => ({
  id,
  homeId: 1,
  at: at.getTime(),
  registerKWh,
  monthKWh: null,
  balancePiasters: null,
  note: null,
});

// 8 kWh/day; about 156 kWh so far on 20 October.
const rows = [
  reading(1, cairoTime(2026, 9, 20), 5000),
  reading(2, cairoTime(2026, 10, 1), 5088),
  reading(3, cairoTime(2026, 10, 20, 12), 5244),
];
const now = cairoTime(2026, 10, 20, 12);
const status = (p: Home) =>
  homeStatus({
    home: p,
    readings: rows,
    tariffs: bundledTariffs,
    now,
    grace: DEFAULT_GRACE,
    runs: 100,
  });

describe('places of every kind', () => {
  it('a shop is billed in commercial bands, with the next cliff at 250 kWh', () => {
    const s = status(place());
    expect(s.current!.customerClass).toBe('commercial');
    expect(s.current!.bandIndex).toBe(1); // 101-250: flat from zero at 216
    expect(s.current!.energy).toBe(156 * 216);
    expect(s.current!.stamps).toBe(156 * 3);
    expect(s.cliff!.atKWh).toBe(250);
    expect(monthCliffs(bundledTariffs, s.monthStart, place()).map((c) => c.atKWh)).toEqual([
      100, 250, 1000,
    ]);
  });

  it('a medium-voltage factory has one flat price and no cliffs', () => {
    const factory = place({ kind: 'factory', customerClass: 'mediumVoltage' });
    const s = status(factory);
    expect(s.current!.energy).toBe(156 * 255);
    expect(s.current!.serviceFee).toBe(3500);
    expect(s.cliff).toBeNull();
    expect(s.budget).toBeNull();
    expect(hasBands(pricedClass(factory))).toBe(false);
  });

  it('a coded meter is priced at the coded rate whatever the class', () => {
    const coded = place({ kind: 'home', customerClass: 'residential', meterType: 'coded' });
    expect(pricedClass(coded)).toBe('coded');
    expect(status(coded).current!.energy).toBe(156 * 274);
    expect(billOptions(coded)).toEqual({ customerClass: 'residential', meterType: 'coded' });
  });

  it('checks a shop bill against the commercial tariff', () => {
    const r = checkBill({
      tariffs: bundledTariffs,
      month: '2026-07',
      kWh: 200,
      billedPiasters: 200 * 216 + 1500 + 600,
      meterType: 'postpaid',
      customerClass: 'commercial',
      otherChargesPiasters: 0,
    });
    expect(r.verdict).toBe('match');
    // The coded-meter hint only applies to homes.
    const high = checkBill({
      tariffs: bundledTariffs,
      month: '2026-07',
      kWh: 200,
      billedPiasters: 90_000,
      meterType: 'postpaid',
      customerClass: 'commercial',
      otherChargesPiasters: 0,
    });
    expect(high.causes).not.toContain('coded');
  });

  it('every place kind has a profile whose classes exist in the current tariff', () => {
    const latest = versionById(bundledTariffs, '2026-07');
    for (const kind of PLACE_KINDS) {
      const profile = PLACE_PROFILES[kind];
      expect(profile.classes.length).toBeGreaterThan(0);
      for (const c of profile.classes) expect(latest.classes[c]).toBeDefined();
      expect(t(`places.${kind}.label`)).not.toBe(`places.${kind}.label`);
    }
    for (const c of CUSTOMER_CLASSES) expect(t(`classes.${c}`)).not.toBe(`classes.${c}`);
  });
});

describe('rights cards', () => {
  it('have unique ids, steps and https sources', () => {
    expect(new Set(RIGHTS.map((r) => r.id)).size).toBe(RIGHTS.length);
    for (const r of RIGHTS) {
      expect(r.steps.length).toBeGreaterThan(0);
      expect(r.sources.length).toBeGreaterThan(0);
      for (const s of r.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(rightsCard(r.id)).toBe(r);
    }
    expect(rightsCard('nope')).toBeUndefined();
  });

  it('never explain how to tamper with a meter', () => {
    const tampering = rightsCard('tampering')!;
    expect(tampering.steps.join(' ')).toContain('اطلب اختبار العداد');
  });
});

describe('holidays', () => {
  it('lists only confirmed dates, each with a source', () => {
    for (const h of CONFIRMED_HOLIDAYS) {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(h.source).toMatch(/^https:\/\//);
    }
    expect(GRACE.holidays.size).toBe(CONFIRMED_HOLIDAYS.length);
  });
});
