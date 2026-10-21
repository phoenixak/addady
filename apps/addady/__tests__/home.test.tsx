import { render, screen } from '@testing-library/react-native';

import { t } from '../src/i18n';
import { Card, EstimatedBadge, Stat, parseNumber, parsePiasters } from '../src/ui';
import ar from '../i18n/ar.json';

describe('i18n', () => {
  it('looks up nested keys and interpolates values', () => {
    expect(t('app.name')).toBe(ar.app.name);
    expect(t('home.daysLeft', { n: '٩' })).toBe('باقي ٩ يوم على آخر الشهر');
  });

  it('returns the key for missing entries and keeps unknown placeholders', () => {
    expect(t('nope.missing')).toBe('nope.missing');
    expect(t('common.between', { low: 'أ' })).toBe('بين أ و{{high}}');
  });
});

describe('UI building blocks', () => {
  it('renders a stat with its label, value and sub-line', async () => {
    await render(
      <Card>
        <Stat label={ar.home.projectedBill} value="٣٥٦ ج.م" sub="بين ٣٤٠ و٣٧٠" />
        <EstimatedBadge />
      </Card>,
    );
    expect(screen.getByText(ar.home.projectedBill)).toBeTruthy();
    expect(screen.getByText('٣٥٦ ج.م')).toBeTruthy();
    expect(screen.getByText(ar.common.estimated)).toBeTruthy();
  });

  it('parses numbers typed with Arabic-Indic or Latin digits', () => {
    expect(parseNumber('١٢٣٫٥')).toBe(123.5);
    expect(parseNumber('1,250')).toBe(1250);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('-5')).toBeNull();
    expect(parsePiasters('٥٠٫٧٥')).toBe(5075);
    expect(parsePiasters('')).toBeNull();
  });
});
