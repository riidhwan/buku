import { execFileSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  assertMetadataMatchesVersion,
  parseAndroidVersion,
  releaseBranchVersion,
  releaseMetadata,
} from './release-metadata.mjs';

const args = new Set(process.argv.slice(2));

const option = (name) => {
  const prefix = `${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
};

const gitShow = (revisionPath) =>
  execFileSync('git', ['show', revisionPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const assertVersionCodeIncreased = (currentVersionCode) => {
  const baseBuildGradle = gitShow('origin/master:android/app/build.gradle');
  const baseVersionCode = parseAndroidVersion(baseBuildGradle).versionCode;

  if (currentVersionCode <= baseVersionCode) {
    throw new Error(
      `Android versionCode ${currentVersionCode} must be greater than master versionCode ${baseVersionCode}.`,
    );
  }
};

const releaseVersion = () => {
  const explicitVersion = option('--version');
  if (explicitVersion) {
    return releaseBranchVersion(explicitVersion) ?? explicitVersion;
  }

  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  const version = branch ? releaseBranchVersion(branch) : undefined;
  if (!version) {
    throw new Error(`Expected a release/<version> branch, got ${branch ?? 'unknown branch'}.`);
  }

  return version;
};

const writeGithubOutput = async (version, versionCode) => {
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (!githubOutput) {
    return;
  }

  await appendFile(
    githubOutput,
    [
      `version=${version}`,
      `version_code=${versionCode}`,
      `tag=v${version}`,
      `apk_name=buku-${version}.apk`,
      `release_check_apk_name=buku-${version}-release-check.apk`,
      '',
    ].join('\n'),
  );
};

const main = async () => {
  const version = releaseVersion();
  const metadata = await releaseMetadata();

  assertMetadataMatchesVersion(metadata, version);

  if (process.env.GITHUB_BASE_REF && process.env.GITHUB_BASE_REF !== 'master') {
    throw new Error(
      `Release pull requests must target master, got ${process.env.GITHUB_BASE_REF}.`,
    );
  }

  if (args.has('--check-master-version-code')) {
    assertVersionCodeIncreased(metadata.androidVersionCode);
  }

  await writeGithubOutput(version, metadata.androidVersionCode);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
