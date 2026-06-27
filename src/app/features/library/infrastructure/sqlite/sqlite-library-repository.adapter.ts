import { Injectable, inject } from '@angular/core';

import { SQLITE_DATABASE } from '@core/storage/sqlite/sqlite-database.token';
import { SqliteDatabase } from '@core/storage/sqlite/sqlite-database';
import { SqliteRow } from '@core/storage/sqlite/sqlite-value';

import {
  LibrarySeries,
  LibrarySeriesEntry,
  LibrarySeriesSummary,
} from '../../domain/library-series';
import { LIBRARY_CLOCK } from '../../application/ports/library-clock.port';
import {
  GetLibraryEntryResult,
  GetLibrarySeriesResult,
  LibraryEntryToSave,
  LibraryRepository,
  ListLibrarySeriesResult,
  SaveLibraryEntryInput,
  SaveLibraryEntryResult,
  SaveLibraryEntryTarget,
} from '../../application/ports/library-repository.port';
import { normalizeTitleKey } from '../../application/save-reading-snapshot-to-library.use-case';
import { LibraryLegacyPreferencesStore } from '../library-legacy-preferences.store';

type SeriesRow = SqliteRow & {
  readonly id: string;
  readonly title: string;
  readonly created_at: string;
  readonly updated_at: string;
};

type SeriesSummaryRow = SqliteRow & {
  readonly id: string;
  readonly title: string;
  readonly entry_count: number;
  readonly last_saved_at: string;
};

type EntrySummaryRow = SqliteRow & {
  readonly id: string;
  readonly series_id: string;
  readonly display_title: string;
  readonly source_host: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

type EntryRow = EntrySummaryRow & {
  readonly series_title: string;
  readonly source_url: string;
  readonly article_title: string;
  readonly byline: string | null;
  readonly site_name: string | null;
  readonly published_time: string | null;
  readonly content_html: string;
};

@Injectable()
export class SqliteLibraryRepositoryAdapter implements LibraryRepository {
  private readonly database = inject(SQLITE_DATABASE);
  private readonly legacyStore = inject(LibraryLegacyPreferencesStore);
  private readonly clock = inject(LIBRARY_CLOCK);
  private migration: Promise<void> | null = null;

  public async listSeries(): Promise<ListLibrarySeriesResult> {
    try {
      await this.ensureLegacyDataMigrated();
      const rows = await this.database.query<SeriesSummaryRow>(listSeriesSql);
      return { ok: true, series: rows.map(toSeriesSummary) };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async getSeries(seriesId: string): Promise<GetLibrarySeriesResult> {
    try {
      await this.ensureLegacyDataMigrated();
      const series = await selectSeriesById(this.database, seriesId);
      return { ok: true, series: series === null ? null : await toSeries(this.database, series) };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async getEntry(seriesId: string, entryId: string): Promise<GetLibraryEntryResult> {
    try {
      await this.ensureLegacyDataMigrated();
      const entry = await selectEntryById(this.database, seriesId, entryId);
      return { ok: true, entry };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async saveEntry(input: SaveLibraryEntryInput): Promise<SaveLibraryEntryResult> {
    try {
      await this.ensureLegacyDataMigrated();
      return await this.database.transaction((database) => saveEntry(database, input));
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  private async ensureLegacyDataMigrated(): Promise<void> {
    this.migration ??= this.migrateLegacyData();
    await this.migration;
  }

  private async migrateLegacyData(): Promise<void> {
    if (await this.legacyStore.hasMigratedToSqlite()) {
      return;
    }

    const loaded = await this.legacyStore.loadDocument();
    if (!loaded.ok) {
      throw new Error('Could not load legacy Library document.');
    }

    await this.database.transaction(async (database) => {
      for (const series of loaded.document?.series ?? []) {
        const targetSeriesId = await importLegacySeries(database, series, this.clock.now());
        for (const entry of series.entries) {
          await insertEntry(database, targetSeriesId, entry);
        }
      }
    });
    await this.legacyStore.markMigratedToSqlite();
  }
}

async function saveEntry(
  database: SqliteDatabase,
  input: SaveLibraryEntryInput,
): Promise<SaveLibraryEntryResult> {
  const series = await resolveTargetSeries(database, input.target);
  if (series === null) {
    return { ok: true, status: 'missingSeries' };
  }

  const duplicate = await selectEntryBySourceUrl(database, series.id, input.entry.sourceUrl);
  if (duplicate !== null) {
    return { ok: true, status: 'duplicate', seriesId: series.id, entryId: duplicate.id };
  }

  await insertEntry(database, series.id, input.entry);
  return { ok: true, status: 'saved', seriesId: series.id, entryId: input.entry.id };
}

async function resolveTargetSeries(
  database: SqliteDatabase,
  target: SaveLibraryEntryTarget,
): Promise<SeriesRow | null> {
  if (target.kind === 'existing') {
    return selectSeriesById(database, target.seriesId);
  }

  const existing = await selectSeriesByNormalizedTitle(database, target.normalizedTitle);
  if (existing !== null) {
    return existing;
  }

  await database.run(insertSeriesSql, [
    target.seriesId,
    target.title,
    target.normalizedTitle,
    target.createdAt,
    target.createdAt,
  ]);
  return selectSeriesById(database, target.seriesId);
}

async function importLegacySeries(
  database: SqliteDatabase,
  series: {
    readonly id: string;
    readonly title: string;
    readonly entries: readonly LibraryEntryToSave[];
  },
  fallbackTime: string,
): Promise<string> {
  const createdAt = oldestCreatedAt(series.entries) ?? fallbackTime;
  const updatedAt = newestUpdatedAt(series.entries) ?? createdAt;
  await database.run(insertSeriesIgnoreSql, [
    series.id,
    series.title,
    normalizeTitleKey(series.title),
    createdAt,
    updatedAt,
  ]);
  const persisted = await selectSeriesByNormalizedTitle(database, normalizeTitleKey(series.title));
  if (persisted === null) {
    throw new Error('Could not import legacy Library Series.');
  }

  return persisted.id;
}

async function toSeries(database: SqliteDatabase, row: SeriesRow): Promise<LibrarySeries> {
  const entries = await database.query<EntrySummaryRow>(listSeriesEntriesSql, [row.id]);
  return {
    id: row.id,
    title: row.title,
    entries: entries.map((entry) => ({
      id: entry.id,
      seriesId: entry.series_id,
      displayTitle: entry.display_title,
      sourceHost: entry.source_host,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })),
  };
}

function toSeriesSummary(row: SeriesSummaryRow): LibrarySeriesSummary {
  return {
    id: row.id,
    title: row.title,
    entryCount: row.entry_count,
    lastSavedAt: row.last_saved_at,
  };
}

async function selectSeriesById(
  database: SqliteDatabase,
  seriesId: string,
): Promise<SeriesRow | null> {
  return first(await database.query<SeriesRow>(selectSeriesByIdSql, [seriesId]));
}

async function selectSeriesByNormalizedTitle(
  database: SqliteDatabase,
  normalizedTitle: string,
): Promise<SeriesRow | null> {
  return first(
    await database.query<SeriesRow>(selectSeriesByNormalizedTitleSql, [normalizedTitle]),
  );
}

async function selectEntryById(
  database: SqliteDatabase,
  seriesId: string,
  entryId: string,
): Promise<LibrarySeriesEntry | null> {
  const row = first(await database.query<EntryRow>(selectEntryByIdSql, [seriesId, entryId]));
  return row === null ? null : toEntry(row);
}

async function selectEntryBySourceUrl(
  database: SqliteDatabase,
  seriesId: string,
  sourceUrl: string,
): Promise<EntrySummaryRow | null> {
  return first(
    await database.query<EntrySummaryRow>(selectEntryBySourceUrlSql, [seriesId, sourceUrl]),
  );
}

async function insertEntry(
  database: SqliteDatabase,
  seriesId: string,
  entry: LibraryEntryToSave,
): Promise<void> {
  await database.run(insertEntrySql, [
    entry.id,
    seriesId,
    entry.displayTitle,
    entry.sourceUrl,
    entry.sourceHost,
    entry.articleTitle,
    entry.byline,
    entry.siteName,
    entry.publishedTime,
    entry.contentHtml,
    entry.createdAt,
    entry.updatedAt,
  ]);
}

function toEntry(row: EntryRow): LibrarySeriesEntry {
  return {
    id: row.id,
    seriesId: row.series_id,
    seriesTitle: row.series_title,
    displayTitle: row.display_title,
    sourceUrl: row.source_url,
    sourceHost: row.source_host,
    articleTitle: row.article_title,
    byline: row.byline,
    siteName: row.site_name,
    publishedTime: row.published_time,
    contentHtml: row.content_html,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function first<Row>(rows: readonly Row[]): Row | null {
  return rows[0] ?? null;
}

function oldestCreatedAt(entries: readonly LibraryEntryToSave[]): string | null {
  return minString(entries.map((entry) => entry.createdAt));
}

function newestUpdatedAt(entries: readonly LibraryEntryToSave[]): string | null {
  return maxString(entries.map((entry) => entry.updatedAt));
}

function minString(values: readonly string[]): string | null {
  return values.reduce<string | null>((oldest, value) => {
    return oldest === null || value < oldest ? value : oldest;
  }, null);
}

function maxString(values: readonly string[]): string | null {
  return values.reduce<string | null>((newest, value) => {
    return newest === null || value > newest ? value : newest;
  }, null);
}

const listSeriesSql = `
  SELECT
    series.id,
    series.title,
    COUNT(entries.id) AS entry_count,
    MAX(entries.created_at) AS last_saved_at
  FROM library_series series
  INNER JOIN library_series_entries entries ON entries.series_id = series.id
  GROUP BY series.id, series.title
  ORDER BY last_saved_at DESC;
`;

const selectSeriesByIdSql = `
  SELECT id, title, created_at, updated_at
  FROM library_series
  WHERE id = ?;
`;

const selectSeriesByNormalizedTitleSql = `
  SELECT id, title, created_at, updated_at
  FROM library_series
  WHERE normalized_title = ?;
`;

const listSeriesEntriesSql = `
  SELECT id, series_id, display_title, source_host, created_at, updated_at
  FROM library_series_entries
  WHERE series_id = ?
  ORDER BY created_at ASC;
`;

const selectEntryByIdSql = `
  SELECT
    entries.id,
    entries.series_id,
    series.title AS series_title,
    entries.display_title,
    entries.source_url,
    entries.source_host,
    entries.article_title,
    entries.byline,
    entries.site_name,
    entries.published_time,
    entries.content_html,
    entries.created_at,
    entries.updated_at
  FROM library_series_entries entries
  INNER JOIN library_series series ON series.id = entries.series_id
  WHERE entries.series_id = ? AND entries.id = ?;
`;

const selectEntryBySourceUrlSql = `
  SELECT id, series_id, display_title, source_host, created_at, updated_at
  FROM library_series_entries
  WHERE series_id = ? AND source_url = ?;
`;

const insertSeriesSql = `
  INSERT INTO library_series (id, title, normalized_title, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?);
`;

const insertSeriesIgnoreSql = `
  INSERT OR IGNORE INTO library_series (id, title, normalized_title, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?);
`;

const insertEntrySql = `
  INSERT INTO library_series_entries (
    id,
    series_id,
    display_title,
    source_url,
    source_host,
    article_title,
    byline,
    site_name,
    published_time,
    content_html,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;
