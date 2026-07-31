import { Injectable, inject } from '@angular/core';
import { ReadingAppearance } from '../../../shared/domain/reading-appearance';
import { LibrarySeries, LibrarySeriesEntry, LibrarySeriesSummary } from '../domain/library-series';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import { READING_APPEARANCE_STORE } from '../../../shared/application/reading-appearance-store.port';
import {
  ResetSeriesEntryContentOverrideInput,
  ResetSeriesEntryContentOverrideResult,
  ResetSeriesEntryContentOverrideUseCase,
} from './reset-series-entry-content-override.use-case';
import {
  SaveSeriesEntryContentOverrideInput,
  SaveSeriesEntryContentOverrideResult,
  SaveSeriesEntryContentOverrideUseCase,
} from './save-series-entry-content-override.use-case';
import {
  SaveSeriesEntryEditInput,
  SaveSeriesEntryEditResult,
  SaveSeriesEntryEditUseCase,
} from './save-series-entry-edit.use-case';
import {
  SaveReadingSnapshotToLibraryInput,
  SaveReadingSnapshotToLibraryResult,
  SaveReadingSnapshotToLibraryUseCase,
} from './save-reading-snapshot-to-library.use-case';
import {
  SaveSeriesEntryHeaderVisibilityInput,
  SaveSeriesEntryHeaderVisibilityResult,
  SaveSeriesEntryHeaderVisibilityUseCase,
} from './save-series-entry-header-visibility.use-case';

@Injectable()
export class LibraryFacade {
  private readonly repository = inject(LIBRARY_REPOSITORY);
  private readonly appearanceStore = inject(READING_APPEARANCE_STORE);
  private readonly saveReadingSnapshotUseCase = inject(SaveReadingSnapshotToLibraryUseCase);
  private readonly saveContentOverrideUseCase = inject(SaveSeriesEntryContentOverrideUseCase);
  private readonly saveEntryEditUseCase = inject(SaveSeriesEntryEditUseCase);
  private readonly saveHeaderVisibilityUseCase = inject(SaveSeriesEntryHeaderVisibilityUseCase);
  private readonly resetContentOverrideUseCase = inject(ResetSeriesEntryContentOverrideUseCase);

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

  public getSeriesEntryReadingAppearance(): Promise<ReadingAppearance> {
    return this.appearanceStore.readAppearance();
  }

  public saveSeriesEntryReadingAppearance(appearance: ReadingAppearance): Promise<void> {
    return this.appearanceStore.saveAppearance(appearance);
  }

  public saveReadingSnapshot(
    input: SaveReadingSnapshotToLibraryInput,
  ): Promise<SaveReadingSnapshotToLibraryResult> {
    return this.saveReadingSnapshotUseCase.execute(input);
  }

  public saveSeriesEntryContentOverride(
    input: SaveSeriesEntryContentOverrideInput,
  ): Promise<SaveSeriesEntryContentOverrideResult> {
    return this.saveContentOverrideUseCase.execute(input);
  }

  public saveSeriesEntryEdit(input: SaveSeriesEntryEditInput): Promise<SaveSeriesEntryEditResult> {
    return this.saveEntryEditUseCase.execute(input);
  }

  public saveSeriesEntryHeaderVisibility(
    input: SaveSeriesEntryHeaderVisibilityInput,
  ): Promise<SaveSeriesEntryHeaderVisibilityResult> {
    return this.saveHeaderVisibilityUseCase.execute(input);
  }

  public resetSeriesEntryContentOverride(
    input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideResult> {
    return this.resetContentOverrideUseCase.execute(input);
  }
}
