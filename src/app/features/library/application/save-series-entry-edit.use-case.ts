import { Injectable, inject } from '@angular/core';
import { LIBRARY_CLOCK } from './ports/library-clock.port';
import { LIBRARY_CONTENT_SANITIZER } from './ports/library-content-sanitizer.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import { normalizeTitle } from './save-reading-snapshot-to-library.use-case';

export interface SaveSeriesEntryEditInput {
  readonly seriesId: string;
  readonly entryId: string;
  readonly displayTitle: string;
  readonly headerVisible: boolean;
  readonly contentHtml: string | null;
}

export type SaveSeriesEntryEditResult =
  | {
      readonly status: 'saved';
    }
  | {
      readonly status: 'missingEntry';
    }
  | {
      readonly status: 'validationFailed';
      readonly message: string;
    }
  | {
      readonly status: 'persistenceFailed';
    };

@Injectable()
export class SaveSeriesEntryEditUseCase {
  private readonly repository = inject(LIBRARY_REPOSITORY);
  private readonly sanitizer = inject(LIBRARY_CONTENT_SANITIZER);
  private readonly clock = inject(LIBRARY_CLOCK);

  public async execute(input: SaveSeriesEntryEditInput): Promise<SaveSeriesEntryEditResult> {
    const displayTitle = normalizeTitle(input.displayTitle);
    if (displayTitle === '') {
      return {
        status: 'validationFailed',
        message: 'Entry title is required.',
      };
    }

    const sanitizedContent =
      input.contentHtml === null ? null : this.sanitizer.sanitizeContentHtml(input.contentHtml);
    if (sanitizedContent !== null && !sanitizedContent.hasRenderableContent) {
      return {
        status: 'validationFailed',
        message: 'Edited content must not be empty.',
      };
    }

    const saved = await this.repository.saveSeriesEntryEdit({
      seriesId: input.seriesId,
      entryId: input.entryId,
      displayTitle,
      headerVisible: input.headerVisible,
      contentHtml: sanitizedContent?.contentHtml ?? null,
      savedAt: this.clock.now(),
    });
    if (!saved.ok) {
      return { status: 'persistenceFailed' };
    }

    return { status: saved.status };
  }
}
