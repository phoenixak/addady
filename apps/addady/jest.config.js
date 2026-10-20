// jest-expo's preset, plus ESM-only packages our pure workspace packages depend on.
const preset = require('jest-expo/jest-preset');

const [nodeModules, ...rest] = preset.transformIgnorePatterns;
const extraEsm = ['@noble', '@date-fns', 'date-fns', 'drizzle-orm'];

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    nodeModules.replace('standard-navigation', `standard-navigation|${extraEsm.join('|')}`),
    ...rest,
  ],
};
