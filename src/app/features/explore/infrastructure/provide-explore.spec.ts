import { TestBed } from '@angular/core/testing';
import { ExploreBrowserFacade } from '../application/explore-browser.facade';
import { BROWSER_SESSION_STORE } from '../application/ports/browser-session-store.port';
import { BROWSER_VIEWPORT } from '../application/ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER } from '../application/ports/external-url-opener.port';
import { CapacitorBrowserSessionStoreAdapter } from './capacitor-browser-session-store.adapter';
import { CapacitorBrowserViewportAdapter } from './capacitor-browser-viewport.adapter';
import { CapacitorExternalUrlOpenerAdapter } from './capacitor-external-url-opener.adapter';
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
import { provideExplore } from './provide-explore';

class FakeExploreBrowserPlugin implements ExploreBrowserPlugin {
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
  public openExternal(): Promise<void> {
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

describe('provideExplore', () => {
  it('wires the Explore application ports to Capacitor adapters', () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideExplore(),
        { provide: EXPLORE_BROWSER_PLUGIN, useClass: FakeExploreBrowserPlugin },
      ],
    });

    expect(TestBed.inject(ExploreBrowserFacade)).toBeTruthy();
    expect(TestBed.inject(BROWSER_SESSION_STORE)).toBeInstanceOf(
      CapacitorBrowserSessionStoreAdapter,
    );
    expect(TestBed.inject(BROWSER_VIEWPORT)).toBeInstanceOf(CapacitorBrowserViewportAdapter);
    expect(TestBed.inject(EXTERNAL_URL_OPENER)).toBeInstanceOf(CapacitorExternalUrlOpenerAdapter);
  });
});
