// Builds signed per-ABI release APKs for apps/addady and writes SHA-256 checksums.
//
//   node scripts/release-android.mjs            build + verify + checksum into release/
//   node scripts/release-android.mjs --skip-build  only collect/verify an existing build
//
// Needs JAVA_HOME, ANDROID_HOME and the signing properties in ~/.gradle/gradle.properties
// (ADR 007). Fails if any APK isn't signed with the published release certificate.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const APP = join(ROOT, 'apps', 'addady');
const OUT = join(ROOT, 'release');
const RELEASE_CERT_SHA256 = '5f874651517fcf6d919aa75625cbd53cc4097a5abada6f4dde5036318433ba18';
const win = process.platform === 'win32';

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: win });
const capture = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', shell: win });

const { expo } = JSON.parse(readFileSync(join(APP, 'app.json'), 'utf8'));
const version = expo.version;

if (!process.argv.includes('--skip-build')) {
  run('npx', ['expo', 'prebuild', '-p', 'android', '--clean', '--no-install'], APP);
  // Absolute path: cmd.exe doesn't run a .bat from the working directory by bare name.
  run(
    join(APP, 'android', win ? 'gradlew.bat' : 'gradlew'),
    ['assembleRelease', '--console=plain'],
    join(APP, 'android'),
  );
}

const apkDir = join(APP, 'android', 'app', 'build', 'outputs', 'apk', 'release');
const apks = readdirSync(apkDir).filter((f) => f.endsWith('.apk'));
if (apks.length === 0) throw new Error(`no APKs in ${apkDir}`);

const buildTools = join(process.env.ANDROID_HOME ?? '', 'build-tools');
const apksigner = join(
  buildTools,
  readdirSync(buildTools).sort().at(-1),
  win ? 'apksigner.bat' : 'apksigner',
);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
const sums = [];
for (const apk of apks) {
  // Gradle names split outputs app-<abi>-release.apk.
  const abi = apk.match(/^app-(.+)-release\.apk$/)?.[1] ?? 'universal';
  const name = `addady-${version}-${abi}.apk`;
  const src = join(apkDir, apk);
  const certs = capture(apksigner, ['verify', '--print-certs', src]);
  const sha = certs.match(/certificate SHA-256 digest: ([0-9a-f]{64})/)?.[1];
  if (sha !== RELEASE_CERT_SHA256) {
    throw new Error(`${apk} is not signed with the release certificate (got ${sha ?? 'none'})`);
  }
  copyFileSync(src, join(OUT, name));
  const digest = createHash('sha256')
    .update(readFileSync(join(OUT, name)))
    .digest('hex');
  sums.push(`${digest}  ${name}`);
  console.log(`${name}  ${(readFileSync(join(OUT, name)).length / 1e6).toFixed(1)} MB  signed ✓`);
}
writeFileSync(join(OUT, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);
console.log(
  `\nrelease/ ready for v${version}. Signing certificate SHA-256: ${RELEASE_CERT_SHA256}`,
);
if (!existsSync(join(OUT, 'SHA256SUMS.txt'))) process.exit(1);
