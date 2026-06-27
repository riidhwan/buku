import { readFile } from 'node:fs/promises';

export const releaseBranchVersion = (branch) => {
  const match = /^release\/(?<version>\d+\.\d+\.\d+)$/.exec(branch);
  return match?.groups?.version;
};

export const isStableVersion = (version) => /^\d+\.\d+\.\d+$/.test(version);

export const parsePackageVersion = (packageJson) => {
  const parsed = JSON.parse(packageJson);
  if (typeof parsed.version !== 'string') {
    throw new Error('package.json version must be a string.');
  }

  return parsed.version;
};

export const parseAndroidVersion = (buildGradle) => {
  const versionName = /versionName\s+"(?<versionName>[^"]+)"/.exec(buildGradle)?.groups
    ?.versionName;
  const versionCodeText = /versionCode\s+(?<versionCode>\d+)/.exec(buildGradle)?.groups
    ?.versionCode;

  if (!versionName || !versionCodeText) {
    throw new Error('android/app/build.gradle must contain literal versionName and versionCode.');
  }

  return {
    versionName,
    versionCode: Number.parseInt(versionCodeText, 10),
  };
};

export const releaseMetadata = async ({
  buildGradlePath = 'android/app/build.gradle',
  packageJsonPath = 'package.json',
} = {}) => {
  const [packageJson, buildGradle] = await Promise.all([
    readFile(packageJsonPath, 'utf8'),
    readFile(buildGradlePath, 'utf8'),
  ]);
  const android = parseAndroidVersion(buildGradle);

  return {
    packageVersion: parsePackageVersion(packageJson),
    androidVersionName: android.versionName,
    androidVersionCode: android.versionCode,
  };
};

export const assertMetadataMatchesVersion = (metadata, version) => {
  const errors = [];

  if (!isStableVersion(version)) {
    errors.push(`Release version ${version} must use stable semver format like 1.2.3.`);
  }
  if (metadata.packageVersion !== version) {
    errors.push(`package.json version ${metadata.packageVersion} does not match ${version}.`);
  }
  if (metadata.androidVersionName !== version) {
    errors.push(`Android versionName ${metadata.androidVersionName} does not match ${version}.`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
};
