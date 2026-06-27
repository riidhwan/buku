import { TestBed } from '@angular/core/testing';
import {
  LIBRARY_CAPACITOR_PREFERENCES,
  LibraryPreferencesAdapter,
} from './library-preferences.adapter';
import { LibraryDocument } from '../domain/library-series';

class FakePreferences {
  public readonly values = new Map<string, string>();
  public failWrites = false;
  public failReads = false;

  public get(options: { readonly key: string }): Promise<{ readonly value: string | null }> {
    if (this.failReads) {
      return Promise.reject(new Error('read failed'));
    }

    return Promise.resolve({ value: this.values.get(options.key) ?? null });
  }

  public set(options: { readonly key: string; readonly value: string }): Promise<void> {
    if (this.failWrites) {
      return Promise.reject(new Error('write failed'));
    }

    this.values.set(options.key, options.value);
    return Promise.resolve();
  }
}

describe('LibraryPreferencesAdapter', () => {
  let adapter: LibraryPreferencesAdapter;
  let preferences: FakePreferences;

  beforeEach(() => {
    preferences = new FakePreferences();
    TestBed.configureTestingModule({
      providers: [
        LibraryPreferencesAdapter,
        { provide: LIBRARY_CAPACITOR_PREFERENCES, useValue: preferences },
      ],
    });

    adapter = TestBed.inject(LibraryPreferencesAdapter);
  });

  it('reads an empty Library when no document exists', async () => {
    await expectAsync(adapter.load()).toBeResolvedTo({ ok: true, document: { series: [] } });
  });

  it('persists and reloads a versioned document', async () => {
    const document: LibraryDocument = {
      series: [
        {
          id: 'series-1',
          title: 'Series',
          entries: [
            {
              id: 'entry-1',
              seriesId: 'series-1',
              seriesTitle: 'Series',
              displayTitle: 'Entry',
              sourceUrl: 'https://example.com/entry',
              sourceHost: 'example.com',
              articleTitle: 'Article',
              byline: null,
              siteName: 'Example',
              publishedTime: null,
              contentHtml: '<p>Body</p>',
              createdAt: '2026-06-27T10:00:00.000Z',
              updatedAt: '2026-06-27T10:00:00.000Z',
            },
          ],
        },
      ],
    };

    await expectAsync(adapter.save(document)).toBeResolvedTo({ ok: true });
    await expectAsync(adapter.load()).toBeResolvedTo({ ok: true, document });
  });

  it('returns a typed persistence failure when writes fail', async () => {
    preferences.failWrites = true;

    await expectAsync(adapter.save({ series: [] })).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
  });

  it('returns a typed persistence failure when reads or JSON parsing fail', async () => {
    preferences.failReads = true;
    await expectAsync(adapter.load()).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });

    preferences.failReads = false;
    preferences.values.set('library.document', '{');
    await expectAsync(adapter.load()).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
  });

  it('ignores unrelated or invalid stored data', async () => {
    preferences.values.set('library.document', JSON.stringify({ mockSeries: [{ id: 'demo' }] }));

    await expectAsync(adapter.load()).toBeResolvedTo({ ok: true, document: { series: [] } });
  });

  it('wraps Capacitor Preferences in a plain injectable object', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const preferences = TestBed.inject(LIBRARY_CAPACITOR_PREFERENCES);
    await expectAsync(preferences.get({ key: 'missing-library-key' })).toBeResolvedTo({
      value: null,
    });
  });
});
