import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config.token';
import { GithubAppUpdateReleaseSourceAdapter } from './github-app-update-release-source.adapter';

describe('GithubAppUpdateReleaseSourceAdapter', () => {
  let adapter: GithubAppUpdateReleaseSourceAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GithubAppUpdateReleaseSourceAdapter,
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

    adapter = TestBed.inject(GithubAppUpdateReleaseSourceAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the latest stable release with the strict matching APK asset', async () => {
    const resultPromise = adapter.latestStableRelease();
    const request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');

    request.flush([
      githubRelease({ tagName: 'v0.2.0', prerelease: true }),
      githubRelease({ tagName: 'v0.1.1' }),
    ]);

    await expectAsync(resultPromise).toBeResolvedTo(
      jasmine.objectContaining({
        ok: true,
        release: jasmine.objectContaining({
          title: 'Buku v0.1.1',
          notes: 'Release notes',
          apk: { name: 'buku-0.1.1.apk', downloadUrl: 'https://download.example/buku-0.1.1.apk' },
        }),
      }),
    );
  });

  it('treats a newer release without a matching APK as invalid metadata', async () => {
    const resultPromise = adapter.latestStableRelease();
    const request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');

    request.flush([githubRelease({ tagName: 'v0.1.1', assetName: 'buku-debug.apk' })]);

    await expectAsync(resultPromise).toBeResolvedTo({
      ok: false,
      reason: 'invalid-release-metadata',
    });
  });

  it('reports no update release when no stable release exists', async () => {
    const resultPromise = adapter.latestStableRelease();
    const request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');

    request.flush([
      githubRelease({ tagName: 'v0.2.0', prerelease: true }),
      githubRelease({ tagName: 'v0.1.1', draft: true }),
    ]);

    await expectAsync(resultPromise).toBeResolvedTo({ ok: true, release: null });
  });

  it('treats non-array and invalid stable release payloads as invalid metadata', async () => {
    let resultPromise = adapter.latestStableRelease();
    let request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');
    request.flush({});
    await expectAsync(resultPromise).toBeResolvedTo({
      ok: false,
      reason: 'invalid-release-metadata',
    });

    resultPromise = adapter.latestStableRelease();
    request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');
    request.flush([githubRelease({ tagName: 'release-0.1.1' })]);
    await expectAsync(resultPromise).toBeResolvedTo({
      ok: false,
      reason: 'invalid-release-metadata',
    });
  });

  it('ignores malformed release and asset entries while finding a stable release', async () => {
    const resultPromise = adapter.latestStableRelease();
    const request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');

    request.flush([
      'bad-release',
      null,
      { tag_name: 'v0.2.0', assets: {} },
      { tag_name: 'v0.1.2', name: 12, assets: [] },
      githubRelease({ tagName: 'v0.1.1', extraAssets: ['broken-asset', { name: 'broken.apk' }] }),
    ]);

    const result = await resultPromise;

    expect(result.ok).toBeTrue();
    expect(result.ok && result.release?.apk.name).toBe('buku-0.1.1.apk');
  });

  it('falls back to the tag when the release has no title', async () => {
    const resultPromise = adapter.latestStableRelease();
    const request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');

    request.flush([githubRelease({ tagName: 'v0.1.1', name: '' })]);

    const result = await resultPromise;

    expect(result.ok && result.release?.title).toBe('v0.1.1');
  });

  it('maps a status zero HTTP failure to network unavailable', async () => {
    const resultPromise = adapter.latestStableRelease();
    const request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');

    request.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await expectAsync(resultPromise).toBeResolvedTo({
      ok: false,
      reason: 'network-unavailable',
    });
  });

  it('maps non-network HTTP failures to source unavailable', async () => {
    const resultPromise = adapter.latestStableRelease();
    const request = http.expectOne('https://api.github.com/repos/riidhwan/buku/releases');

    request.flush({ message: 'rate limited' }, { status: 403, statusText: 'Forbidden' });

    await expectAsync(resultPromise).toBeResolvedTo({
      ok: false,
      reason: 'source-unavailable',
    });
  });
});

function githubRelease(input: {
  readonly tagName: string;
  readonly prerelease?: boolean;
  readonly draft?: boolean;
  readonly assetName?: string;
  readonly extraAssets?: readonly unknown[];
  readonly name?: string;
}) {
  const version = input.tagName.startsWith('v') ? input.tagName.slice(1) : input.tagName;
  const assetName = input.assetName ?? `buku-${version}.apk`;

  return {
    tag_name: input.tagName,
    name: input.name ?? `Buku ${input.tagName}`,
    body: 'Release notes',
    html_url: `https://github.example/releases/tag/${input.tagName}`,
    draft: input.draft ?? false,
    prerelease: input.prerelease ?? false,
    assets: [
      ...(input.extraAssets ?? []),
      {
        name: assetName,
        browser_download_url: `https://download.example/${assetName}`,
      },
    ].filter((asset) => asset !== undefined),
  };
}
