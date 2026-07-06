import { inject, InjectionToken, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  defaultSeriesEntryReadingAppearance,
  normalizeSeriesEntryReadingAppearance,
  SeriesEntryReadingAppearance,
} from '../domain/series-entry-reading-appearance';
import { SeriesEntryReadingAppearanceStore } from '../application/ports/series-entry-reading-appearance-store.port';

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
export class CapacitorSeriesEntryReadingAppearanceStoreAdapter implements SeriesEntryReadingAppearanceStore {
  private readonly preferences = inject(LIBRARY_CAPACITOR_PREFERENCES);

  public async readAppearance(): Promise<SeriesEntryReadingAppearance> {
    const result = await this.preferences.get({ key: appearanceKey });
    if (result.value === null) {
      return defaultSeriesEntryReadingAppearance;
    }

    try {
      return normalizeSeriesEntryReadingAppearance(JSON.parse(result.value));
    } catch (_error) {
      return defaultSeriesEntryReadingAppearance;
    }
  }

  public async saveAppearance(appearance: SeriesEntryReadingAppearance): Promise<void> {
    await this.preferences.set({
      key: appearanceKey,
      value: JSON.stringify(normalizeSeriesEntryReadingAppearance(appearance)),
    });
  }
}
