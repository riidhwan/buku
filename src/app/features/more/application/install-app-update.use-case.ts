import { inject, Injectable } from '@angular/core';
import { AppUpdateRelease } from '../domain/app-update';
import {
  APP_UPDATE_INSTALLER,
  AppUpdateInstallerPort,
  AppUpdateInstallResult,
} from './ports/app-update-installer.port';

@Injectable()
export class InstallAppUpdateUseCase {
  private readonly installer = inject<AppUpdateInstallerPort>(APP_UPDATE_INSTALLER);

  public execute(release: AppUpdateRelease): Promise<AppUpdateInstallResult> {
    return this.installer.install(release.apk);
  }
}
