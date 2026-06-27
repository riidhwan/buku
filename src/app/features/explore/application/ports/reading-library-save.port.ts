import { InjectionToken } from '@angular/core';
import { ReadingArticleSnapshot } from '../../domain/reading-article';

export interface ReadingLibrarySeriesOption {
  readonly id: string;
  readonly title: string;
  readonly entryCount: number;
  readonly lastSavedAt: string;
}

export type ReadingLibrarySeriesTarget =
  | {
      readonly kind: 'existing';
      readonly seriesId: string;
    }
  | {
      readonly kind: 'title';
      readonly title: string;
    };

export interface SaveReadingArticleToLibraryInput {
  readonly article: ReadingArticleSnapshot;
  readonly entryTitle: string;
  readonly target: ReadingLibrarySeriesTarget;
}

export type SaveReadingArticleToLibraryResult =
  | {
      readonly status: 'saved';
    }
  | {
      readonly status: 'duplicate';
    }
  | {
      readonly status: 'validationFailed';
      readonly message: string;
    }
  | {
      readonly status: 'persistenceFailed';
    };

export interface ReadingLibrarySavePort {
  listSeries(): Promise<readonly ReadingLibrarySeriesOption[]>;
  save(input: SaveReadingArticleToLibraryInput): Promise<SaveReadingArticleToLibraryResult>;
}

export const READING_LIBRARY_SAVE = new InjectionToken<ReadingLibrarySavePort>(
  'READING_LIBRARY_SAVE',
);
