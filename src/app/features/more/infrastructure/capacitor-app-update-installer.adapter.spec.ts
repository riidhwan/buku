import { TestBed } from '@angular/core/testing';
import {
  APP_UPDATE_PLUGIN,
  AppUpdatePlugin,
  NativeAppUpdateInstallResult,
} from './capacitor-app-update';
import { CapacitorAppUpdateInstallerAdapter } from './capacitor-app-update-installer.adapter';

class FakeAppUpdatePlugin implements AppUpdatePlugin {
  public result: NativeAppUpdateInstallResult = { status: 'ok' };
  public installedUrl: string | null = null;
  public installedFileName: string | null = null;

  public install(options: {
    readonly url: string;
    readonly fileName: string;
  }): Promise<NativeAppUpdateInstallResult> {
    this.installedUrl = options.url;
    this.installedFileName = options.fileName;
    return Promise.resolve(this.result);
  }
}

describe('CapacitorAppUpdateInstallerAdapter', () => {
  let adapter: CapacitorAppUpdateInstallerAdapter;
  let plugin: FakeAppUpdatePlugin;

  beforeEach(() => {
    plugin = new FakeAppUpdatePlugin();

    TestBed.configureTestingModule({
      providers: [
        CapacitorAppUpdateInstallerAdapter,
        { provide: APP_UPDATE_PLUGIN, useValue: plugin },
      ],
    });

    adapter = TestBed.inject(CapacitorAppUpdateInstallerAdapter);
  });

  it('passes APK details to the native plugin', async () => {
    await adapter.install({
      name: 'buku-0.1.1.apk',
      downloadUrl: 'https://download.example/buku-0.1.1.apk',
    });

    expect(plugin.installedFileName).toBe('buku-0.1.1.apk');
    expect(plugin.installedUrl).toBe('https://download.example/buku-0.1.1.apk');
  });

  it('maps native install failures to typed application failures', async () => {
    plugin.result = { status: 'install-permission-required' };

    await expectAsync(
      adapter.install({
        name: 'buku-0.1.1.apk',
        downloadUrl: 'https://download.example/buku-0.1.1.apk',
      }),
    ).toBeResolvedTo({ ok: false, reason: 'install-permission-required' });
  });
});
