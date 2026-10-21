import { mismatchReport } from '../src/domain/report';

const input = {
  month: '2026-09',
  kWh: 300,
  billedPiasters: 41900,
  expectedPiasters: 41400,
  meterType: 'postpaid' as const,
  tariffVersion: '2026-07',
  appVersion: '0.1.0',
};

describe('mismatchReport', () => {
  it('builds a pre-filled GitHub issue with the anonymous fields only', () => {
    const r = mismatchReport(input);
    expect(r.title).toBe('Bill mismatch: 300 kWh, 2026-09, postpaid');
    expect(r.body).toContain('| Amount on the bill (EGP) | 419.00 |');
    expect(r.body).toContain('| Addady expected (EGP) | 414.00 |');
    expect(r.body).toContain('| Difference (EGP) | +5.00 |');
    const url = new URL(r.url);
    expect(url.origin + url.pathname).toBe('https://github.com/phoenixak/addady/issues/new');
    expect(url.searchParams.get('body')).toBe(r.body);
    expect(url.searchParams.get('labels')).toBe('bill-mismatch');
  });

  it('shows a negative difference without a plus sign', () => {
    expect(mismatchReport({ ...input, billedPiasters: 40000 }).body).toContain(
      '| Difference (EGP) | -14.00 |',
    );
  });

  it('cannot carry anything beyond its fixed fields', () => {
    // Extra properties (e.g. from a future caller) never reach the text.
    const r = mismatchReport({ ...input, phone: '+201000000000', governorate: 'cairo' } as never);
    // The privacy footer mentions "phone" by design; what must never appear is actual data.
    expect(r.body).not.toMatch(/\+20|cairo/i);
    // Exactly 8 data rows.
    const rows = r.body.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Field'));
    expect(rows).toHaveLength(8);
  });
});
