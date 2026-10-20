export declare const vitestPreset: {
  test: {
    environment: 'node';
    include: string[];
    coverage: {
      provider: 'v8';
      include: string[];
      exclude: string[];
      reporter: string[];
      thresholds: { lines: number; functions: number; branches: number; statements: number };
    };
  };
};
