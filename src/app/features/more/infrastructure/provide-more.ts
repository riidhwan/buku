import { Provider } from '@angular/core';
import { APP_UPDATE_INSTALLER } from '../application/ports/app-update-installer.port';
import { APP_UPDATE_RELEASE_SOURCE } from '../application/ports/app-update-release-source.port';
import { APP_VERSION } from '../application/ports/app-version.port';
import { CheckForAppUpdateUseCase } from '../application/check-for-app-update.use-case';
import { InstallAppUpdateUseCase } from '../application/install-app-update.use-case';
import { MoreFacade } from '../application/more.facade';
import { CapacitorAppUpdateInstallerAdapter } from './capacitor-app-update-installer.adapter';
import { CapacitorAppVersionAdapter } from './capacitor-app-version.adapter';
import { GithubAppUpdateReleaseSourceAdapter } from './github-app-update-release-source.adapter';

export function provideMore(): Provider[] {
  return [
    MoreFacade,
    CheckForAppUpdateUseCase,
    InstallAppUpdateUseCase,
    CapacitorAppVersionAdapter,
    GithubAppUpdateReleaseSourceAdapter,
    CapacitorAppUpdateInstallerAdapter,
    {
      provide: APP_VERSION,
      useExisting: CapacitorAppVersionAdapter,
    },
    {
      provide: APP_UPDATE_RELEASE_SOURCE,
      useExisting: GithubAppUpdateReleaseSourceAdapter,
    },
    {
      provide: APP_UPDATE_INSTALLER,
      useExisting: CapacitorAppUpdateInstallerAdapter,
    },
  ];
}
