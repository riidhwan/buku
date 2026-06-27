import { TestBed } from '@angular/core/testing';
import { LibraryFacade } from './library.facade';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import { LIBRARY_ID_GENERATOR, LibraryIdGenerator } from './ports/library-id-generator.port';
import { LibraryRepository } from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
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
      contentHtml: '<p>Content</p>',
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
  });

  it('returns empty and null reads when repository operations fail', async () => {
    const repository: LibraryRepository = {
      listSeries: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      getSeries: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      getEntry: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      saveEntry: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
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

  TestBed.configureTestingModule({
    providers: [
      LibraryFacade,
      SaveReadingSnapshotToLibraryUseCase,
      { provide: LIBRARY_REPOSITORY, useValue: repository },
      { provide: LIBRARY_CLOCK, useValue: clock },
      { provide: LIBRARY_ID_GENERATOR, useValue: idGenerator },
    ],
  });

  return TestBed.inject(LibraryFacade);
}
