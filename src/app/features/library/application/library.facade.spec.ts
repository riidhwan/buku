import { TestBed } from '@angular/core/testing';
import { LibraryFacade } from './library.facade';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import {
  LIBRARY_CONTENT_SANITIZER,
  LibraryContentSanitizer,
} from './ports/library-content-sanitizer.port';
import { LIBRARY_ID_GENERATOR, LibraryIdGenerator } from './ports/library-id-generator.port';
import { LibraryRepository } from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import {
  SERIES_ENTRY_READING_APPEARANCE_STORE,
  SeriesEntryReadingAppearanceStore,
} from './ports/series-entry-reading-appearance-store.port';
import { ResetSeriesEntryContentOverrideUseCase } from './reset-series-entry-content-override.use-case';
import { SaveSeriesEntryContentOverrideUseCase } from './save-series-entry-content-override.use-case';
import { SaveReadingSnapshotToLibraryUseCase } from './save-reading-snapshot-to-library.use-case';

describe('LibraryFacade', () => {
  it('returns repository Series summaries and entry details', async () => {
    const entry = {
      id: 'entry-1',
      seriesId: 'series-1',
      seriesTitle: 'Mock Series',
      displayTitle: 'Entry 1',
      sourceUrl: 'https://example.com/entry-1',
      sourceHost: 'example.com',
      articleTitle: 'Article 1',
      byline: null,
      siteName: null,
      publishedTime: null,
      originalContentHtml: '<p>Content</p>',
      contentOverrideHtml: null,
      effectiveContentHtml: '<p>Content</p>',
      hasContentOverride: false,
      createdAt: '2026-01-12T09:30:00.000Z',
      updatedAt: '2026-01-12T09:30:00.000Z',
    };
    const repository: LibraryRepository = {
      listSeries: () =>
        Promise.resolve({
          ok: true,
          series: [
            {
              id: 'series-1',
              title: 'Mock Series',
              entryCount: 1,
              lastSavedAt: '2026-01-12T09:30:00.000Z',
            },
          ],
        }),
      getSeries: () =>
        Promise.resolve({
          ok: true,
          series: {
            id: 'series-1',
            title: 'Mock Series',
            entries: [
              {
                id: 'entry-1',
                seriesId: 'series-1',
                displayTitle: 'Entry 1',
                sourceHost: 'example.com',
                createdAt: '2026-01-12T09:30:00.000Z',
                updatedAt: '2026-01-12T09:30:00.000Z',
              },
            ],
          },
        }),
      getEntry: () => Promise.resolve({ ok: true, entry }),
      saveEntry: (input) =>
        Promise.resolve({
          ok: true,
          status: 'saved',
          seriesId: 'series-1',
          entryId: input.entry.id,
        }),
      saveSeriesEntryContentOverride: () => Promise.resolve({ ok: true, status: 'saved' }),
      resetSeriesEntryContentOverride: () => Promise.resolve({ ok: true, status: 'reset' }),
    };
    const facade = createFacade(repository);

    await expectAsync(facade.listSeries()).toBeResolvedTo([
      {
        id: 'series-1',
        title: 'Mock Series',
        entryCount: 1,
        lastSavedAt: '2026-01-12T09:30:00.000Z',
      },
    ]);
    await expectAsync(facade.getSeries('series-1')).toBeResolvedTo({
      id: 'series-1',
      title: 'Mock Series',
      entries: [
        {
          id: 'entry-1',
          seriesId: 'series-1',
          displayTitle: 'Entry 1',
          sourceHost: 'example.com',
          createdAt: '2026-01-12T09:30:00.000Z',
          updatedAt: '2026-01-12T09:30:00.000Z',
        },
      ],
    });
    await expectAsync(facade.getEntry('series-1', 'entry-1')).toBeResolvedTo(entry);
    await expectAsync(facade.getSeriesEntryReadingAppearance()).toBeResolvedTo({
      fontId: 'nv-charis',
      colorSchemeId: 'system',
    });
    await expectAsync(
      facade.saveSeriesEntryReadingAppearance({ fontId: 'libron', colorSchemeId: 'sepia' }),
    ).toBeResolved();
    await expectAsync(
      facade.saveReadingSnapshot({
        snapshot: {
          url: 'https://example.com/entry-2',
          title: 'Article 2',
          byline: null,
          siteName: null,
          publishedTime: null,
          contentHtml: '<p>Content</p>',
        },
        entryTitle: 'Entry 2',
        target: { kind: 'title', title: 'Mock Series' },
      }),
    ).toBeResolvedTo({ status: 'saved', seriesId: 'series-1', entryId: 'id' });
    await expectAsync(
      facade.saveSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<p>Edited</p>',
      }),
    ).toBeResolvedTo({ status: 'saved' });
    await expectAsync(
      facade.resetSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'entry-1',
      }),
    ).toBeResolvedTo({ status: 'reset' });
  });

  it('returns empty and null reads when repository operations fail', async () => {
    const repository: LibraryRepository = {
      listSeries: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      getSeries: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      getEntry: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      saveEntry: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      saveSeriesEntryContentOverride: () =>
        Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      resetSeriesEntryContentOverride: () =>
        Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
    };
    const facade = createFacade(repository);

    await expectAsync(facade.listSeries()).toBeResolvedTo([]);
    await expectAsync(facade.getSeries('missing')).toBeResolvedTo(null);
    await expectAsync(facade.getEntry('missing', 'entry')).toBeResolvedTo(null);
  });
});

function createFacade(repository: LibraryRepository): LibraryFacade {
  const clock: LibraryClock = { now: () => '2026-06-27T10:00:00.000Z' };
  const idGenerator: LibraryIdGenerator = { createId: () => 'id' };
  const sanitizer: LibraryContentSanitizer = {
    sanitizeContentHtml: (contentHtml) => ({ contentHtml, hasRenderableContent: true }),
  };
  const appearanceStore: SeriesEntryReadingAppearanceStore = {
    readAppearance: () => Promise.resolve({ fontId: 'nv-charis', colorSchemeId: 'system' }),
    saveAppearance: () => Promise.resolve(),
  };

  TestBed.configureTestingModule({
    providers: [
      LibraryFacade,
      SaveReadingSnapshotToLibraryUseCase,
      SaveSeriesEntryContentOverrideUseCase,
      ResetSeriesEntryContentOverrideUseCase,
      { provide: LIBRARY_REPOSITORY, useValue: repository },
      { provide: LIBRARY_CLOCK, useValue: clock },
      { provide: LIBRARY_ID_GENERATOR, useValue: idGenerator },
      { provide: LIBRARY_CONTENT_SANITIZER, useValue: sanitizer },
      { provide: SERIES_ENTRY_READING_APPEARANCE_STORE, useValue: appearanceStore },
    ],
  });

  return TestBed.inject(LibraryFacade);
}
