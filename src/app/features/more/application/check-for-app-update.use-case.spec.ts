import { TestBed } from '@angular/core/testing';
import { parseAppVersion } from '../domain/app-update';
import { CheckForAppUpdateUseCase } from './check-for-app-update.use-case';
import { AppUpdateReleaseSourceResult } from './ports/app-update-release-source.port';
import { APP_UPDATE_RELEASE_SOURCE } from './ports/app-update-release-source.port';
import { APP_VERSION, AppVersionPort, InstalledAppVersionResult } from './ports/app-version.port';

class FakeAppVersion implements AppVersionPort {
  public versionName = '0.1.0';
  public result: InstalledAppVersionResult | null = null;

  public getInstalledVersion(): Promise<InstalledAppVersionResult> {
    return Promise.resolve(this.result ?? { ok: true, version: { versionName: this.versionName } });
  }
}

class FakeReleaseSource {
  public result: AppUpdateReleaseSourceResult = { ok: true, release: releaseFor('0.1.1') };

  public latestStableRelease(): Promise<AppUpdateReleaseSourceResult> {
    return Promise.resolve(this.result);
  }
}

describe('CheckForAppUpdateUseCase', () => {
  let useCase: CheckForAppUpdateUseCase;
  let appVersion: FakeAppVersion;
  let releaseSource: FakeReleaseSource;

  beforeEach(() => {
    appVersion = new FakeAppVersion();
    releaseSource = new FakeReleaseSource();

    TestBed.configureTestingModule({
      providers: [
        CheckForAppUpdateUseCase,
        { provide: APP_VERSION, useValue: appVersion },
        { provide: APP_UPDATE_RELEASE_SOURCE, useValue: releaseSource },
      ],
    });

    useCase = TestBed.inject(CheckForAppUpdateUseCase);
  });

  it('reports an available update when the latest release is newer', async () => {
    const result = await useCase.execute();

    expect(result.status).toBe('update-available');
    expect(result.status === 'update-available' && result.release.version.raw).toBe('0.1.1');
  });

  it('reports up to date when the latest release is not newer', async () => {
    appVersion.versionName = '0.1.1';

    const result = await useCase.execute();

    expect(result).toEqual({
      status: 'up-to-date',
      installedVersion: '0.1.1',
      latestVersion: '0.1.1',
    });
  });

  it('rejects invalid installed version metadata', async () => {
    appVersion.versionName = 'debug';

    await expectAsync(useCase.execute()).toBeResolvedTo({
      status: 'installed-version-unavailable',
    });
  });

  it('rejects unavailable installed version metadata', async () => {
    appVersion.result = { ok: false, reason: 'unavailable' };

    await expectAsync(useCase.execute()).toBeResolvedTo({
      status: 'installed-version-unavailable',
    });
  });

  it('reports up to date when no stable release exists', async () => {
    releaseSource.result = { ok: true, release: null };

    await expectAsync(useCase.execute()).toBeResolvedTo({
      status: 'up-to-date',
      installedVersion: '0.1.0',
      latestVersion: null,
    });
  });

  it('maps release source failures to check failures', async () => {
    releaseSource.result = { ok: false, reason: 'source-unavailable' };
    await expectAsync(useCase.execute()).toBeResolvedTo({
      status: 'release-source-unavailable',
    });

    releaseSource.result = { ok: false, reason: 'network-unavailable' };
    await expectAsync(useCase.execute()).toBeResolvedTo({ status: 'network-unavailable' });

    releaseSource.result = { ok: false, reason: 'invalid-release-metadata' };
    await expectAsync(useCase.execute()).toBeResolvedTo({
      status: 'invalid-release-metadata',
    });
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
