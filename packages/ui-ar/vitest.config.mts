import { defineConfig } from 'vitest/config';
import { vitestPreset } from '@addady/config/vitest';

// Only the pure formatting logic runs in Node; React Native files are checked on device.
export default defineConfig({
  test: {
    ...vitestPreset.test,
    coverage: { ...vitestPreset.test.coverage, include: ['src/format.ts', 'src/arabic-text.ts'] },
  },
});
