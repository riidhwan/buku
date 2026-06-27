import { Injectable, inject } from '@angular/core';
import {
  LibraryDocument,
  LibrarySeries,
  LibrarySeriesEntry,
  LibrarySeriesEntrySummary,
  LibrarySeriesRecord,
  LibrarySeriesSummary,
} from '../domain/library-series';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import {
  SaveReadingSnapshotToLibraryInput,
  SaveReadingSnapshotToLibraryResult,
  SaveReadingSnapshotToLibraryUseCase,
} from './save-reading-snapshot-to-library.use-case';

@Injectable()
export class LibraryFacade {
  private readonly repository = inject(LIBRARY_REPOSITORY);
  private readonly saveReadingSnapshotUseCase = inject(SaveReadingSnapshotToLibraryUseCase);

  public async listSeries(): Promise<readonly LibrarySeriesSummary[]> {
    const loaded = await this.repository.load();
    return loaded.ok ? toSeriesSummaries(loaded.document) : [];
  }

  public async getSeries(seriesId: string): Promise<LibrarySeries | null> {
    const loaded = await this.repository.load();
    if (!loaded.ok) {
      return null;
    }

    const series = loaded.document.series.find((candidate) => candidate.id === seriesId);
    return series === undefined ? null : toSeries(series);
  }

  public async getEntry(seriesId: string, entryId: string): Promise<LibrarySeriesEntry | null> {
    const loaded = await this.repository.load();
    if (!loaded.ok) {
      return null;
    }

    return (
      loaded.document.series
        .find((series) => series.id === seriesId)
        ?.entries.find((entry) => entry.id === entryId) ?? null
    );
  }

  public saveReadingSnapshot(
    input: SaveReadingSnapshotToLibraryInput,
  ): Promise<SaveReadingSnapshotToLibraryResult> {
    return this.saveReadingSnapshotUseCase.execute(input);
  }
}

function toSeriesSummaries(document: LibraryDocument): readonly LibrarySeriesSummary[] {
  return document.series
    .filter((series) => series.entries.length > 0)
    .map((series) => ({
      id: series.id,
      title: series.title,
      entryCount: series.entries.length,
      lastSavedAt: newestEntryCreatedAt(series.entries),
    }))
    .sort((left, right) => right.lastSavedAt.localeCompare(left.lastSavedAt));
}

function toSeries(series: LibrarySeriesRecord): LibrarySeries {
  return {
    id: series.id,
    title: series.title,
    entries: [...series.entries]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(
        (entry): LibrarySeriesEntrySummary => ({
          id: entry.id,
          seriesId: entry.seriesId,
          displayTitle: entry.displayTitle,
          sourceHost: entry.sourceHost,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }),
      ),
  };
}

function newestEntryCreatedAt(entries: readonly LibrarySeriesEntry[]): string {
  return entries
    .map((entry) => entry.createdAt)
    .reduce((newest, createdAt) => (createdAt > newest ? createdAt : newest));
}
