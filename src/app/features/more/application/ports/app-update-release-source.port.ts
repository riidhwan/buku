import { InjectionToken } from '@angular/core';
import { AppUpdateRelease } from '../../domain/app-update';

export type AppUpdateReleaseSourceResult =
  | {
      readonly ok: true;
      readonly release: AppUpdateRelease | null;
    }
  | {
      readonly ok: false;
      readonly reason: 'network-unavailable' | 'source-unavailable' | 'invalid-release-metadata';
    };

export interface AppUpdateReleaseSourcePort {
  latestStableRelease(): Promise<AppUpdateReleaseSourceResult>;
}

export const APP_UPDATE_RELEASE_SOURCE = new InjectionToken<AppUpdateReleaseSourcePort>(
  'APP_UPDATE_RELEASE_SOURCE',
);
