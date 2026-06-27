import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertMetadataMatchesVersion,
  isStableVersion,
  parseAndroidVersion,
  parsePackageVersion,
  releaseBranchVersion,
} from './release-metadata.mjs';

describe('release metadata', () => {
  it('extracts stable versions from release branches', () => {
    assert.equal(releaseBranchVersion('release/1.2.3'), '1.2.3');
    assert.equal(releaseBranchVersion('feature/1.2.3'), undefined);
    assert.equal(releaseBranchVersion('release/1.2'), undefined);
    assert.equal(isStableVersion('1.2.3'), true);
    assert.equal(isStableVersion('1.2.3-beta.1'), false);
  });

  it('parses package and Android source versions', () => {
    assert.equal(parsePackageVersion('{"version":"2.3.4"}'), '2.3.4');
    assert.deepEqual(
      parseAndroidVersion(`
        versionCode 12
        versionName "2.3.4"
      `),
      {
        versionName: '2.3.4',
        versionCode: 12,
      },
    );
  });

  it('rejects mismatched release metadata', () => {
    assert.throws(
      () =>
        assertMetadataMatchesVersion(
          {
            packageVersion: '1.0.0',
            androidVersionName: '1.0.1',
            androidVersionCode: 2,
          },
          '1.0.2',
        ),
      /package\.json version 1\.0\.0 does not match 1\.0\.2/,
    );
  });
});
