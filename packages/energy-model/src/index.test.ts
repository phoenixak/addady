import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PACKAGE_NAME } from './index';

describe('package scaffold', () => {
  it('exports its name', () => {
    expect(PACKAGE_NAME.length).toBeGreaterThan(0);
  });

  it('runs fast-check properties', () => {
    fc.assert(fc.property(fc.integer(), (n) => n + 0 === n));
  });
});
