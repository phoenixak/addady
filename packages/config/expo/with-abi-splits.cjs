// Builds one APK per CPU architecture instead of one universal APK (docs/PLAN.md §8):
// arm64-v8a for almost all phones, armeabi-v7a for old ones, x86_64 for emulators.
// Each ABI gets a distinct versionCode (base * 10 + n) so Android always prefers the right one.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// addady: abi splits';
const ABIS = ['armeabi-v7a', 'arm64-v8a', 'x86_64'];

const splitsBlock = `
    ${MARKER}
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include ${ABIS.map((a) => `"${a}"`).join(', ')}
        }
    }`;

// AGP 9 removed the legacy applicationVariants API; use the androidComponents variant API.
const versionCodeBlock = `
${MARKER} (version codes)
def addadyAbiCodes = [${ABIS.map((a, i) => `"${a}": ${i + 1}`).join(', ')}]
androidComponents {
    onVariants(selector().all()) { variant ->
        variant.outputs.each { output ->
            def abiFilter = output.filters.find { it.filterType == com.android.build.api.variant.FilterConfiguration.FilterType.ABI }
            if (abiFilter != null) {
                output.versionCode.set(output.versionCode.get() * 10 + addadyAbiCodes.get(abiFilter.identifier))
            }
        }
    }
}
`;

function addSplits(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  const withSplits = gradle.replace(/android\s*\{/, (m) => `${m}${splitsBlock}`);
  if (withSplits === gradle)
    throw new Error('with-abi-splits: no android { } block in app/build.gradle');
  return `${withSplits}\n${versionCodeBlock}`;
}

module.exports = function withAbiSplits(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addSplits(cfg.modResults.contents);
    return cfg;
  });
};
