// eg-electricity-tariff: Egyptian electricity tariffs (every customer class) and bill engine.
// Pure TypeScript: no React, React Native or Expo imports (enforced by ESLint).
import { tariffsData } from './tariffs.data';
import { parseTariffFile } from './validate';

export * from './types';
export { parseTariffFile, TariffValidationError } from './validate';
export { bandFor, bill, classTariff, cliffs, nextCliff, versionById, versionFor } from './bill';
export type { BillOptions, Cliff } from './bill';

/** The tariff data bundled with this package version (validated at import time). */
export const bundledTariffs = parseTariffFile(tariffsData);
export { TARIFF_PUBLIC_KEY_HEX, verifyTariffSignature } from './signature';
