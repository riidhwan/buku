import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { APP_CONFIG } from '@core/config/app-config.token';
import { MoreFacade } from '../application/more.facade';
import { APP_UPDATE_INSTALLER } from '../application/ports/app-update-installer.port';
import { APP_UPDATE_RELEASE_SOURCE } from '../application/ports/app-update-release-source.port';
import { APP_VERSION } from '../application/ports/app-version.port';
import { provideMore } from './provide-more';

describe('provideMore', () => {
  it('wires the More facade and app update ports', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideMore(),
        {
          provide: APP_CONFIG,
          useValue: {
            appName: 'Buku',
            production: false,
            updates: {
              githubOwner: 'riidhwan',
              githubRepo: 'buku',
              apkAssetPrefix: 'buku',
            },
          },
        },
      ],
    });

    expect(TestBed.inject(MoreFacade)).toBeTruthy();
    expect(TestBed.inject(APP_VERSION)).toBeTruthy();
    expect(TestBed.inject(APP_UPDATE_RELEASE_SOURCE)).toBeTruthy();
    expect(TestBed.inject(APP_UPDATE_INSTALLER)).toBeTruthy();
  });
});
