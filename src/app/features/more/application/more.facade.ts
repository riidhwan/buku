import { computed, inject, Injectable, signal } from '@angular/core';
import { AppUpdateRelease } from '../domain/app-update';
import { CheckForAppUpdateUseCase } from './check-for-app-update.use-case';
import { AppUpdateInstallResult } from './ports/app-update-installer.port';
import { InstallAppUpdateUseCase } from './install-app-update.use-case';

type AppUpdateCheckFailureReason =
  | 'network-unavailable'
  | 'release-source-unavailable'
  | 'invalid-release-metadata'
  | 'installed-version-unavailable';
type AppUpdateInstallResultFailureReason = Exclude<
  AppUpdateInstallResult,
  { readonly ok: true }
>['reason'];

export type AppUpdateViewState =
  | {
      readonly status: 'idle';
    }
  | {
      readonly status: 'checking';
    }
  | {
      readonly status: 'up-to-date';
      readonly installedVersion: string;
      readonly latestVersion: string | null;
    }
  | {
      readonly status: 'update-available';
      readonly installedVersion: string;
      readonly release: AppUpdateRelease;
    }
  | {
      readonly status: 'installing';
      readonly installedVersion: string;
      readonly release: AppUpdateRelease;
    }
  | {
      readonly status: 'install-started';
      readonly installedVersion: string;
      readonly release: AppUpdateRelease;
    }
  | {
      readonly status: 'failure';
      readonly reason: AppUpdateCheckFailureReason | AppUpdateInstallResultFailureReason;
      readonly installedVersion: string | null;
      readonly release: AppUpdateRelease | null;
    };

@Injectable()
export class MoreFacade {
  private readonly checkForAppUpdateUseCase = inject(CheckForAppUpdateUseCase);
  private readonly installAppUpdateUseCase = inject(InstallAppUpdateUseCase);
  private readonly appUpdateSignal = signal<AppUpdateViewState>({ status: 'idle' });

  public readonly appUpdate = this.appUpdateSignal.asReadonly();
  public readonly appUpdateBusy = computed(() => {
    const status = this.appUpdateSignal().status;
    return status === 'checking' || status === 'installing';
  });

  public async checkForAppUpdate(): Promise<void> {
    this.appUpdateSignal.set({ status: 'checking' });
    const result = await this.checkForAppUpdateUseCase.execute();
    if (result.status === 'update-available' || result.status === 'up-to-date') {
      this.appUpdateSignal.set(result);
      return;
    }

    this.appUpdateSignal.set({
      status: 'failure',
      reason: result.status,
      installedVersion: null,
      release: null,
    });
  }

  public async installAppUpdate(): Promise<void> {
    const state = this.appUpdateSignal();
    if (!canInstallFromState(state)) {
      return;
    }

    this.appUpdateSignal.set({
      status: 'installing',
      installedVersion: state.installedVersion,
      release: state.release,
    });
    const result = await this.installAppUpdateUseCase.execute(state.release);
    if (result.ok) {
      this.appUpdateSignal.set({
        status: 'install-started',
        installedVersion: state.installedVersion,
        release: state.release,
      });
      return;
    }

    this.appUpdateSignal.set({
      status: 'failure',
      reason: result.reason,
      installedVersion: state.installedVersion,
      release: state.release,
    });
  }
}

function canInstallFromState(
  state: AppUpdateViewState,
): state is Extract<
  AppUpdateViewState,
  { readonly status: 'update-available' | 'install-started' | 'failure' }
> & { readonly installedVersion: string; readonly release: AppUpdateRelease } {
  return (
    (state.status === 'update-available' ||
      state.status === 'install-started' ||
      state.status === 'failure') &&
    state.installedVersion !== null &&
    state.release !== null
  );
}
