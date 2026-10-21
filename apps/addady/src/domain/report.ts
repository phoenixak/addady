// "My bill didn't match": a report the USER posts publicly as a GitHub issue (docs/research/pdpl.md).
// Nothing is sent by the app. The app shows exactly this text, then opens the browser; the user
// decides whether to submit. Only coarse, non-identifying fields are included by construction.
import type { MeterType } from 'eg-electricity-tariff';

const NEW_ISSUE = 'https://github.com/phoenixak/addady/issues/new';

export interface MismatchReportInput {
  month: string;
  kWh: number;
  billedPiasters: number;
  expectedPiasters: number;
  meterType: MeterType;
  tariffVersion: string;
  appVersion: string;
}

export interface Report {
  title: string;
  /** Exactly what will be posted: shown to the user before opening the browser. */
  body: string;
  url: string;
}

const egp = (piasters: number) => (piasters / 100).toFixed(2);

export function mismatchReport(r: MismatchReportInput): Report {
  const gap = r.billedPiasters - r.expectedPiasters;
  const title = `Bill mismatch: ${r.kWh} kWh, ${r.month}, ${r.meterType}`;
  const body = [
    '### Bill mismatch report',
    '',
    '| Field | Value |',
    '|---|---|',
    `| Consumption month | ${r.month} |`,
    `| kWh on the bill | ${r.kWh} |`,
    `| Amount on the bill (EGP) | ${egp(r.billedPiasters)} |`,
    `| Addady expected (EGP) | ${egp(r.expectedPiasters)} |`,
    `| Difference (EGP) | ${gap > 0 ? '+' : ''}${egp(gap)} |`,
    `| Meter type | ${r.meterType} |`,
    `| Tariff version used | ${r.tariffVersion} |`,
    `| App version | ${r.appVersion} |`,
    '',
    '_No name, phone, address, account or meter number is included._',
  ].join('\n');
  const params = new URLSearchParams({ title, body, labels: 'bill-mismatch' });
  return { title, body, url: `${NEW_ISSUE}?${params.toString()}` };
}
