import { TestBed } from '@angular/core/testing';
import { LibraryFacade } from './library.facade';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import { LIBRARY_ID_GENERATOR, LibraryIdGenerator } from './ports/library-id-generator.port';
import { LibraryRepository } from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import { SaveReadingSnapshotToLibraryUseCase } from './save-reading-snapshot-to-library.use-case';

describe('LibraryFacade', () => {
  it('loads sorted Series summaries and entry details from the repository', async () => {
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
      load: () =>
        Promise.resolve({
          ok: true,
          document: {
            series: [
              {
                id: 'series-2',
                title: 'Newer Series',
                entries: [
                  {
                    ...entry,
                    id: 'entry-2',
                    seriesId: 'series-2',
                    seriesTitle: 'Newer Series',
                    createdAt: '2026-02-12T09:30:00.000Z',
                    updatedAt: '2026-02-12T09:30:00.000Z',
                  },
                ],
              },
              {
                id: 'series-1',
                title: 'Mock Series',
                entries: [
                  entry,
                  {
                    ...entry,
                    id: 'entry-newer',
                    createdAt: '2026-01-13T09:30:00.000Z',
                    updatedAt: '2026-01-13T09:30:00.000Z',
                  },
                  {
                    ...entry,
                    id: 'entry-older',
                    createdAt: '2026-01-12T10:30:00.000Z',
                    updatedAt: '2026-01-12T10:30:00.000Z',
                  },
                ],
              },
            ],
          },
        }),
      save: () => Promise.resolve({ ok: true }),
    };
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

    const facade = TestBed.inject(LibraryFacade);

    await expectAsync(facade.listSeries()).toBeResolvedTo([
      {
        id: 'series-2',
        title: 'Newer Series',
        entryCount: 1,
        lastSavedAt: '2026-02-12T09:30:00.000Z',
      },
      {
        id: 'series-1',
        title: 'Mock Series',
        entryCount: 3,
        lastSavedAt: '2026-01-13T09:30:00.000Z',
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
        {
          id: 'entry-older',
          seriesId: 'series-1',
          displayTitle: 'Entry 1',
          sourceHost: 'example.com',
          createdAt: '2026-01-12T10:30:00.000Z',
          updatedAt: '2026-01-12T10:30:00.000Z',
        },
        {
          id: 'entry-newer',
          seriesId: 'series-1',
          displayTitle: 'Entry 1',
          sourceHost: 'example.com',
          createdAt: '2026-01-13T09:30:00.000Z',
          updatedAt: '2026-01-13T09:30:00.000Z',
        },
      ],
    });
    await expectAsync(facade.getEntry('series-1', 'entry-1')).toBeResolvedTo(entry);
    await expectAsync(facade.getSeries('missing-series')).toBeResolvedTo(null);
    await expectAsync(facade.getEntry('series-1', 'missing-entry')).toBeResolvedTo(null);
  });

  it('returns empty and null reads when repository loading fails or records are missing', async () => {
    const repository: LibraryRepository = {
      load: () => Promise.resolve({ ok: false, reason: 'persistenceFailed' }),
      save: () => Promise.resolve({ ok: true }),
    };
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

    const facade = TestBed.inject(LibraryFacade);

    await expectAsync(facade.listSeries()).toBeResolvedTo([]);
    await expectAsync(facade.getSeries('missing')).toBeResolvedTo(null);
    await expectAsync(facade.getEntry('missing', 'entry')).toBeResolvedTo(null);
  });
});
