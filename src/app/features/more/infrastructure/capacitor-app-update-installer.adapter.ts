import { inject, Injectable } from '@angular/core';
import { AppUpdateApk } from '../domain/app-update';
import {
  AppUpdateInstallerPort,
  AppUpdateInstallResult,
} from '../application/ports/app-update-installer.port';
import { APP_UPDATE_PLUGIN } from './capacitor-app-update';

@Injectable()
export class CapacitorAppUpdateInstallerAdapter implements AppUpdateInstallerPort {
  private readonly plugin = inject(APP_UPDATE_PLUGIN);

  public async install(apk: AppUpdateApk): Promise<AppUpdateInstallResult> {
    const result = await this.plugin.install({ url: apk.downloadUrl, fileName: apk.name });
    return result.status === 'ok' ? { ok: true } : { ok: false, reason: result.status };
  }
}
