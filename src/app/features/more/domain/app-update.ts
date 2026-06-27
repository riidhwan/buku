export interface AppVersion {
  readonly raw: string;
  readonly semver: SemanticVersion;
}

export interface SemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface AppUpdateRelease {
  readonly version: AppVersion;
  readonly title: string;
  readonly notes: string;
  readonly apk: AppUpdateApk;
  readonly htmlUrl: string;
}

export interface AppUpdateApk {
  readonly name: string;
  readonly downloadUrl: string;
}

export type AppVersionParseResult =
  | {
      readonly ok: true;
      readonly version: AppVersion;
    }
  | {
      readonly ok: false;
    };

export function parseAppVersion(raw: string): AppVersionParseResult {
  const trimmed = raw.trim();
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(trimmed);
  if (match === null) {
    return { ok: false };
  }

  /* istanbul ignore next -- the regex guarantees these capture groups. */
  const major = toVersionNumber(match[1] ?? '');
  /* istanbul ignore next -- the regex guarantees these capture groups. */
  const minor = toVersionNumber(match[2] ?? '');
  /* istanbul ignore next -- the regex guarantees these capture groups. */
  const patch = toVersionNumber(match[3] ?? '');
  if (major === null || minor === null || patch === null) {
    return { ok: false };
  }

  return {
    ok: true,
    version: {
      raw: trimmed.startsWith('v') ? trimmed.slice(1) : trimmed,
      semver: { major, minor, patch },
    },
  };
}

export function compareAppVersions(left: AppVersion, right: AppVersion): number {
  return (
    compareNumber(left.semver.major, right.semver.major) ||
    compareNumber(left.semver.minor, right.semver.minor) ||
    compareNumber(left.semver.patch, right.semver.patch)
  );
}

export function expectedApkAssetName(assetPrefix: string, version: AppVersion): string {
  return `${assetPrefix}-${version.raw}.apk`;
}

function compareNumber(left: number, right: number): number {
  return left === right ? 0 : left > right ? 1 : -1;
}

function toVersionNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
