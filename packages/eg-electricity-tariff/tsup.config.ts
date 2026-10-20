import { defineConfig } from 'tsup';

// npm build only; inside the monorepo, Metro and vitest consume src/ directly.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
});
