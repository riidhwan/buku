/* istanbul ignore file */
import { Injectable, InjectionToken, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { AppVersionPort, InstalledAppVersionResult } from '../application/ports/app-version.port';

export interface AppInfoPlugin {
  getInfo(): Promise<{
    readonly version: string;
  }>;
}

export const APP_INFO_PLUGIN = new InjectionToken<AppInfoPlugin>('APP_INFO_PLUGIN', {
  /* istanbul ignore next -- default factory delegates to the native Capacitor plugin. */
  factory: () => ({
    /* istanbul ignore next -- default factory delegates to the native Capacitor plugin. */
    getInfo: () => App.getInfo(),
  }),
});

@Injectable()
export class CapacitorAppVersionAdapter implements AppVersionPort {
  private readonly appInfo = inject(APP_INFO_PLUGIN);

  public async getInstalledVersion(): Promise<InstalledAppVersionResult> {
    try {
      const info = await this.appInfo.getInfo();
      return { ok: true, version: { versionName: info.version } };
    } catch (_error) {
      return { ok: false, reason: 'unavailable' };
    }
  }
}
