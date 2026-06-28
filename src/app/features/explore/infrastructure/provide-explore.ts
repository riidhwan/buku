import { Provider } from '@angular/core';
import { BrowserUrlPolicy } from '../application/browser-url-policy';
import { ExploreBrowserFacade } from '../application/explore-browser.facade';
import { ExploreReadingChapterNavigator } from '../application/explore-reading-chapter-navigator';
import { BROWSER_SESSION_STORE } from '../application/ports/browser-session-store.port';
import { BROWSER_VIEWPORT } from '../application/ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER } from '../application/ports/external-url-opener.port';
import { CapacitorBrowserSessionStoreAdapter } from './capacitor-browser-session-store.adapter';
import { CapacitorBrowserViewportAdapter } from './capacitor-browser-viewport.adapter';
import { CapacitorExternalUrlOpenerAdapter } from './capacitor-external-url-opener.adapter';

export function provideExplore(): Provider[] {
  return [
    BrowserUrlPolicy,
    ExploreReadingChapterNavigator,
    ExploreBrowserFacade,
    CapacitorBrowserSessionStoreAdapter,
    CapacitorBrowserViewportAdapter,
    CapacitorExternalUrlOpenerAdapter,
    {
      provide: BROWSER_SESSION_STORE,
      useExisting: CapacitorBrowserSessionStoreAdapter,
    },
    {
      provide: BROWSER_VIEWPORT,
      useExisting: CapacitorBrowserViewportAdapter,
    },
    {
      provide: EXTERNAL_URL_OPENER,
      useExisting: CapacitorExternalUrlOpenerAdapter,
    },
  ];
}
