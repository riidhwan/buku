import { TestBed } from '@angular/core/testing';

import { bindSqliteStatement } from '@core/storage/sqlite/sqlite-bindings';
import { SqliteDatabase } from '@core/storage/sqlite/sqlite-database';
import { SQLITE_DATABASE } from '@core/storage/sqlite/sqlite-database.token';
import { SqliteRow, SqliteStatementValues, SqliteValues } from '@core/storage/sqlite/sqlite-value';

import { LIBRARY_CLOCK, LibraryClock } from '../../application/ports/library-clock.port';
import { SaveLibraryEntryInput } from '../../application/ports/library-repository.port';
import { LibraryDocument } from '../../domain/library-series';
import { LibraryLegacyPreferencesStore } from '../library-legacy-preferences.store';
import { SqliteLibraryRepositoryAdapter } from './sqlite-library-repository.adapter';

describe('SqliteLibraryRepositoryAdapter', () => {
  let database: FakeSqliteDatabase;
  let legacyStore: FakeLegacyStore;
  let repository: SqliteLibraryRepositoryAdapter;

  beforeEach(() => {
    database = new FakeSqliteDatabase();
    legacyStore = new FakeLegacyStore();
    const clock: LibraryClock = { now: () => '2026-06-27T10:00:00.000Z' };

    TestBed.configureTestingModule({
      providers: [
        SqliteLibraryRepositoryAdapter,
        { provide: SQLITE_DATABASE, useValue: database },
        { provide: LibraryLegacyPreferencesStore, useValue: legacyStore },
        { provide: LIBRARY_CLOCK, useValue: clock },
      ],
    });

    repository = TestBed.inject(SqliteLibraryRepositoryAdapter);
  });

  it('saves, lists, and reads Library entries through raw SQLite operations', async () => {
    await expectAsync(repository.saveEntry(saveInput())).toBeResolvedTo({
      ok: true,
      status: 'saved',
      seriesId: 'series-1',
      entryId: 'entry-1',
    });

    await expectAsync(repository.listSeries()).toBeResolvedTo({
      ok: true,
      series: [
        {
          id: 'series-1',
          title: 'Series',
          entryCount: 1,
          lastSavedAt: '2026-06-27T10:00:00.000Z',
        },
      ],
    });
    await expectAsync(repository.getSeries('series-1')).toBeResolvedTo({
      ok: true,
      series: {
        id: 'series-1',
        title: 'Series',
        entries: [
          {
            id: 'entry-1',
            seriesId: 'series-1',
            displayTitle: 'Chapter 1',
            sourceHost: 'example.com',
            createdAt: '2026-06-27T10:00:00.000Z',
            updatedAt: '2026-06-27T10:00:00.000Z',
          },
        ],
      },
    });
    await expectAsync(repository.getEntry('series-1', 'entry-1')).toBeResolvedTo({
      ok: true,
      entry: {
        id: 'entry-1',
        seriesId: 'series-1',
        seriesTitle: 'Series',
        displayTitle: 'Chapter 1',
        sourceUrl: 'https://example.com/story/chapter-1',
        sourceHost: 'example.com',
        articleTitle: 'Chapter 1',
        byline: null,
        siteName: 'Example Reads',
        publishedTime: null,
        originalContentHtml: '<p>Body</p>',
        contentOverrideHtml: null,
        effectiveContentHtml: '<p>Body</p>',
        hasContentOverride: false,
        createdAt: '2026-06-27T10:00:00.000Z',
        updatedAt: '2026-06-27T10:00:00.000Z',
      },
    });
  });

  it('returns duplicate for the same source URL in the same Series', async () => {
    await repository.saveEntry(saveInput());

    await expectAsync(repository.saveEntry(saveInput({ entryId: 'entry-2' }))).toBeResolvedTo({
      ok: true,
      status: 'duplicate',
      seriesId: 'series-1',
      entryId: 'entry-1',
    });
  });

  it('uses an existing Series with the same normalized title', async () => {
    await repository.saveEntry(saveInput());

    await expectAsync(
      repository.saveEntry(
        saveInput({
          seriesId: 'series-unused',
          entryId: 'entry-2',
          sourceUrl: 'https://example.com/story/chapter-2',
        }),
      ),
    ).toBeResolvedTo({
      ok: true,
      status: 'saved',
      seriesId: 'series-1',
      entryId: 'entry-2',
    });
  });

  it('returns missingSeries for an explicit Series id that does not exist', async () => {
    await expectAsync(
      repository.saveEntry({
        ...saveInput(),
        target: { kind: 'existing', seriesId: 'missing-series' },
      }),
    ).toBeResolvedTo({ ok: true, status: 'missingSeries' });
  });

  it('returns null for missing Series and Entry reads', async () => {
    await expectAsync(repository.getSeries('missing-series')).toBeResolvedTo({
      ok: true,
      series: null,
    });
    await expectAsync(repository.getEntry('series-1', 'missing-entry')).toBeResolvedTo({
      ok: true,
      entry: null,
    });
  });

  it('loads override content as effective content while preserving the original', async () => {
    await repository.saveEntry(saveInput());
    await expectAsync(
      repository.saveSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<p>Edited body</p>',
        savedAt: '2026-06-28T10:00:00.000Z',
      }),
    ).toBeResolvedTo({ ok: true, status: 'saved' });

    await expectAsync(repository.getEntry('series-1', 'entry-1')).toBeResolvedTo({
      ok: true,
      entry: jasmine.objectContaining({
        originalContentHtml: '<p>Body</p>',
        contentOverrideHtml: '<p>Edited body</p>',
        effectiveContentHtml: '<p>Edited body</p>',
        hasContentOverride: true,
      }),
    });
  });

  it('replaces only the current override row', async () => {
    await repository.saveEntry(saveInput());
    await repository.saveSeriesEntryContentOverride({
      seriesId: 'series-1',
      entryId: 'entry-1',
      contentHtml: '<p>First edit</p>',
      savedAt: '2026-06-28T10:00:00.000Z',
    });

    await expectAsync(
      repository.saveSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<p>Second edit</p>',
        savedAt: '2026-06-29T10:00:00.000Z',
      }),
    ).toBeResolvedTo({ ok: true, status: 'saved' });

    expect(database.overrides).toEqual([
      {
        entryId: 'entry-1',
        contentHtml: '<p>Second edit</p>',
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-29T10:00:00.000Z',
      },
    ]);
    expect(database.entries[0]?.updatedAt).toBe('2026-06-27T10:00:00.000Z');
  });

  it('resets an override without mutating the original entry metadata', async () => {
    await repository.saveEntry(saveInput());
    await repository.saveSeriesEntryContentOverride({
      seriesId: 'series-1',
      entryId: 'entry-1',
      contentHtml: '<p>Edited body</p>',
      savedAt: '2026-06-28T10:00:00.000Z',
    });

    await expectAsync(
      repository.resetSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'entry-1',
      }),
    ).toBeResolvedTo({ ok: true, status: 'reset' });

    expect(database.overrides).toEqual([]);
    expect(database.entries[0]?.contentHtml).toBe('<p>Body</p>');
    expect(database.entries[0]?.updatedAt).toBe('2026-06-27T10:00:00.000Z');
    await expectAsync(repository.getEntry('series-1', 'entry-1')).toBeResolvedTo({
      ok: true,
      entry: jasmine.objectContaining({
        originalContentHtml: '<p>Body</p>',
        contentOverrideHtml: null,
        effectiveContentHtml: '<p>Body</p>',
        hasContentOverride: false,
      }),
    });
    await expectAsync(repository.listSeries()).toBeResolvedTo({
      ok: true,
      series: [
        {
          id: 'series-1',
          title: 'Series',
          entryCount: 1,
          lastSavedAt: '2026-06-27T10:00:00.000Z',
        },
      ],
    });
  });

  it('returns missingEntry when saving an override for an unknown entry', async () => {
    await expectAsync(
      repository.saveSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'missing-entry',
        contentHtml: '<p>Edited body</p>',
        savedAt: '2026-06-28T10:00:00.000Z',
      }),
    ).toBeResolvedTo({ ok: true, status: 'missingEntry' });
  });

  it('returns missingEntry when resetting an override for an unknown entry', async () => {
    await expectAsync(
      repository.resetSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'missing-entry',
      }),
    ).toBeResolvedTo({ ok: true, status: 'missingEntry' });
  });

  it('imports the legacy Preferences document once before repository operations', async () => {
    legacyStore.migrated = false;
    legacyStore.document = {
      series: [
        {
          id: 'legacy-series',
          title: 'Legacy Series',
          entries: [
            {
              id: 'legacy-entry',
              seriesId: 'legacy-series',
              seriesTitle: 'Legacy Series',
              displayTitle: 'Legacy Entry',
              sourceUrl: 'https://example.com/legacy',
              sourceHost: 'example.com',
              articleTitle: 'Legacy Article',
              byline: null,
              siteName: null,
              publishedTime: null,
              contentHtml: '<p>Legacy</p>',
              createdAt: '2026-06-26T10:00:00.000Z',
              updatedAt: '2026-06-26T11:00:00.000Z',
            },
            {
              id: 'legacy-entry-older',
              seriesId: 'legacy-series',
              seriesTitle: 'Legacy Series',
              displayTitle: 'Legacy Older Entry',
              sourceUrl: 'https://example.com/legacy-older',
              sourceHost: 'example.com',
              articleTitle: 'Legacy Older Article',
              byline: null,
              siteName: null,
              publishedTime: null,
              contentHtml: '<p>Legacy older</p>',
              createdAt: '2026-06-25T10:00:00.000Z',
              updatedAt: '2026-06-27T11:00:00.000Z',
            },
            {
              id: 'legacy-entry-newer',
              seriesId: 'legacy-series',
              seriesTitle: 'Legacy Series',
              displayTitle: 'Legacy Newer Entry',
              sourceUrl: 'https://example.com/legacy-newer',
              sourceHost: 'example.com',
              articleTitle: 'Legacy Newer Article',
              byline: null,
              siteName: null,
              publishedTime: null,
              contentHtml: '<p>Legacy newer</p>',
              createdAt: '2026-06-27T10:00:00.000Z',
              updatedAt: '2026-06-26T11:00:00.000Z',
            },
          ],
        },
      ],
    };

    await expectAsync(repository.listSeries()).toBeResolvedTo({
      ok: true,
      series: [
        {
          id: 'legacy-series',
          title: 'Legacy Series',
          entryCount: 3,
          lastSavedAt: '2026-06-27T10:00:00.000Z',
        },
      ],
    });
    expect(database.series[0]?.createdAt).toBe('2026-06-25T10:00:00.000Z');
    expect(database.series[0]?.updatedAt).toBe('2026-06-27T11:00:00.000Z');
    expect(legacyStore.markedMigrated).toBeTrue();
  });

  it('marks migration complete when no legacy Preferences document exists', async () => {
    legacyStore.migrated = false;
    legacyStore.document = null;

    await expectAsync(repository.listSeries()).toBeResolvedTo({ ok: true, series: [] });

    expect(legacyStore.markedMigrated).toBeTrue();
  });

  it('uses the current time for legacy Series without entries', async () => {
    legacyStore.migrated = false;
    legacyStore.document = {
      series: [{ id: 'empty-series', title: 'Empty Series', entries: [] }],
    };

    await repository.listSeries();

    expect(database.series[0]?.createdAt).toBe('2026-06-27T10:00:00.000Z');
    expect(database.series[0]?.updatedAt).toBe('2026-06-27T10:00:00.000Z');
  });

  it('returns persistence failure when legacy Preferences loading fails', async () => {
    legacyStore.migrated = false;
    legacyStore.failLoad = true;

    await expectAsync(repository.listSeries()).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
  });

  it('returns persistence failure when a legacy Series cannot be read after import', async () => {
    legacyStore.migrated = false;
    legacyStore.document = {
      series: [{ id: 'legacy-series', title: 'Legacy Series', entries: [] }],
    };
    database.hideSeriesByNormalizedTitle = true;

    await expectAsync(repository.listSeries()).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
  });

  it('returns persistence failure when the database fails', async () => {
    database.failQueries = true;

    await expectAsync(repository.listSeries()).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
  });

  it('returns persistence failure when read or save database operations fail', async () => {
    database.failQueries = true;

    await expectAsync(repository.getSeries('series-1')).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
    await expectAsync(repository.getEntry('series-1', 'entry-1')).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
    await expectAsync(repository.saveEntry(saveInput())).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
    await expectAsync(
      repository.saveSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<p>Edited</p>',
        savedAt: '2026-06-28T10:00:00.000Z',
      }),
    ).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
    await expectAsync(
      repository.resetSeriesEntryContentOverride({
        seriesId: 'series-1',
        entryId: 'entry-1',
      }),
    ).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
  });
});

interface FakeSeries {
  readonly id: string;
  readonly title: string;
  readonly normalizedTitle: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface FakeEntry {
  readonly id: string;
  readonly seriesId: string;
  readonly displayTitle: string;
  readonly sourceUrl: string;
  readonly sourceHost: string | null;
  readonly articleTitle: string;
  readonly byline: string | null;
  readonly siteName: string | null;
  readonly publishedTime: string | null;
  readonly contentHtml: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface FakeOverride {
  readonly entryId: string;
  readonly contentHtml: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

class FakeSqliteDatabase implements SqliteDatabase {
  public readonly series: FakeSeries[] = [];
  public readonly entries: FakeEntry[] = [];
  public readonly overrides: FakeOverride[] = [];
  public failQueries = false;
  public hideSeriesByNormalizedTitle = false;

  public query<Row extends SqliteRow>(
    statement: string,
    values: SqliteStatementValues = [],
  ): Promise<readonly Row[]> {
    if (this.failQueries) {
      return Promise.reject(new Error('query failed'));
    }
    const bound = bindSqliteStatement(statement, values);
    return Promise.resolve(this.queryRows(bound.statement, bound.values) as readonly Row[]);
  }

  public run(statement: string, values: SqliteStatementValues = []): Promise<void> {
    const bound = bindSqliteStatement(statement, values);
    if (bound.statement.includes('DELETE FROM library_series_entry_content_overrides')) {
      this.deleteOverride(bound.values);
      return Promise.resolve();
    }
    if (bound.statement.includes('library_series_entries')) {
      this.insertEntry(bound.values);
      return Promise.resolve();
    }
    if (bound.statement.includes('library_series_entry_content_overrides')) {
      this.upsertOverride(bound.values);
      return Promise.resolve();
    }
    this.insertSeries(bound.statement, bound.values);
    return Promise.resolve();
  }

  public execute(): Promise<void> {
    return Promise.resolve();
  }

  public transaction<Result>(work: (database: SqliteDatabase) => Promise<Result>): Promise<Result> {
    return work(this);
  }

  private queryRows(statement: string, values: SqliteValues): readonly SqliteRow[] {
    if (isSeriesSummaryQuery(statement)) {
      return this.seriesSummaries();
    }
    if (isSeriesByNormalizedTitleQuery(statement)) {
      if (this.hideSeriesByNormalizedTitle) {
        return [];
      }

      return this.series
        .filter((series) => series.normalizedTitle === text(values, 0))
        .map(toSeriesRow);
    }
    if (isSeriesByIdQuery(statement)) {
      return this.series.filter((series) => series.id === text(values, 0)).map(toSeriesRow);
    }
    if (isEntryBySourceUrlQuery(statement)) {
      return this.entries
        .filter(
          (entry) => entry.seriesId === text(values, 0) && entry.sourceUrl === text(values, 1),
        )
        .map(toEntrySummaryRow);
    }
    if (isEntryByIdQuery(statement)) {
      return this.entries
        .filter((entry) => entry.seriesId === text(values, 0) && entry.id === text(values, 1))
        .map((entry) => toEntryRow(entry, this.series, this.overrides));
    }
    if (isSeriesEntriesQuery(statement)) {
      return this.entries
        .filter((entry) => entry.seriesId === text(values, 0))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map(toEntrySummaryRow);
    }

    throw new Error(`Unexpected SQL: ${statement}`);
  }

  private seriesSummaries(): readonly SqliteRow[] {
    return this.series
      .map((series) => {
        const entries = this.entries.filter((entry) => entry.seriesId === series.id);
        return {
          id: series.id,
          title: series.title,
          entry_count: entries.length,
          last_saved_at: maxString(entries.map((entry) => entry.createdAt)) ?? '',
        };
      })
      .filter((series) => series.entry_count > 0)
      .sort((left, right) => right.last_saved_at.localeCompare(left.last_saved_at));
  }

  private insertSeries(statement: string, values: SqliteValues): void {
    const normalizedTitle = text(values, 2);
    if (this.series.some((series) => series.normalizedTitle === normalizedTitle)) {
      if (statement.includes('OR IGNORE')) {
        return;
      }
      throw new Error('unique series failed');
    }

    this.series.push({
      id: text(values, 0),
      title: text(values, 1),
      normalizedTitle,
      createdAt: text(values, 3),
      updatedAt: text(values, 4),
    });
  }

  private insertEntry(values: SqliteValues): void {
    const seriesId = text(values, 1);
    const sourceUrl = text(values, 3);
    if (
      this.entries.some((entry) => entry.seriesId === seriesId && entry.sourceUrl === sourceUrl)
    ) {
      throw new Error('unique entry failed');
    }

    this.entries.push({
      id: text(values, 0),
      seriesId,
      displayTitle: text(values, 2),
      sourceUrl,
      sourceHost: nullableText(values, 4),
      articleTitle: text(values, 5),
      byline: nullableText(values, 6),
      siteName: nullableText(values, 7),
      publishedTime: nullableText(values, 8),
      contentHtml: text(values, 9),
      createdAt: text(values, 10),
      updatedAt: text(values, 11),
    });
  }

  private upsertOverride(values: SqliteValues): void {
    const entryId = text(values, 0);
    const existingIndex = this.overrides.findIndex((override) => override.entryId === entryId);
    if (existingIndex >= 0) {
      const existing = this.overrides[existingIndex];
      if (existing === undefined) {
        throw new Error('Expected override to exist.');
      }

      this.overrides[existingIndex] = {
        entryId,
        contentHtml: text(values, 1),
        createdAt: existing.createdAt,
        updatedAt: text(values, 2),
      };
      return;
    }

    this.overrides.push({
      entryId,
      contentHtml: text(values, 1),
      createdAt: text(values, 2),
      updatedAt: text(values, 2),
    });
  }

  private deleteOverride(values: SqliteValues): void {
    const entryId = text(values, 0);
    const existingIndex = this.overrides.findIndex((override) => override.entryId === entryId);
    if (existingIndex >= 0) {
      this.overrides.splice(existingIndex, 1);
    }
  }
}

class FakeLegacyStore {
  public migrated = true;
  public markedMigrated = false;
  public failLoad = false;
  public document: LibraryDocument | null = null;

  public hasMigratedToSqlite(): Promise<boolean> {
    return Promise.resolve(this.migrated);
  }

  public loadDocument() {
    if (this.failLoad) {
      return Promise.resolve({ ok: false as const, reason: 'persistenceFailed' as const });
    }

    return Promise.resolve({ ok: true as const, document: this.document });
  }

  public markMigratedToSqlite(): Promise<void> {
    this.markedMigrated = true;
    this.migrated = true;
    return Promise.resolve();
  }
}

function saveInput(
  options: {
    readonly seriesId?: string;
    readonly entryId?: string;
    readonly sourceUrl?: string;
  } = {},
): SaveLibraryEntryInput {
  return {
    target: {
      kind: 'title',
      seriesId: options.seriesId ?? 'series-1',
      title: 'Series',
      normalizedTitle: 'series',
      createdAt: '2026-06-27T10:00:00.000Z',
    },
    entry: {
      id: options.entryId ?? 'entry-1',
      displayTitle: 'Chapter 1',
      sourceUrl: options.sourceUrl ?? 'https://example.com/story/chapter-1',
      sourceHost: 'example.com',
      articleTitle: 'Chapter 1',
      byline: null,
      siteName: 'Example Reads',
      publishedTime: null,
      contentHtml: '<p>Body</p>',
      createdAt: '2026-06-27T10:00:00.000Z',
      updatedAt: '2026-06-27T10:00:00.000Z',
    },
  };
}

function toSeriesRow(series: FakeSeries): SqliteRow {
  return {
    id: series.id,
    title: series.title,
    created_at: series.createdAt,
    updated_at: series.updatedAt,
  };
}

function toEntrySummaryRow(entry: FakeEntry): SqliteRow {
  return {
    id: entry.id,
    series_id: entry.seriesId,
    display_title: entry.displayTitle,
    source_host: entry.sourceHost,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

function toEntryRow(
  entry: FakeEntry,
  series: readonly FakeSeries[],
  overrides: readonly FakeOverride[],
): SqliteRow {
  const override = overrides.find((candidate) => candidate.entryId === entry.id);
  return {
    ...toEntrySummaryRow(entry),
    series_title: series.find((candidate) => candidate.id === entry.seriesId)?.title ?? '',
    source_url: entry.sourceUrl,
    article_title: entry.articleTitle,
    byline: entry.byline,
    site_name: entry.siteName,
    published_time: entry.publishedTime,
    original_content_html: entry.contentHtml,
    content_override_html: override?.contentHtml ?? null,
  };
}

function isSeriesSummaryQuery(statement: string): boolean {
  return statement.includes('COUNT(entries.id)');
}

function isSeriesByNormalizedTitleQuery(statement: string): boolean {
  return statement.includes('WHERE normalized_title = ?');
}

function isSeriesByIdQuery(statement: string): boolean {
  return statement.includes('FROM library_series') && statement.includes('WHERE id = ?');
}

function isEntryBySourceUrlQuery(statement: string): boolean {
  return statement.includes('WHERE series_id = ?') && statement.includes('source_url = ?');
}

function isEntryByIdQuery(statement: string): boolean {
  return statement.includes('entries.id = ?');
}

function isSeriesEntriesQuery(statement: string): boolean {
  return (
    statement.includes('FROM library_series_entries') && statement.includes('ORDER BY created_at')
  );
}

function text(values: SqliteValues, index: number): string {
  const value = values[index];
  if (typeof value !== 'string') {
    throw new Error('Expected text SQLite value.');
  }

  return value;
}

function nullableText(values: SqliteValues, index: number): string | null {
  const value = values[index];
  if (value === null || typeof value === 'string') {
    return value;
  }

  throw new Error('Expected nullable text SQLite value.');
}

function maxString(values: readonly string[]): string | null {
  return values.reduce<string | null>((newest, value) => {
    return newest === null || value > newest ? value : newest;
  }, null);
}
