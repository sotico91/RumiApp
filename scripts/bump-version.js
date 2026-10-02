#!/usr/bin/env node
// Bump the app version by one step: 1.0 → 1.1 → 1.2 …, plus the build
// numbers Android (versionCode) and iOS (buildNumber) need to accept updates.
// Usage: node scripts/bump-version.js   (prints the new version)
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const plistPath = path.join(root, 'ios/Rumi/Info.plist');
const pbxprojPath = path.join(root, 'ios/Rumi.xcodeproj/project.pbxproj');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expo = appJson.expo;

const match = /^(\d+)\.(\d+)$/.exec(expo.version);
if (!match) {
  console.error(`Unexpected version "${expo.version}" — expected MAJOR.MINOR like 1.0`);
  process.exit(1);
}
const version = `${match[1]}.${Number(match[2]) + 1}`;
const build = (expo.android?.versionCode ?? 1) + 1;

expo.version = version;
expo.android = { ...expo.android, versionCode: build };
expo.ios = { ...expo.ios, buildNumber: String(build) };
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

if (fs.existsSync(plistPath)) {
  const plist = fs
    .readFileSync(plistPath, 'utf8')
    .replace(
      /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${version}$2`
    )
    .replace(/(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${build}$2`);
  fs.writeFileSync(plistPath, plist);
}

if (fs.existsSync(pbxprojPath)) {
  const pbx = fs
    .readFileSync(pbxprojPath, 'utf8')
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
  fs.writeFileSync(pbxprojPath, pbx);
}

console.log(version);
