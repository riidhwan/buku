import { InjectionToken } from '@angular/core';

export interface ExploreBrowserTab {
  readonly id: string;
  readonly url: string | null;
  readonly pageTitle: string | null;
  readonly backStack: readonly string[];
  readonly lastLibrarySeriesTitle: string | null;
}

export interface BrowserTabSession {
  readonly tabs: readonly ExploreBrowserTab[];
  readonly selectedTabId: string | null;
}

export interface BrowserSessionStorePort {
  readTabSession(): Promise<BrowserTabSession>;
  readLegacyLastUrl(): Promise<string | null>;
  writeTabSession(session: BrowserTabSession): Promise<void>;
}

export const BROWSER_SESSION_STORE = new InjectionToken<BrowserSessionStorePort>(
  'BROWSER_SESSION_STORE',
);
