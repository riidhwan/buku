import { Injectable, inject } from '@angular/core';
import { LibrarySeries, LibrarySeriesEntry, LibrarySeriesSummary } from '../domain/library-series';
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
    const result = await this.repository.listSeries();
    return result.ok ? result.series : [];
  }

  public async getSeries(seriesId: string): Promise<LibrarySeries | null> {
    const result = await this.repository.getSeries(seriesId);
    return result.ok ? result.series : null;
  }

  public async getEntry(seriesId: string, entryId: string): Promise<LibrarySeriesEntry | null> {
    const result = await this.repository.getEntry(seriesId, entryId);
    return result.ok ? result.entry : null;
  }

  public saveReadingSnapshot(
    input: SaveReadingSnapshotToLibraryInput,
  ): Promise<SaveReadingSnapshotToLibraryResult> {
    return this.saveReadingSnapshotUseCase.execute(input);
  }
}
