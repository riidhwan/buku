import { inject, InjectionToken, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  defaultReadingAppearance,
  normalizeReadingAppearance,
  ReadingAppearance,
} from '../../../shared/domain/reading-appearance';
import { ReadingAppearanceStore } from '../../../shared/application/reading-appearance-store.port';

interface PreferencesPort {
  get(options: { readonly key: string }): Promise<{ readonly value: string | null }>;
  set(options: { readonly key: string; readonly value: string }): Promise<void>;
}

export const LIBRARY_CAPACITOR_PREFERENCES = new InjectionToken<PreferencesPort>(
  'LIBRARY_CAPACITOR_PREFERENCES',
  {
    factory: () => ({
      get: (options) => Preferences.get(options),
      set: (options) => Preferences.set(options),
    }),
  },
);

const appearanceKey = 'library.seriesEntryReading.appearance';

@Injectable()
export class CapacitorSeriesEntryReadingAppearanceStoreAdapter implements ReadingAppearanceStore {
  private readonly preferences = inject(LIBRARY_CAPACITOR_PREFERENCES);

  public async readAppearance(): Promise<ReadingAppearance> {
    const result = await this.preferences.get({ key: appearanceKey });
    if (result.value === null) {
      return defaultReadingAppearance;
    }

    try {
      return normalizeReadingAppearance(JSON.parse(result.value));
    } catch (_error) {
      return defaultReadingAppearance;
    }
  }

  public async saveAppearance(appearance: ReadingAppearance): Promise<void> {
    await this.preferences.set({
      key: appearanceKey,
      value: JSON.stringify(normalizeReadingAppearance(appearance)),
    });
  }
}
