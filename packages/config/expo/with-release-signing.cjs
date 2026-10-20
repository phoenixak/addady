// Adds a release signing config to android/app/build.gradle that reads the keystore from Gradle
// properties kept OUTSIDE the repo (%USERPROFILE%\.gradle\gradle.properties):
//   MYAPP_UPLOAD_STORE_FILE, MYAPP_UPLOAD_STORE_PASSWORD, MYAPP_UPLOAD_KEY_ALIAS, MYAPP_UPLOAD_KEY_PASSWORD
// Without them (e.g. in CI) release builds fall back to the debug key. See ADR 007.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// addady: release signing';

const releaseSigningConfig = `
        ${MARKER}
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }`;

function addReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  const withConfig = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${releaseSigningConfig}`);
  const releaseBlock =
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
  if (withConfig === gradle || !releaseBlock.test(withConfig)) {
    throw new Error(
      'withReleaseSigning: android/app/build.gradle layout changed; update the plugin.',
    );
  }
  return withConfig.replace(
    releaseBlock,
    "$1signingConfig project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
  );
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
