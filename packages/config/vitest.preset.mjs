// Shared vitest settings for pure-TS packages: Node only, 100% coverage.
export const vitestPreset = {
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
};
