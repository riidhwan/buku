import { inject, InjectionToken, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  BrowserSessionStorePort,
  BrowserTabSession,
  ExploreBrowserTab,
} from '../application/ports/browser-session-store.port';

interface PreferencesPort {
  get(options: { readonly key: string }): Promise<{ readonly value: string | null }>;
  set(options: { readonly key: string; readonly value: string }): Promise<void>;
}

export const CAPACITOR_PREFERENCES = new InjectionToken<PreferencesPort>('CAPACITOR_PREFERENCES', {
  factory: () => ({
    get: (options) => Preferences.get(options),
    set: (options) => Preferences.set(options),
  }),
});

const lastUrlKey = 'explore.browser.lastUrl';
const tabSessionKey = 'explore.browser.tabs';

@Injectable()
export class CapacitorBrowserSessionStoreAdapter implements BrowserSessionStorePort {
  private readonly preferences = inject(CAPACITOR_PREFERENCES);

  public async readTabSession(): Promise<BrowserTabSession> {
    const result = await this.preferences.get({ key: tabSessionKey });
    if (result.value === null) {
      return { tabs: [], selectedTabId: null };
    }

    try {
      return this.parseSession(JSON.parse(result.value));
    } catch (_error) {
      return { tabs: [], selectedTabId: null };
    }
  }

  public async readLegacyLastUrl(): Promise<string | null> {
    const result = await this.preferences.get({ key: lastUrlKey });
    return result.value;
  }

  public async writeTabSession(session: BrowserTabSession): Promise<void> {
    await this.preferences.set({ key: tabSessionKey, value: JSON.stringify(session) });
  }

  private parseSession(value: unknown): BrowserTabSession {
    if (!this.isRecord(value)) {
      return { tabs: [], selectedTabId: null };
    }

    const rawTabs = value['tabs'];
    const tabs = Array.isArray(rawTabs)
      ? rawTabs.filter((tab): tab is ExploreBrowserTab => this.isTab(tab))
      : [];
    const rawSelectedTabId = value['selectedTabId'];
    const selectedTabId =
      typeof rawSelectedTabId === 'string' && tabs.some((tab) => tab.id === rawSelectedTabId)
        ? rawSelectedTabId
        : null;

    return { tabs, selectedTabId };
  }

  private isTab(value: unknown): value is ExploreBrowserTab {
    return (
      this.isRecord(value) &&
      typeof value['id'] === 'string' &&
      (typeof value['url'] === 'string' || value['url'] === null)
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
