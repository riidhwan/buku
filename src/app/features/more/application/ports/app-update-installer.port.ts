import { InjectionToken } from '@angular/core';
import { AppUpdateApk } from '../../domain/app-update';

export type AppUpdateInstallResult =
  | {
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason:
        'download-failed' | 'install-permission-required' | 'installer-unavailable' | 'invalid-apk';
    };

export interface AppUpdateInstallerPort {
  install(apk: AppUpdateApk): Promise<AppUpdateInstallResult>;
}

export const APP_UPDATE_INSTALLER = new InjectionToken<AppUpdateInstallerPort>(
  'APP_UPDATE_INSTALLER',
);
