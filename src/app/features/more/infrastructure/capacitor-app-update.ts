/* istanbul ignore file */
import { InjectionToken } from '@angular/core';
import { registerPlugin } from '@capacitor/core';

export type NativeAppUpdateInstallResult =
  | {
      readonly status: 'ok';
    }
  | {
      readonly status:
        'download-failed' | 'install-permission-required' | 'installer-unavailable' | 'invalid-apk';
    };

export interface AppUpdatePlugin {
  install(options: {
    readonly url: string;
    readonly fileName: string;
  }): Promise<NativeAppUpdateInstallResult>;
}

export const CapacitorAppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate');

export const APP_UPDATE_PLUGIN = new InjectionToken<AppUpdatePlugin>('APP_UPDATE_PLUGIN', {
  factory: () => ({
    install: (options) => CapacitorAppUpdate.install(options),
  }),
});
