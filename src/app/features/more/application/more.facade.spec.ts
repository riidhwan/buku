import { TestBed } from '@angular/core/testing';
import { parseAppVersion } from '../domain/app-update';
import { CheckForAppUpdateUseCase } from './check-for-app-update.use-case';
import { InstallAppUpdateUseCase } from './install-app-update.use-case';
import { MoreFacade } from './more.facade';
import { APP_UPDATE_INSTALLER, AppUpdateInstallResult } from './ports/app-update-installer.port';
import {
  APP_UPDATE_RELEASE_SOURCE,
  AppUpdateReleaseSourceResult,
} from './ports/app-update-release-source.port';
import { APP_VERSION, AppVersionPort } from './ports/app-version.port';
import {
  MANUAL_CHAPTER_NAVIGATION_MANAGEMENT,
  ManualChapterNavigationRuleManagementPort,
} from './ports/manual-chapter-navigation-management.port';

class FakeAppVersion implements AppVersionPort {
  public getInstalledVersion() {
    return Promise.resolve({ ok: true, version: { versionName: '0.1.0' } } as const);
  }
}

class FakeReleaseSource {
  public result: AppUpdateReleaseSourceResult = { ok: true, release: releaseFor('0.1.1') };
  public deferredResult: Promise<AppUpdateReleaseSourceResult> | null = null;

  public latestStableRelease(): Promise<AppUpdateReleaseSourceResult> {
    return this.deferredResult ?? Promise.resolve(this.result);
  }
}

class FakeInstaller {
  public result: AppUpdateInstallResult = { ok: true };
  public deferredResult: Promise<AppUpdateInstallResult> | null = null;

  public install() {
    return this.deferredResult ?? Promise.resolve(this.result);
  }
}

class FakeManualChapterNavigationManagement implements ManualChapterNavigationRuleManagementPort {
  public items = [
    {
      id: 'rules-1',
      host: 'example.com',
      pathPrefix: '/story/',
      enabled: true,
      previousLabel: null,
      nextLabel: 'Next',
      unverified: false,
      lastFailed: false,
    },
  ];
  public enabledCall: { readonly id: string; readonly enabled: boolean } | null = null;
  public deletedId: string | null = null;

  public list() {
    return Promise.resolve(this.items);
  }

  public setEnabled(id: string, enabled: boolean) {
    this.enabledCall = { id, enabled };
    return Promise.resolve();
  }

  public delete(id: string) {
    this.deletedId = id;
    return Promise.resolve();
  }
}

class Deferred<T> {
  public readonly promise: Promise<T>;
  private resolveValue: (value: T) => void = () => {
    throw new Error('Deferred resolver was not assigned.');
  };

  public constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolveValue = resolve;
    });
  }

  public resolve(value: T): void {
    this.resolveValue(value);
  }
}

describe('MoreFacade', () => {
  let facade: MoreFacade;
  let releaseSource: FakeReleaseSource;
  let installer: FakeInstaller;
  let manualChapterNavigation: FakeManualChapterNavigationManagement;

  beforeEach(() => {
    releaseSource = new FakeReleaseSource();
    installer = new FakeInstaller();
    manualChapterNavigation = new FakeManualChapterNavigationManagement();

    TestBed.configureTestingModule({
      providers: [
        MoreFacade,
        CheckForAppUpdateUseCase,
        InstallAppUpdateUseCase,
        { provide: APP_VERSION, useClass: FakeAppVersion },
        { provide: APP_UPDATE_RELEASE_SOURCE, useValue: releaseSource },
        { provide: APP_UPDATE_INSTALLER, useValue: installer },
        {
          provide: MANUAL_CHAPTER_NAVIGATION_MANAGEMENT,
          useValue: manualChapterNavigation,
        },
      ],
    });

    facade = TestBed.inject(MoreFacade);
  });

  it('starts idle and exposes an available update after a user-initiated check', async () => {
    expect(facade.appUpdate()).toEqual({ status: 'idle' });

    await facade.checkForAppUpdate();

    expect(facade.appUpdate().status).toBe('update-available');
  });

  it('keeps the release available for retry when install permission is required', async () => {
    installer.result = { ok: false, reason: 'install-permission-required' };
    await facade.checkForAppUpdate();

    await facade.installAppUpdate();

    const state = facade.appUpdate();
    expect(state.status).toBe('failure');
    expect(state.status === 'failure' && state.release?.version.raw).toBe('0.1.1');
  });

  it('reports check failures as retryable failure state', async () => {
    releaseSource.result = { ok: false, reason: 'network-unavailable' };

    await facade.checkForAppUpdate();

    expect(facade.appUpdate()).toEqual({
      status: 'failure',
      reason: 'network-unavailable',
      installedVersion: null,
      release: null,
    });
  });

  it('reports a started install after launching the package installer', async () => {
    await facade.checkForAppUpdate();

    await facade.installAppUpdate();

    expect(facade.appUpdate().status).toBe('install-started');
  });

  it('does not install before an update is available', async () => {
    await facade.installAppUpdate();

    expect(facade.appUpdate()).toEqual({ status: 'idle' });
  });

  it('exposes busy state while checking and installing', async () => {
    const check = new Deferred<AppUpdateReleaseSourceResult>();
    releaseSource.deferredResult = check.promise;

    const checkPromise = facade.checkForAppUpdate();

    expect(facade.appUpdateBusy()).toBeTrue();
    check.resolve({ ok: true, release: releaseFor('0.1.1') });
    await checkPromise;

    const install = new Deferred<AppUpdateInstallResult>();
    installer.deferredResult = install.promise;
    const installPromise = facade.installAppUpdate();

    expect(facade.appUpdateBusy()).toBeTrue();
    install.resolve({ ok: true });
    await installPromise;
  });

  it('retries installation from a failure state with a release', async () => {
    installer.result = { ok: false, reason: 'install-permission-required' };
    await facade.checkForAppUpdate();
    await facade.installAppUpdate();

    installer.result = { ok: true };
    await facade.installAppUpdate();

    expect(facade.appUpdate().status).toBe('install-started');
  });

  it('loads, toggles, and deletes manual chapter navigation rules', async () => {
    await facade.loadManualChapterNavigationRules();

    expect(facade.manualChapterNavigationRules()).toEqual(manualChapterNavigation.items);

    await facade.setManualChapterNavigationRuleEnabled('rules-1', false);
    await facade.deleteManualChapterNavigationRule('rules-1');

    expect(manualChapterNavigation.enabledCall).toEqual({ id: 'rules-1', enabled: false });
    expect(manualChapterNavigation.deletedId).toBe('rules-1');
    expect(facade.manualChapterNavigationRules()).toEqual(manualChapterNavigation.items);
  });
});

function releaseFor(versionName: string) {
  const version = parseAppVersion(versionName);
  if (!version.ok) {
    throw new Error('Test version must be valid.');
  }

  return {
    version: version.version,
    title: `Buku ${versionName}`,
    notes: 'Release notes',
    htmlUrl: `https://github.example/releases/tag/${versionName}`,
    apk: {
      name: `buku-${versionName}.apk`,
      downloadUrl: `https://github.example/releases/download/${versionName}/buku-${versionName}.apk`,
    },
  };
}
