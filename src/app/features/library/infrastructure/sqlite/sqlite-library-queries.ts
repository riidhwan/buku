import { SqliteDatabase } from '@core/storage/sqlite/sqlite-database';
import { SqliteRow } from '@core/storage/sqlite/sqlite-value';

import {
  LibrarySeries,
  LibrarySeriesEntry,
  LibrarySeriesSummary,
} from '../../domain/library-series';
import {
  LibraryEntryToSave,
  SaveLibraryEntryInput,
  SaveLibraryEntryResult,
  SaveLibraryEntryTarget,
} from '../../application/ports/library-repository.port';
import { normalizeTitleKey } from '../../application/save-reading-snapshot-to-library.use-case';
import { sqliteLibraryStatements } from './sqlite-library-statements';

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

export class SqliteLibraryQueries {
  public constructor(private readonly database: SqliteDatabase) {}

  public async listSeries(): Promise<readonly LibrarySeriesSummary[]> {
    const rows = await this.database.query<SeriesSummaryRow>(sqliteLibraryStatements.listSeries);
    return rows.map(toSeriesSummary);
  }

  public async getSeries(seriesId: string): Promise<LibrarySeries | null> {
    const series = await this.selectSeriesById(seriesId);
    return series === null ? null : await this.toSeries(series);
  }

  public async getEntry(seriesId: string, entryId: string): Promise<LibrarySeriesEntry | null> {
    const row = first(
      await this.database.query<EntryRow>(sqliteLibraryStatements.selectEntryById, {
        seriesId,
        entryId,
      }),
    );
    return row === null ? null : toEntry(row);
  }

  public async saveEntry(input: SaveLibraryEntryInput): Promise<SaveLibraryEntryResult> {
    const series = await this.resolveTargetSeries(input.target);
    if (series === null) {
      return { ok: true, status: 'missingSeries' };
    }

    const duplicate = await this.selectEntryBySourceUrl(series.id, input.entry.sourceUrl);
    if (duplicate !== null) {
      return { ok: true, status: 'duplicate', seriesId: series.id, entryId: duplicate.id };
    }

    await this.insertEntry(series.id, input.entry);
    return { ok: true, status: 'saved', seriesId: series.id, entryId: input.entry.id };
  }

  public async importLegacySeries(
    series: {
      readonly id: string;
      readonly title: string;
      readonly entries: readonly LibraryEntryToSave[];
    },
    fallbackTime: string,
  ): Promise<string> {
    const normalizedTitle = normalizeTitleKey(series.title);
    const createdAt = oldestCreatedAt(series.entries) ?? fallbackTime;
    const updatedAt = newestUpdatedAt(series.entries) ?? createdAt;
    await this.database.run(sqliteLibraryStatements.insertSeriesIgnore, {
      id: series.id,
      title: series.title,
      normalizedTitle,
      createdAt,
      updatedAt,
    });
    const persisted = await this.selectSeriesByNormalizedTitle(normalizedTitle);
    if (persisted === null) {
      throw new Error('Could not import legacy Library Series.');
    }

    return persisted.id;
  }

  public async insertEntry(seriesId: string, entry: LibraryEntryToSave): Promise<void> {
    await this.database.run(sqliteLibraryStatements.insertEntry, {
      id: entry.id,
      seriesId,
      displayTitle: entry.displayTitle,
      sourceUrl: entry.sourceUrl,
      sourceHost: entry.sourceHost,
      articleTitle: entry.articleTitle,
      byline: entry.byline,
      siteName: entry.siteName,
      publishedTime: entry.publishedTime,
      contentHtml: entry.contentHtml,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  }

  private async resolveTargetSeries(target: SaveLibraryEntryTarget): Promise<SeriesRow | null> {
    if (target.kind === 'existing') {
      return this.selectSeriesById(target.seriesId);
    }

    const existing = await this.selectSeriesByNormalizedTitle(target.normalizedTitle);
    if (existing !== null) {
      return existing;
    }

    await this.database.run(sqliteLibraryStatements.insertSeries, {
      id: target.seriesId,
      title: target.title,
      normalizedTitle: target.normalizedTitle,
      createdAt: target.createdAt,
      updatedAt: target.createdAt,
    });
    return this.selectSeriesById(target.seriesId);
  }

  private async toSeries(row: SeriesRow): Promise<LibrarySeries> {
    const entries = await this.database.query<EntrySummaryRow>(
      sqliteLibraryStatements.listSeriesEntries,
      { seriesId: row.id },
    );
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

  private async selectSeriesById(seriesId: string): Promise<SeriesRow | null> {
    return first(
      await this.database.query<SeriesRow>(sqliteLibraryStatements.selectSeriesById, { seriesId }),
    );
  }

  private async selectSeriesByNormalizedTitle(normalizedTitle: string): Promise<SeriesRow | null> {
    return first(
      await this.database.query<SeriesRow>(sqliteLibraryStatements.selectSeriesByNormalizedTitle, {
        normalizedTitle,
      }),
    );
  }

  private async selectEntryBySourceUrl(
    seriesId: string,
    sourceUrl: string,
  ): Promise<EntrySummaryRow | null> {
    return first(
      await this.database.query<EntrySummaryRow>(sqliteLibraryStatements.selectEntryBySourceUrl, {
        seriesId,
        sourceUrl,
      }),
    );
  }
}

function toSeriesSummary(row: SeriesSummaryRow): LibrarySeriesSummary {
  return {
    id: row.id,
    title: row.title,
    entryCount: row.entry_count,
    lastSavedAt: row.last_saved_at,
  };
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
