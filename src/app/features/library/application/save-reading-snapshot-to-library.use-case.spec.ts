import { TestBed } from '@angular/core/testing';
import {
  LibraryDocument,
  LibrarySeriesRecord,
  LibraryStoredSeriesEntry,
} from '../domain/library-series';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import { LIBRARY_ID_GENERATOR, LibraryIdGenerator } from './ports/library-id-generator.port';
import {
  LibraryRepository,
  ResetSeriesEntryContentOverrideInput,
  ResetSeriesEntryContentOverrideRepositoryResult,
  SaveLibraryEntryInput,
  SaveLibraryEntryResult,
  SaveSeriesEntryContentOverrideInput,
  SaveSeriesEntryContentOverrideRepositoryResult,
} from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import {
  normalizeTitleKey,
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
  let repository: FakeLibraryRepository;
  let ids: string[];
  let useCase: SaveReadingSnapshotToLibraryUseCase;

  beforeEach(() => {
    repository = new FakeLibraryRepository();
    ids = ['series-created', 'entry-created'];

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
    expect(repository.document.series[0]?.title).toBe('New Series');
    expect(repository.document.series[0]?.entries[0]).toEqual({
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

  it('stores a null source host when the snapshot URL cannot be parsed', async () => {
    await useCase.execute({
      ...input({ target: { kind: 'title', title: 'New Series' } }),
      snapshot: {
        ...snapshot,
        url: 'not a url',
      },
    });

    expect(repository.document.series[0]?.entries[0]?.sourceHost).toBeNull();
  });

  it('saves into an existing Series on explicit or exact normalized match', async () => {
    repository.document = {
      series: [{ id: 'series-1', title: 'Existing Series', entries: [] }],
    };
    ids = ['series-unused', 'entry-created'];

    await expectAsync(
      useCase.execute(input({ target: { kind: 'title', title: 'existing   series' } })),
    ).toBeResolvedTo({ status: 'saved', seriesId: 'series-1', entryId: 'entry-created' });

    expect(repository.document.series.length).toBe(1);
    expect(repository.document.series[0]?.title).toBe('Existing Series');
  });

  it('rejects duplicate source URLs in the same Series', async () => {
    repository.document = {
      series: [
        {
          id: 'series-1',
          title: 'Series',
          entries: [entry({ id: 'entry-1', sourceUrl: snapshot.url })],
        },
      ],
    };

    await expectAsync(
      useCase.execute(input({ target: { kind: 'existing', seriesId: 'series-1' } })),
    ).toBeResolvedTo({ status: 'duplicate', seriesId: 'series-1', entryId: 'entry-1' });
  });

  it('allows the same source URL in a different Series', async () => {
    repository.document = {
      series: [
        {
          id: 'series-1',
          title: 'First Series',
          entries: [entry({ id: 'entry-1', sourceUrl: snapshot.url })],
        },
      ],
    };

    await expectAsync(
      useCase.execute(input({ target: { kind: 'title', title: 'Second Series' } })),
    ).toBeResolvedTo({ status: 'saved', seriesId: 'series-created', entryId: 'entry-created' });
  });

  it('returns typed persistence failure when writes fail', async () => {
    repository.failSave = true;

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

  it('preserves other Series while appending to an existing Series', async () => {
    repository.document = {
      series: [
        { id: 'series-1', title: 'First Series', entries: [] },
        { id: 'series-2', title: 'Second Series', entries: [] },
      ],
    };
    ids = ['entry-created'];

    await useCase.execute(input({ target: { kind: 'existing', seriesId: 'series-1' } }));

    expect(repository.document.series.map((series) => series.id)).toEqual(['series-1', 'series-2']);
    expect(repository.document.series[0]?.entries.length).toBe(1);
    expect(repository.document.series[1]?.entries.length).toBe(0);
  });
});

class FakeLibraryRepository implements LibraryRepository {
  public document: LibraryDocument = { series: [] };
  public failSave = false;

  public listSeries(): never {
    throw new Error('Not used in this spec.');
  }

  public getSeries(): never {
    throw new Error('Not used in this spec.');
  }

  public getEntry(): never {
    throw new Error('Not used in this spec.');
  }

  public saveEntry(input: SaveLibraryEntryInput): Promise<SaveLibraryEntryResult> {
    if (this.failSave) {
      return Promise.resolve({ ok: false, reason: 'persistenceFailed' });
    }

    const series = this.resolveSeries(input);
    if (series === null) {
      return Promise.resolve({ ok: true, status: 'missingSeries' });
    }

    const duplicate = series.entries.find((entry) => entry.sourceUrl === input.entry.sourceUrl);
    if (duplicate !== undefined) {
      return Promise.resolve({
        ok: true,
        status: 'duplicate',
        seriesId: series.id,
        entryId: duplicate.id,
      });
    }

    series.entries = [...series.entries, toEntry(series, input)];
    return Promise.resolve({
      ok: true,
      status: 'saved',
      seriesId: series.id,
      entryId: input.entry.id,
    });
  }

  public saveSeriesEntryContentOverride(
    _input: SaveSeriesEntryContentOverrideInput,
  ): Promise<SaveSeriesEntryContentOverrideRepositoryResult> {
    throw new Error('Not used in this spec.');
  }

  public resetSeriesEntryContentOverride(
    _input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideRepositoryResult> {
    throw new Error('Not used in this spec.');
  }

  private resolveSeries(input: SaveLibraryEntryInput): MutableSeriesRecord | null {
    if (input.target.kind === 'existing') {
      return this.mutableSeries().find((series) => series.id === input.target.seriesId) ?? null;
    }

    const normalizedTitle = input.target.normalizedTitle;
    const existing = this.mutableSeries().find(
      (series) => normalizeTitleKey(series.title) === normalizedTitle,
    );
    if (existing !== undefined) {
      return existing;
    }

    const created = { id: input.target.seriesId, title: input.target.title, entries: [] };
    this.document = { series: [...this.document.series, created] };
    return created;
  }

  private mutableSeries(): MutableSeriesRecord[] {
    return this.document.series as MutableSeriesRecord[];
  }
}

interface MutableSeriesRecord {
  readonly id: string;
  readonly title: string;
  entries: readonly LibraryStoredSeriesEntry[];
}

function toEntry(
  series: LibrarySeriesRecord,
  input: SaveLibraryEntryInput,
): LibraryStoredSeriesEntry {
  return {
    ...input.entry,
    seriesId: series.id,
    seriesTitle: series.title,
  };
}

function entry(override: {
  readonly id: string;
  readonly sourceUrl: string;
}): LibraryStoredSeriesEntry {
  return {
    id: override.id,
    seriesId: 'series-1',
    seriesTitle: 'Series',
    displayTitle: 'Existing',
    sourceUrl: override.sourceUrl,
    sourceHost: 'example.com',
    articleTitle: 'Existing',
    byline: null,
    siteName: null,
    publishedTime: null,
    contentHtml: '<p>Existing</p>',
    createdAt: '2026-06-26T10:00:00.000Z',
    updatedAt: '2026-06-26T10:00:00.000Z',
  };
}

function input(
  override: Pick<SaveReadingSnapshotToLibraryInput, 'target'>,
): SaveReadingSnapshotToLibraryInput {
  return {
    snapshot,
    entryTitle: ' Chapter 1 ',
    target: override.target,
  };
}
