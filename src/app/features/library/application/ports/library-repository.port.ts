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

export type LibraryPersistenceFailure = 'persistenceFailed';

export type ListLibrarySeriesResult =
  | {
      readonly ok: true;
      readonly series: readonly LibrarySeriesSummary[];
    }
  | {
      readonly ok: false;
      readonly reason: LibraryPersistenceFailure;
    };

export type GetLibrarySeriesResult =
  | {
      readonly ok: true;
      readonly series: LibrarySeries | null;
    }
  | {
      readonly ok: false;
      readonly reason: LibraryPersistenceFailure;
    };

export type GetLibraryEntryResult =
  | {
      readonly ok: true;
      readonly entry: LibrarySeriesEntry | null;
    }
  | {
      readonly ok: false;
      readonly reason: LibraryPersistenceFailure;
    };

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
  | {
      readonly ok: false;
      readonly reason: LibraryPersistenceFailure;
    };

export interface LibraryRepository {
  listSeries(): Promise<ListLibrarySeriesResult>;
  getSeries(seriesId: string): Promise<GetLibrarySeriesResult>;
  getEntry(seriesId: string, entryId: string): Promise<GetLibraryEntryResult>;
  saveEntry(input: SaveLibraryEntryInput): Promise<SaveLibraryEntryResult>;
}
