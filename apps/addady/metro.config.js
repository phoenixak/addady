// Expo configures Metro for the pnpm monorepo automatically (ADR 002).
// The only addition: bundle Drizzle's .sql migration files (ADR 004).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
