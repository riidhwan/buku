import { TestBed } from '@angular/core/testing';
import {
  CAPACITOR_PREFERENCES,
  CapacitorBrowserSessionStoreAdapter,
} from './capacitor-browser-session-store.adapter';

class FakePreferences {
  public readonly values = new Map<string, string>();

  public get(options: { readonly key: string }): Promise<{ readonly value: string | null }> {
    return Promise.resolve({ value: this.values.get(options.key) ?? null });
  }

  public set(options: { readonly key: string; readonly value: string }): Promise<void> {
    this.values.set(options.key, options.value);
    return Promise.resolve();
  }
}

describe('CapacitorBrowserSessionStoreAdapter', () => {
  let adapter: CapacitorBrowserSessionStoreAdapter;
  let preferences: FakePreferences;

  beforeEach(() => {
    preferences = new FakePreferences();
    TestBed.configureTestingModule({
      providers: [
        CapacitorBrowserSessionStoreAdapter,
        { provide: CAPACITOR_PREFERENCES, useValue: preferences },
      ],
    });

    adapter = TestBed.inject(CapacitorBrowserSessionStoreAdapter);
  });

  it('returns an empty tab session when no tabs are stored', async () => {
    await expectAsync(adapter.readTabSession()).toBeResolvedTo({
      tabs: [],
      selectedTabId: null,
    });
  });

  it('writes and reads tab sessions', async () => {
    const session = {
      tabs: [
        {
          id: 'tab-1',
          url: 'https://example.com/',
          pageTitle: 'Example Page',
          backStack: ['https://previous.example/'],
          lastLibrarySeriesTitle: 'Existing Series',
        },
        { id: 'tab-2', url: null, pageTitle: null, backStack: [], lastLibrarySeriesTitle: null },
      ],
      selectedTabId: 'tab-1',
    };

    await adapter.writeTabSession(session);

    await expectAsync(adapter.readTabSession()).toBeResolvedTo(session);
  });

  it('returns an empty tab session for invalid stored JSON', async () => {
    preferences.values.set('explore.browser.tabs', '{');

    await expectAsync(adapter.readTabSession()).toBeResolvedTo({
      tabs: [],
      selectedTabId: null,
    });
  });

  it('returns an empty tab session for invalid stored shapes', async () => {
    preferences.values.set('explore.browser.tabs', JSON.stringify('invalid'));

    await expectAsync(adapter.readTabSession()).toBeResolvedTo({
      tabs: [],
      selectedTabId: null,
    });
  });

  it('returns an empty tab list when stored tabs are missing', async () => {
    preferences.values.set(
      'explore.browser.tabs',
      JSON.stringify({
        selectedTabId: 'tab-1',
      }),
    );

    await expectAsync(adapter.readTabSession()).toBeResolvedTo({
      tabs: [],
      selectedTabId: null,
    });
  });

  it('drops invalid tab entries and invalid selected tab IDs', async () => {
    preferences.values.set(
      'explore.browser.tabs',
      JSON.stringify({
        tabs: [
          { id: 'tab-1', url: 'https://example.com/' },
          { id: 2, url: 'https://invalid.example/' },
        ],
        selectedTabId: 'missing-tab',
      }),
    );

    await expectAsync(adapter.readTabSession()).toBeResolvedTo({
      tabs: [
        {
          id: 'tab-1',
          url: 'https://example.com/',
          pageTitle: null,
          backStack: [],
          lastLibrarySeriesTitle: null,
        },
      ],
      selectedTabId: null,
    });
  });

  it('reads stored tab titles and treats blank titles as missing', async () => {
    preferences.values.set(
      'explore.browser.tabs',
      JSON.stringify({
        tabs: [
          {
            id: 'tab-1',
            url: 'https://one.example/',
            pageTitle: 'One Page',
            backStack: [],
            lastLibrarySeriesTitle: '  Story   Series  ',
          },
          { id: 'tab-2', url: 'https://two.example/', pageTitle: '  ', backStack: [] },
        ],
        selectedTabId: 'tab-1',
      }),
    );

    await expectAsync(adapter.readTabSession()).toBeResolvedTo({
      tabs: [
        {
          id: 'tab-1',
          url: 'https://one.example/',
          pageTitle: 'One Page',
          backStack: [],
          lastLibrarySeriesTitle: 'Story Series',
        },
        {
          id: 'tab-2',
          url: 'https://two.example/',
          pageTitle: null,
          backStack: [],
          lastLibrarySeriesTitle: null,
        },
      ],
      selectedTabId: 'tab-1',
    });
  });

  it('returns an empty back stack for malformed tab back stacks', async () => {
    preferences.values.set(
      'explore.browser.tabs',
      JSON.stringify({
        tabs: [
          { id: 'tab-1', url: 'https://one.example/', backStack: 'invalid' },
          { id: 'tab-2', url: 'https://two.example/', backStack: ['https://ok.example/', 1] },
        ],
        selectedTabId: 'tab-1',
      }),
    );

    await expectAsync(adapter.readTabSession()).toBeResolvedTo({
      tabs: [
        {
          id: 'tab-1',
          url: 'https://one.example/',
          pageTitle: null,
          backStack: [],
          lastLibrarySeriesTitle: null,
        },
        {
          id: 'tab-2',
          url: 'https://two.example/',
          pageTitle: null,
          backStack: [],
          lastLibrarySeriesTitle: null,
        },
      ],
      selectedTabId: 'tab-1',
    });
  });

  it('reads the legacy last URL for migration', async () => {
    preferences.values.set('explore.browser.lastUrl', 'https://example.com/');

    await expectAsync(adapter.readLegacyLastUrl()).toBeResolvedTo('https://example.com/');
  });

  it('wraps Capacitor Preferences in a plain injectable object', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const preferences = TestBed.inject(CAPACITOR_PREFERENCES);
    await preferences.set({ key: 'factory-key', value: 'https://factory.example/' });
    const result = await preferences.get({ key: 'key' });
    const storedResult = await preferences.get({ key: 'factory-key' });

    expect(result.value).toBeNull();
    expect(storedResult.value).toBe('https://factory.example/');
  });
});
