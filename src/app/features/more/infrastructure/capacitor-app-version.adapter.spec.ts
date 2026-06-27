import { TestBed } from '@angular/core/testing';
import {
  APP_INFO_PLUGIN,
  AppInfoPlugin,
  CapacitorAppVersionAdapter,
} from './capacitor-app-version.adapter';

class FakeAppInfoPlugin implements AppInfoPlugin {
  public error: Error | null = null;

  public getInfo(): Promise<{ readonly version: string }> {
    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve({ version: '0.1.0' });
  }
}

describe('CapacitorAppVersionAdapter', () => {
  let adapter: CapacitorAppVersionAdapter;
  let plugin: FakeAppInfoPlugin;

  beforeEach(() => {
    plugin = new FakeAppInfoPlugin();

    TestBed.configureTestingModule({
      providers: [
        CapacitorAppVersionAdapter,
        {
          provide: APP_INFO_PLUGIN,
          useValue: plugin,
        },
      ],
    });

    adapter = TestBed.inject(CapacitorAppVersionAdapter);
  });

  it('reads the installed native app version', async () => {
    await expectAsync(adapter.getInstalledVersion()).toBeResolvedTo({
      ok: true,
      version: { versionName: '0.1.0' },
    });
  });

  it('maps native app info failures to unavailable', async () => {
    plugin.error = new Error('native unavailable');

    await expectAsync(adapter.getInstalledVersion()).toBeResolvedTo({
      ok: false,
      reason: 'unavailable',
    });
  });
});
