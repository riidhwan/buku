import { TestBed } from '@angular/core/testing';
import { parseAppVersion } from '../domain/app-update';
import {
  APP_UPDATE_INSTALLER,
  AppUpdateInstallerPort,
  AppUpdateInstallResult,
} from './ports/app-update-installer.port';
import { InstallAppUpdateUseCase } from './install-app-update.use-case';

class FakeInstaller implements AppUpdateInstallerPort {
  public result: AppUpdateInstallResult = { ok: true };
  public apkUrl: string | null = null;

  public install(apk: { readonly downloadUrl: string }): Promise<AppUpdateInstallResult> {
    this.apkUrl = apk.downloadUrl;
    return Promise.resolve(this.result);
  }
}

describe('InstallAppUpdateUseCase', () => {
  it('installs the release APK through the installer port', async () => {
    const installer = new FakeInstaller();
    TestBed.configureTestingModule({
      providers: [InstallAppUpdateUseCase, { provide: APP_UPDATE_INSTALLER, useValue: installer }],
    });

    const result = await TestBed.inject(InstallAppUpdateUseCase).execute(release());

    expect(result).toEqual({ ok: true });
    expect(installer.apkUrl).toBe('https://github.example/buku.apk');
  });
});

function release() {
  const version = parseAppVersion('0.1.1');
  if (!version.ok) {
    throw new Error('Test version must be valid.');
  }

  return {
    version: version.version,
    title: 'Buku 0.1.1',
    notes: 'Release notes',
    htmlUrl: 'https://github.example/releases/0.1.1',
    apk: {
      name: 'buku.apk',
      downloadUrl: 'https://github.example/buku.apk',
    },
  };
}
