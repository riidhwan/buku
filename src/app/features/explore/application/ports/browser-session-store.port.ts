import { InjectionToken } from '@angular/core';

export interface BrowserSessionStorePort {
  readLastUrl(): Promise<string | null>;
  writeLastUrl(url: string): Promise<void>;
}

export const BROWSER_SESSION_STORE = new InjectionToken<BrowserSessionStorePort>(
  'BROWSER_SESSION_STORE',
);
