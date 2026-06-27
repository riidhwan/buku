import { InjectionToken } from '@angular/core';

export interface InstalledAppVersion {
  readonly versionName: string;
}

export type InstalledAppVersionResult =
  | {
      readonly ok: true;
      readonly version: InstalledAppVersion;
    }
  | {
      readonly ok: false;
      readonly reason: 'unavailable';
    };

export interface AppVersionPort {
  getInstalledVersion(): Promise<InstalledAppVersionResult>;
}

export const APP_VERSION = new InjectionToken<AppVersionPort>('APP_VERSION');
