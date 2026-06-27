import { compareAppVersions, expectedApkAssetName, parseAppVersion } from './app-update';

describe('app update domain', () => {
  it('parses semantic versions with an optional leading v', () => {
    expect(parseAppVersion('0.1.2')).toEqual({
      ok: true,
      version: { raw: '0.1.2', semver: { major: 0, minor: 1, patch: 2 } },
    });
    expect(parseAppVersion('v1.2.3')).toEqual({
      ok: true,
      version: { raw: '1.2.3', semver: { major: 1, minor: 2, patch: 3 } },
    });
  });

  it('rejects non-semver version labels', () => {
    expect(parseAppVersion('0.1')).toEqual({ ok: false });
    expect(parseAppVersion('release-0.1.0')).toEqual({ ok: false });
    expect(parseAppVersion('1.2.3-beta.1')).toEqual({ ok: false });
    expect(parseAppVersion('999999999999999999999999999999.1.1')).toEqual({ ok: false });
  });

  it('compares parsed app versions', () => {
    const older = parseAppVersion('1.2.3');
    const newer = parseAppVersion('1.3.0');

    expect(older.ok && newer.ok && compareAppVersions(newer.version, older.version)).toBe(1);
    expect(older.ok && newer.ok && compareAppVersions(older.version, newer.version)).toBe(-1);
    expect(older.ok && compareAppVersions(older.version, older.version)).toBe(0);
  });

  it('builds the strict APK asset name for a version', () => {
    const version = parseAppVersion('v0.1.1');

    expect(version.ok && expectedApkAssetName('buku', version.version)).toBe('buku-0.1.1.apk');
  });
});
