import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config.token';
import {
  AppUpdateReleaseSourcePort,
  AppUpdateReleaseSourceResult,
} from '../application/ports/app-update-release-source.port';
import { AppUpdateApk, expectedApkAssetName, parseAppVersion } from '../domain/app-update';

interface GithubRelease {
  readonly tagName: string;
  readonly name: string;
  readonly body: string;
  readonly htmlUrl: string;
  readonly draft: boolean;
  readonly prerelease: boolean;
  readonly assets: readonly GithubReleaseAsset[];
}

interface GithubReleaseAsset {
  readonly name: string;
  readonly browserDownloadUrl: string;
}

@Injectable()
export class GithubAppUpdateReleaseSourceAdapter implements AppUpdateReleaseSourcePort {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  public async latestStableRelease(): Promise<AppUpdateReleaseSourceResult> {
    try {
      const releases = await firstValueFrom(
        this.http.get<unknown[]>(this.releasesUrl(), {
          headers: { Accept: 'application/vnd.github+json' },
        }),
      );
      return this.toLatestStableRelease(releases);
    } catch (error) {
      return this.toRequestFailure(error);
    }
  }

  private toLatestStableRelease(value: unknown): AppUpdateReleaseSourceResult {
    if (!Array.isArray(value)) {
      return { ok: false, reason: 'invalid-release-metadata' };
    }

    const stableRelease = value
      .map(toGithubRelease)
      .find((release) => release !== null && !release.draft && !release.prerelease);
    if (stableRelease === undefined || stableRelease === null) {
      return { ok: true, release: null };
    }

    return this.toAppUpdateRelease(stableRelease);
  }

  private toAppUpdateRelease(release: GithubRelease): AppUpdateReleaseSourceResult {
    const version = parseAppVersion(release.tagName);
    if (!version.ok) {
      return { ok: false, reason: 'invalid-release-metadata' };
    }

    const apk = this.findApkAsset(
      release,
      expectedApkAssetName(this.config.updates.apkAssetPrefix, version.version),
    );
    if (apk === null) {
      return { ok: false, reason: 'invalid-release-metadata' };
    }

    return {
      ok: true,
      release: {
        version: version.version,
        title: release.name || release.tagName,
        notes: release.body,
        apk,
        htmlUrl: release.htmlUrl,
      },
    };
  }

  private findApkAsset(release: GithubRelease, expectedName: string): AppUpdateApk | null {
    const asset = release.assets.find((candidate) => candidate.name === expectedName);
    if (asset === undefined) {
      return null;
    }

    return { name: asset.name, downloadUrl: asset.browserDownloadUrl };
  }

  private releasesUrl(): string {
    const owner = encodeURIComponent(this.config.updates.githubOwner);
    const repo = encodeURIComponent(this.config.updates.githubRepo);
    return `https://api.github.com/repos/${owner}/${repo}/releases`;
  }

  private toRequestFailure(error: unknown): AppUpdateReleaseSourceResult {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return { ok: false, reason: 'network-unavailable' };
    }

    return { ok: false, reason: 'source-unavailable' };
  }
}

function toGithubRelease(value: unknown): GithubRelease | null {
  if (!isRecord(value)) {
    return null;
  }

  const assets = value['assets'];
  if (!Array.isArray(assets)) {
    return null;
  }

  const release = {
    tagName: value['tag_name'],
    name: value['name'],
    body: value['body'],
    htmlUrl: value['html_url'],
    draft: value['draft'],
    prerelease: value['prerelease'],
  };
  if (!isGithubReleaseShape(release)) {
    return null;
  }

  return {
    ...release,
    assets: assets
      .map(toGithubReleaseAsset)
      .filter((asset): asset is GithubReleaseAsset => asset !== null),
  };
}

function toGithubReleaseAsset(value: unknown): GithubReleaseAsset | null {
  if (!isRecord(value)) {
    return null;
  }

  const asset = {
    name: value['name'],
    browserDownloadUrl: value['browser_download_url'],
  };
  return isGithubReleaseAssetShape(asset) ? asset : null;
}

function isGithubReleaseShape(value: {
  readonly tagName: unknown;
  readonly name: unknown;
  readonly body: unknown;
  readonly htmlUrl: unknown;
  readonly draft: unknown;
  readonly prerelease: unknown;
}): value is Omit<GithubRelease, 'assets'> {
  return (
    typeof value.tagName === 'string' &&
    typeof value.name === 'string' &&
    typeof value.body === 'string' &&
    typeof value.htmlUrl === 'string' &&
    typeof value.draft === 'boolean' &&
    typeof value.prerelease === 'boolean'
  );
}

function isGithubReleaseAssetShape(value: {
  readonly name: unknown;
  readonly browserDownloadUrl: unknown;
}): value is GithubReleaseAsset {
  return typeof value.name === 'string' && typeof value.browserDownloadUrl === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
