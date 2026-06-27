import { TestBed } from '@angular/core/testing';
import { LibraryDocument } from '../domain/library-series';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import { LIBRARY_ID_GENERATOR, LibraryIdGenerator } from './ports/library-id-generator.port';
import { LibraryRepository } from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import {
  SaveReadingSnapshotToLibraryInput,
  SaveReadingSnapshotToLibraryUseCase,
} from './save-reading-snapshot-to-library.use-case';

const snapshot = {
  url: 'https://example.com/story/chapter-1',
  title: 'Chapter 1',
  byline: 'A Writer',
  siteName: 'Example Reads',
  publishedTime: '2026-06-27T00:00:00.000Z',
  contentHtml: '<p>Body</p>',
};

describe('SaveReadingSnapshotToLibraryUseCase', () => {
  let document: LibraryDocument;
  let savedDocument: LibraryDocument | null;
  let failSave: boolean;
  let failLoad: boolean;
  let ids: string[];
  let useCase: SaveReadingSnapshotToLibraryUseCase;

  beforeEach(() => {
    document = { series: [] };
    savedDocument = null;
    failSave = false;
    failLoad = false;
    ids = ['series-created', 'entry-created'];

    const repository: LibraryRepository = {
      load: () =>
        Promise.resolve(
          failLoad ? { ok: false, reason: 'persistenceFailed' } : { ok: true, document },
        ),
      save: (nextDocument) => {
        if (failSave) {
          return Promise.resolve({ ok: false, reason: 'persistenceFailed' });
        }

        savedDocument = nextDocument;
        document = nextDocument;
        return Promise.resolve({ ok: true });
      },
    };
    const clock: LibraryClock = { now: () => '2026-06-27T10:00:00.000Z' };
    const idGenerator: LibraryIdGenerator = {
      createId: () => ids.shift() ?? 'fallback-id',
    };

    TestBed.configureTestingModule({
      providers: [
        SaveReadingSnapshotToLibraryUseCase,
        { provide: LIBRARY_REPOSITORY, useValue: repository },
        { provide: LIBRARY_CLOCK, useValue: clock },
        { provide: LIBRARY_ID_GENERATOR, useValue: idGenerator },
      ],
    });

    useCase = TestBed.inject(SaveReadingSnapshotToLibraryUseCase);
  });

  it('creates a new Series and Entry from a Reading Mode snapshot', async () => {
    const result = await useCase.execute(
      input({ target: { kind: 'title', title: '  New   Series ' } }),
    );

    expect(result).toEqual({
      status: 'saved',
      seriesId: 'series-created',
      entryId: 'entry-created',
    });
    expect(savedDocument?.series[0]?.title).toBe('New Series');
    expect(savedDocument?.series[0]?.entries[0]).toEqual({
      id: 'entry-created',
      seriesId: 'series-created',
      seriesTitle: 'New Series',
      displayTitle: 'Chapter 1',
      sourceUrl: 'https://example.com/story/chapter-1',
      sourceHost: 'example.com',
      articleTitle: 'Chapter 1',
      byline: 'A Writer',
      siteName: 'Example Reads',
      publishedTime: '2026-06-27T00:00:00.000Z',
      contentHtml: '<p>Body</p>',
      createdAt: '2026-06-27T10:00:00.000Z',
      updatedAt: '2026-06-27T10:00:00.000Z',
    });
  });

  it('saves into an existing Series on explicit or exact normalized match', async () => {
    document = {
      series: [{ id: 'series-1', title: 'Existing Series', entries: [] }],
    };
    ids = ['entry-created'];

    await expectAsync(
      useCase.execute(input({ target: { kind: 'title', title: 'existing   series' } })),
    ).toBeResolvedTo({ status: 'saved', seriesId: 'series-1', entryId: 'entry-created' });

    expect(savedDocument?.series.length).toBe(1);
    expect(savedDocument?.series[0]?.title).toBe('Existing Series');
  });

  it('rejects duplicate source URLs in the same Series', async () => {
    document = {
      series: [
        {
          id: 'series-1',
          title: 'Series',
          entries: [
            {
              id: 'entry-1',
              seriesId: 'series-1',
              seriesTitle: 'Series',
              displayTitle: 'Existing',
              sourceUrl: snapshot.url,
              sourceHost: 'example.com',
              articleTitle: 'Existing',
              byline: null,
              siteName: null,
              publishedTime: null,
              contentHtml: '<p>Existing</p>',
              createdAt: '2026-06-26T10:00:00.000Z',
              updatedAt: '2026-06-26T10:00:00.000Z',
            },
          ],
        },
      ],
    };

    await expectAsync(
      useCase.execute(input({ target: { kind: 'existing', seriesId: 'series-1' } })),
    ).toBeResolvedTo({ status: 'duplicate', seriesId: 'series-1', entryId: 'entry-1' });
  });

  it('allows the same source URL in a different Series', async () => {
    document = {
      series: [
        {
          id: 'series-1',
          title: 'First Series',
          entries: [
            {
              id: 'entry-1',
              seriesId: 'series-1',
              seriesTitle: 'First Series',
              displayTitle: 'Existing',
              sourceUrl: snapshot.url,
              sourceHost: 'example.com',
              articleTitle: 'Existing',
              byline: null,
              siteName: null,
              publishedTime: null,
              contentHtml: '<p>Existing</p>',
              createdAt: '2026-06-26T10:00:00.000Z',
              updatedAt: '2026-06-26T10:00:00.000Z',
            },
          ],
        },
      ],
    };

    await expectAsync(
      useCase.execute(input({ target: { kind: 'title', title: 'Second Series' } })),
    ).toBeResolvedTo({ status: 'saved', seriesId: 'series-created', entryId: 'entry-created' });
  });

  it('returns typed persistence failure when writes fail', async () => {
    failSave = true;

    await expectAsync(
      useCase.execute(input({ target: { kind: 'title', title: 'Series' } })),
    ).toBeResolvedTo({ status: 'persistenceFailed' });
  });

  it('validates required titles and missing existing Series', async () => {
    await expectAsync(
      useCase.execute({ ...input({ target: { kind: 'title', title: ' ' } }), entryTitle: ' ' }),
    ).toBeResolvedTo({
      status: 'validationFailed',
      message: 'Series and entry title are required.',
    });

    await expectAsync(
      useCase.execute(input({ target: { kind: 'existing', seriesId: 'missing-series' } })),
    ).toBeResolvedTo({
      status: 'validationFailed',
      message: 'Selected Series is no longer available.',
    });
  });

  it('returns typed persistence failure when loading fails', async () => {
    failLoad = true;

    await expectAsync(
      useCase.execute(input({ target: { kind: 'title', title: 'Series' } })),
    ).toBeResolvedTo({ status: 'persistenceFailed' });
  });

  it('preserves other Series while appending to an existing Series', async () => {
    document = {
      series: [
        { id: 'series-1', title: 'First Series', entries: [] },
        { id: 'series-2', title: 'Second Series', entries: [] },
      ],
    };
    ids = ['entry-created'];

    await useCase.execute(input({ target: { kind: 'existing', seriesId: 'series-1' } }));

    expect(savedDocument?.series.map((series) => series.id)).toEqual(['series-1', 'series-2']);
    expect(savedDocument?.series[0]?.entries.length).toBe(1);
    expect(savedDocument?.series[1]?.entries.length).toBe(0);
  });
});

function input(
  override: Pick<SaveReadingSnapshotToLibraryInput, 'target'>,
): SaveReadingSnapshotToLibraryInput {
  return {
    snapshot,
    entryTitle: ' Chapter 1 ',
    target: override.target,
  };
}
