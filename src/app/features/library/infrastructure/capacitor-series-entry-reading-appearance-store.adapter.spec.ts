import { TestBed } from '@angular/core/testing';
import { defaultSeriesEntryReadingAppearance } from '../domain/series-entry-reading-appearance';
import {
  CapacitorSeriesEntryReadingAppearanceStoreAdapter,
  LIBRARY_CAPACITOR_PREFERENCES,
} from './capacitor-series-entry-reading-appearance-store.adapter';

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

describe('CapacitorSeriesEntryReadingAppearanceStoreAdapter', () => {
  let adapter: CapacitorSeriesEntryReadingAppearanceStoreAdapter;
  let preferences: FakePreferences;

  beforeEach(() => {
    preferences = new FakePreferences();
    TestBed.configureTestingModule({
      providers: [
        CapacitorSeriesEntryReadingAppearanceStoreAdapter,
        { provide: LIBRARY_CAPACITOR_PREFERENCES, useValue: preferences },
      ],
    });

    adapter = TestBed.inject(CapacitorSeriesEntryReadingAppearanceStoreAdapter);
  });

  it('returns NV Charis when no appearance is stored', async () => {
    await expectAsync(adapter.readAppearance()).toBeResolvedTo(defaultSeriesEntryReadingAppearance);
  });

  it('writes and reads the selected font id', async () => {
    await adapter.saveAppearance({ fontId: 'libron' });

    await expectAsync(adapter.readAppearance()).toBeResolvedTo({ fontId: 'libron' });
  });

  it('falls back to NV Charis for invalid stored values', async () => {
    preferences.values.set('library.seriesEntryReading.appearance', '{');

    await expectAsync(adapter.readAppearance()).toBeResolvedTo(defaultSeriesEntryReadingAppearance);

    preferences.values.set(
      'library.seriesEntryReading.appearance',
      JSON.stringify({ fontId: 'missing-font' }),
    );

    await expectAsync(adapter.readAppearance()).toBeResolvedTo(defaultSeriesEntryReadingAppearance);
  });

  it('wraps Capacitor Preferences in a plain injectable object', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const capacitorPreferences = TestBed.inject(LIBRARY_CAPACITOR_PREFERENCES);
    await capacitorPreferences.set({
      key: 'library.seriesEntryReading.appearance.factory',
      value: JSON.stringify({ fontId: 'cartisse' }),
    });
    const result = await capacitorPreferences.get({
      key: 'library.seriesEntryReading.appearance.factory',
    });

    expect(result.value).toBe(JSON.stringify({ fontId: 'cartisse' }));
  });
});
