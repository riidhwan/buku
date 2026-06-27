import { TestBed } from '@angular/core/testing';
import { LibraryFacade } from './library.facade';
import { LibraryRepository } from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';

describe('LibraryFacade', () => {
  const series = {
    id: 'series-1',
    title: 'Mock Series',
    entries: [],
  };
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

  it('loads Series summaries from the repository', () => {
    const repository: LibraryRepository = {
      listSeries: () => [
        {
          id: 'series-1',
          title: 'Mock Series',
          entryCount: 1,
          lastSavedAt: '2026-01-12T09:30:00.000Z',
        },
      ],
      getSeries: () => series,
      getEntry: () => entry,
    };

    TestBed.configureTestingModule({
      providers: [LibraryFacade, { provide: LIBRARY_REPOSITORY, useValue: repository }],
    });

    const facade = TestBed.inject(LibraryFacade);

    expect(facade.listSeries()).toEqual([
      {
        id: 'series-1',
        title: 'Mock Series',
        entryCount: 1,
        lastSavedAt: '2026-01-12T09:30:00.000Z',
      },
    ]);
    expect(facade.getSeries('series-1')).toBe(series);
    expect(facade.getEntry('series-1', 'entry-1')).toBe(entry);
  });
});
