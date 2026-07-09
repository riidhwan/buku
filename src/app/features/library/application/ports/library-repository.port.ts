import {
  LibrarySeries,
  LibrarySeriesEntry,
  LibrarySeriesSummary,
} from '../../domain/library-series';

export interface SaveLibraryEntryInput {
  readonly target: SaveLibraryEntryTarget;
  readonly entry: LibraryEntryToSave;
}

export type SaveLibraryEntryTarget =
  | {
      readonly kind: 'existing';
      readonly seriesId: string;
    }
  | {
      readonly kind: 'title';
      readonly seriesId: string;
      readonly title: string;
      readonly normalizedTitle: string;
      readonly createdAt: string;
    };

export interface LibraryEntryToSave {
  readonly id: string;
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

export interface SaveSeriesEntryHeaderVisibilityInput {
  readonly seriesId: string;
  readonly entryId: string;
  readonly headerVisible: boolean;
  readonly savedAt: string;
}

export interface SaveSeriesEntryContentOverrideInput {
  readonly seriesId: string;
  readonly entryId: string;
  readonly contentHtml: string;
  readonly savedAt: string;
}

export interface SaveSeriesEntryEditInput {
  readonly seriesId: string;
  readonly entryId: string;
  readonly displayTitle: string;
  readonly headerVisible: boolean;
  readonly contentHtml: string | null;
  readonly savedAt: string;
}

export interface ResetSeriesEntryContentOverrideInput {
  readonly seriesId: string;
  readonly entryId: string;
}

export type LibraryPersistenceFailure = 'persistenceFailed';

interface PersistenceFailedResult {
  readonly ok: false;
  readonly reason: LibraryPersistenceFailure;
}

interface MissingEntryResult {
  readonly ok: true;
  readonly status: 'missingEntry';
}

interface SavedEntryMutationResult {
  readonly ok: true;
  readonly status: 'saved';
}

export type ListLibrarySeriesResult =
  | {
      readonly ok: true;
      readonly series: readonly LibrarySeriesSummary[];
    }
  | PersistenceFailedResult;

export type GetLibrarySeriesResult =
  | {
      readonly ok: true;
      readonly series: LibrarySeries | null;
    }
  | PersistenceFailedResult;

export type GetLibraryEntryResult =
  | {
      readonly ok: true;
      readonly entry: LibrarySeriesEntry | null;
    }
  | PersistenceFailedResult;

export type SaveLibraryEntryResult =
  | {
      readonly ok: true;
      readonly status: 'saved';
      readonly seriesId: string;
      readonly entryId: string;
    }
  | {
      readonly ok: true;
      readonly status: 'duplicate';
      readonly seriesId: string;
      readonly entryId: string;
    }
  | {
      readonly ok: true;
      readonly status: 'missingSeries';
    }
  | PersistenceFailedResult;

export type SaveSeriesEntryContentOverrideRepositoryResult =
  SavedEntryMutationResult | MissingEntryResult | PersistenceFailedResult;

export type SaveSeriesEntryHeaderVisibilityRepositoryResult =
  SavedEntryMutationResult | MissingEntryResult | PersistenceFailedResult;

export type SaveSeriesEntryEditRepositoryResult =
  SavedEntryMutationResult | MissingEntryResult | PersistenceFailedResult;

export type ResetSeriesEntryContentOverrideRepositoryResult =
  | {
      readonly ok: true;
      readonly status: 'reset';
    }
  | MissingEntryResult
  | PersistenceFailedResult;

export interface LibraryRepository {
  listSeries(): Promise<ListLibrarySeriesResult>;
  getSeries(seriesId: string): Promise<GetLibrarySeriesResult>;
  getEntry(seriesId: string, entryId: string): Promise<GetLibraryEntryResult>;
  saveEntry(input: SaveLibraryEntryInput): Promise<SaveLibraryEntryResult>;
  saveSeriesEntryContentOverride(
    input: SaveSeriesEntryContentOverrideInput,
  ): Promise<SaveSeriesEntryContentOverrideRepositoryResult>;
  saveSeriesEntryHeaderVisibility(
    input: SaveSeriesEntryHeaderVisibilityInput,
  ): Promise<SaveSeriesEntryHeaderVisibilityRepositoryResult>;
  saveSeriesEntryEdit(
    input: SaveSeriesEntryEditInput,
  ): Promise<SaveSeriesEntryEditRepositoryResult>;
  resetSeriesEntryContentOverride(
    input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideRepositoryResult>;
}
