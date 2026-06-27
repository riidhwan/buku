import { inject, Injectable } from '@angular/core';
import { compareAppVersions, parseAppVersion } from '../domain/app-update';
import { APP_VERSION, AppVersionPort } from './ports/app-version.port';
import {
  APP_UPDATE_RELEASE_SOURCE,
  AppUpdateReleaseSourcePort,
} from './ports/app-update-release-source.port';
import { AppUpdateRelease } from '../domain/app-update';

export type AppUpdateCheckResult =
  | {
      readonly status: 'update-available';
      readonly installedVersion: string;
      readonly release: AppUpdateRelease;
    }
  | {
      readonly status: 'up-to-date';
      readonly installedVersion: string;
      readonly latestVersion: string | null;
    }
  | {
      readonly status:
        | 'network-unavailable'
        | 'release-source-unavailable'
        | 'invalid-release-metadata'
        | 'installed-version-unavailable';
    };

@Injectable()
export class CheckForAppUpdateUseCase {
  private readonly appVersion = inject<AppVersionPort>(APP_VERSION);
  private readonly releaseSource = inject<AppUpdateReleaseSourcePort>(APP_UPDATE_RELEASE_SOURCE);

  public async execute(): Promise<AppUpdateCheckResult> {
    const installedResult = await this.appVersion.getInstalledVersion();
    if (!installedResult.ok) {
      return { status: 'installed-version-unavailable' };
    }

    const installedVersion = parseAppVersion(installedResult.version.versionName);
    if (!installedVersion.ok) {
      return { status: 'installed-version-unavailable' };
    }

    const releaseResult = await this.releaseSource.latestStableRelease();
    if (!releaseResult.ok) {
      return this.toFailure(releaseResult.reason);
    }

    if (releaseResult.release === null) {
      return {
        status: 'up-to-date',
        installedVersion: installedVersion.version.raw,
        latestVersion: null,
      };
    }

    if (compareAppVersions(releaseResult.release.version, installedVersion.version) <= 0) {
      return {
        status: 'up-to-date',
        installedVersion: installedVersion.version.raw,
        latestVersion: releaseResult.release.version.raw,
      };
    }

    return {
      status: 'update-available',
      installedVersion: installedVersion.version.raw,
      release: releaseResult.release,
    };
  }

  private toFailure(
    reason: 'network-unavailable' | 'source-unavailable' | 'invalid-release-metadata',
  ) {
    if (reason === 'source-unavailable') {
      return { status: 'release-source-unavailable' } as const;
    }

    return { status: reason } as const;
  }
}
