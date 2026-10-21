// "مين إنت؟": what each kind of place means for pricing (docs/research/ux.md, tariff-classes.md).
import type { BillOptions, CustomerClass, MeterType } from 'eg-electricity-tariff';

import type { Home, PlaceKind } from '../db/schema';

export interface PlaceProfile {
  /** Customer classes the user can pick for this kind of place; the first is the default. */
  classes: readonly CustomerClass[];
  meterTypes: readonly MeterType[];
}

export const PLACE_PROFILES: Record<PlaceKind, PlaceProfile> = {
  home: { classes: ['residential'], meterTypes: ['prepaid', 'postpaid', 'coded'] },
  shop: { classes: ['commercial'], meterTypes: ['prepaid', 'postpaid'] },
  office: { classes: ['commercial'], meterTypes: ['prepaid', 'postpaid'] },
  // Factories are priced by the voltage they take supply at, in plain words in the UI.
  factory: {
    classes: ['lowVoltage', 'mediumVoltage', 'highVoltage', 'extraHighVoltage'],
    meterTypes: ['postpaid'],
  },
  farm: { classes: ['irrigationLowVoltage', 'irrigationMediumVoltage'], meterTypes: ['postpaid'] },
};

/** Classes whose month is priced in consumption bands (so cliffs and tiers mean something). */
export function hasBands(customerClass: CustomerClass): boolean {
  return customerClass === 'residential' || customerClass === 'commercial';
}

export function billOptions(place: Pick<Home, 'customerClass' | 'meterType'>): BillOptions {
  return { customerClass: place.customerClass, meterType: place.meterType };
}

/** The class that actually prices the meter (a coded meter always uses the coded rate). */
export function pricedClass(place: Pick<Home, 'customerClass' | 'meterType'>): CustomerClass {
  return place.meterType === 'coded' ? 'coded' : place.customerClass;
}

export const PLACE_ICONS = {
  home: 'home-variant',
  shop: 'storefront-outline',
  office: 'office-building-outline',
  factory: 'factory',
  farm: 'tractor-variant',
} as const satisfies Record<PlaceKind, string>;
