import { TestBed } from '@angular/core/testing';
import {
  EXPLORE_BROWSER_PLUGIN,
  ExploreBrowserPlugin,
  NativeArticleExtractionResult,
  NativeBrowserCapabilityEvent,
  NativeBrowserHistoryNavigationResult,
  NativeBrowserLoadFailedEvent,
  NativeBrowserNavigationState,
  NativeBrowserSecureNavigationFailureEvent,
} from './capacitor-explore-browser';
import { CapacitorExternalUrlOpenerAdapter } from './capacitor-external-url-opener.adapter';

class FakeExploreBrowserPlugin implements ExploreBrowserPlugin {
  public openedUrl: string | null = null;

  public show(): Promise<void> {
    return Promise.resolve();
  }
  public hide(): Promise<void> {
    return Promise.resolve();
  }
  public destroy(): Promise<void> {
    return Promise.resolve();
  }
  public load(): Promise<void> {
    return Promise.resolve();
  }
  public stop(): Promise<void> {
    return Promise.resolve();
  }
  public reload(): Promise<void> {
    return Promise.resolve();
  }
  public back(): Promise<NativeBrowserHistoryNavigationResult> {
    return Promise.resolve({ didNavigate: false });
  }
  public forward(): Promise<void> {
    return Promise.resolve();
  }
  public copyUrl(): Promise<void> {
    return Promise.resolve();
  }

  public openExternal(options: { readonly url: string }): Promise<void> {
    this.openedUrl = options.url;
    return Promise.resolve();
  }

  public extractArticle(): Promise<NativeArticleExtractionResult> {
    return Promise.resolve({
      status: 'unavailable',
    });
  }

  public addListener(
    _eventName: 'secureNavigationFailed',
    _listenerFunc: (event: NativeBrowserSecureNavigationFailureEvent) => void,
  ): Promise<{ remove(): Promise<void> }>;
  public addListener(
    _eventName: 'navigationState',
    _listenerFunc: (event: NativeBrowserNavigationState & { readonly committed: boolean }) => void,
  ): Promise<{ remove(): Promise<void> }>;
  public addListener(
    _eventName: 'loadFailed',
    _listenerFunc: (event: NativeBrowserLoadFailedEvent) => void,
  ): Promise<{ remove(): Promise<void> }>;
  public addListener(
    _eventName: 'capabilityUnsupported',
    _listenerFunc: (event: NativeBrowserCapabilityEvent) => void,
  ): Promise<{ remove(): Promise<void> }>;
  public addListener(): Promise<{ remove(): Promise<void> }> {
    return Promise.resolve({
      remove: () => Promise.resolve(),
    });
  }
}

describe('CapacitorExternalUrlOpenerAdapter', () => {
  it('opens URLs through the Explore browser plugin', async () => {
    const plugin = new FakeExploreBrowserPlugin();
    TestBed.configureTestingModule({
      providers: [
        CapacitorExternalUrlOpenerAdapter,
        { provide: EXPLORE_BROWSER_PLUGIN, useValue: plugin },
      ],
    });

    const adapter = TestBed.inject(CapacitorExternalUrlOpenerAdapter);

    await adapter.open('https://example.com/');

    expect(plugin.openedUrl).toBe('https://example.com/');
  });
});
