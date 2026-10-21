// Confirmed official holidays (Cairo dates) on which prepaid meters don't disconnect.
//
// Only dates fixed by a published cabinet decision belong here. An unconfirmed holiday would make
// the run-out warning promise a LATER cut than reality, the unsafe direction, so leaving a date
// out is always the safe error. Religious holidays depend on moon sighting and are often moved to
// Thursdays, so news "expected dates" are not enough (docs/research/rights.md).
//
// Researched 2026-10-21: no official holiday falls in the simulator's horizon (to late December),
// and the 2027 calendar has not been decreed yet.
import { DEFAULT_GRACE, type GraceRules } from '@addady/energy-model';

export const CONFIRMED_HOLIDAYS: readonly { date: string; name: string; source: string }[] = [];

export const GRACE: GraceRules = {
  ...DEFAULT_GRACE,
  holidays: new Set(CONFIRMED_HOLIDAYS.map((h) => h.date)),
};
