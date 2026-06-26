import { inject, InjectionToken, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BrowserSessionStorePort } from '../application/ports/browser-session-store.port';

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

@Injectable()
export class CapacitorBrowserSessionStoreAdapter implements BrowserSessionStorePort {
  private readonly preferences = inject(CAPACITOR_PREFERENCES);

  public async readLastUrl(): Promise<string | null> {
    const result = await this.preferences.get({ key: lastUrlKey });
    return result.value;
  }

  public async writeLastUrl(url: string): Promise<void> {
    await this.preferences.set({ key: lastUrlKey, value: url });
  }
}
