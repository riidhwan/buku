import { Injectable, inject } from '@angular/core';

import { SQLITE_DATABASE } from '@core/storage/sqlite/sqlite-database.token';

import { LIBRARY_CLOCK } from '../../application/ports/library-clock.port';
import {
  GetLibraryEntryResult,
  GetLibrarySeriesResult,
  LibraryRepository,
  ListLibrarySeriesResult,
  ResetSeriesEntryContentOverrideInput,
  ResetSeriesEntryContentOverrideRepositoryResult,
  SaveLibraryEntryInput,
  SaveLibraryEntryResult,
  SaveSeriesEntryContentOverrideInput,
  SaveSeriesEntryContentOverrideRepositoryResult,
} from '../../application/ports/library-repository.port';
import { LibraryLegacyPreferencesStore } from '../library-legacy-preferences.store';
import { SqliteLibraryQueries } from './sqlite-library-queries';

@Injectable()
export class SqliteLibraryRepositoryAdapter implements LibraryRepository {
  private readonly database = inject(SQLITE_DATABASE);
  private readonly legacyStore = inject(LibraryLegacyPreferencesStore);
  private readonly clock = inject(LIBRARY_CLOCK);
  private readonly queries = new SqliteLibraryQueries(this.database);
  private migration: Promise<void> | null = null;

  public async listSeries(): Promise<ListLibrarySeriesResult> {
    try {
      await this.ensureLegacyDataMigrated();
      return { ok: true, series: await this.queries.listSeries() };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async getSeries(seriesId: string): Promise<GetLibrarySeriesResult> {
    try {
      await this.ensureLegacyDataMigrated();
      return { ok: true, series: await this.queries.getSeries(seriesId) };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async getEntry(seriesId: string, entryId: string): Promise<GetLibraryEntryResult> {
    try {
      await this.ensureLegacyDataMigrated();
      return { ok: true, entry: await this.queries.getEntry(seriesId, entryId) };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async saveEntry(input: SaveLibraryEntryInput): Promise<SaveLibraryEntryResult> {
    try {
      await this.ensureLegacyDataMigrated();
      return await this.database.transaction((database) =>
        new SqliteLibraryQueries(database).saveEntry(input),
      );
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async saveSeriesEntryContentOverride(
    input: SaveSeriesEntryContentOverrideInput,
  ): Promise<SaveSeriesEntryContentOverrideRepositoryResult> {
    try {
      await this.ensureLegacyDataMigrated();
      return await this.database.transaction((database) =>
        new SqliteLibraryQueries(database).saveSeriesEntryContentOverride(input),
      );
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async resetSeriesEntryContentOverride(
    input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideRepositoryResult> {
    try {
      await this.ensureLegacyDataMigrated();
      return await this.database.transaction((database) =>
        new SqliteLibraryQueries(database).resetSeriesEntryContentOverride(input),
      );
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
      const queries = new SqliteLibraryQueries(database);
      for (const series of loaded.document?.series ?? []) {
        const targetSeriesId = await queries.importLegacySeries(series, this.clock.now());
        for (const entry of series.entries) {
          await queries.insertEntry(targetSeriesId, entry);
        }
      }
    });
    await this.legacyStore.markMigratedToSqlite();
  }
}
