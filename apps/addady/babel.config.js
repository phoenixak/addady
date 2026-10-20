module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Drizzle migrations import .sql files as strings (ADR 004).
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
