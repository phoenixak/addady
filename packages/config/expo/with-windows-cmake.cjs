// Windows only: points Gradle at a newer SDK CMake through android/local.properties (`cmake.dir`).
// The default CMake 3.22.1 + ninja fails on Windows with "build.ninja still dirty after 100 tries"
// when building React Native native modules from a pnpm store (ADR 007). Needs `cmake;3.30+`
// installed with sdkmanager. `prebuild --clean` regenerates local.properties, so this runs on
// every prebuild. No-op on other platforms (CI runs on Linux).
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MIN_CMAKE = [3, 30];

function parseVersion(name) {
  return name.split('.').map((n) => Number.parseInt(n, 10));
}

function newestCmake(sdkDir) {
  const root = path.join(sdkDir, 'cmake');
  if (!fs.existsSync(root)) return null;
  const versions = fs
    .readdirSync(root)
    .map((name) => ({ name, v: parseVersion(name) }))
    .filter(({ v }) => v[0] > MIN_CMAKE[0] || (v[0] === MIN_CMAKE[0] && v[1] >= MIN_CMAKE[1]))
    .sort((a, b) => b.v[0] - a.v[0] || b.v[1] - a.v[1] || (b.v[2] ?? 0) - (a.v[2] ?? 0));
  return versions.length ? path.join(root, versions[0].name) : null;
}

module.exports = function withWindowsCmake(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      if (process.platform !== 'win32') return cfg;
      const sdkDir =
        process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
      const cmakeDir = newestCmake(sdkDir);
      if (!cmakeDir) {
        console.warn(
          `withWindowsCmake: no CMake >= ${MIN_CMAKE.join('.')} in ${sdkDir}; run sdkmanager "cmake;3.31.6"`,
        );
        return cfg;
      }
      const fwd = (p) => p.split(path.sep).join('/');
      const file = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
      const kept = fs.existsSync(file)
        ? fs
            .readFileSync(file, 'utf8')
            .split(/\r?\n/)
            .filter((l) => l && !/^(sdk|cmake)\.dir=/.test(l))
        : [];
      kept.push(`sdk.dir=${fwd(sdkDir)}`, `cmake.dir=${fwd(cmakeDir)}`);
      fs.writeFileSync(file, `${kept.join('\n')}\n`);
      return cfg;
    },
  ]);
};
