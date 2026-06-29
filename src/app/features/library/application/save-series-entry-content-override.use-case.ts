import { Injectable, inject } from '@angular/core';
import { LIBRARY_CLOCK } from './ports/library-clock.port';
import { LIBRARY_CONTENT_SANITIZER } from './ports/library-content-sanitizer.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';

export interface SaveSeriesEntryContentOverrideInput {
  readonly seriesId: string;
  readonly entryId: string;
  readonly contentHtml: string;
}

export type SaveSeriesEntryContentOverrideResult =
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
export class SaveSeriesEntryContentOverrideUseCase {
  private readonly repository = inject(LIBRARY_REPOSITORY);
  private readonly sanitizer = inject(LIBRARY_CONTENT_SANITIZER);
  private readonly clock = inject(LIBRARY_CLOCK);

  public async execute(
    input: SaveSeriesEntryContentOverrideInput,
  ): Promise<SaveSeriesEntryContentOverrideResult> {
    const sanitized = this.sanitizer.sanitizeContentHtml(input.contentHtml);
    if (!sanitized.hasRenderableContent) {
      return {
        status: 'validationFailed',
        message: 'Edited content must not be empty.',
      };
    }

    const saved = await this.repository.saveSeriesEntryContentOverride({
      seriesId: input.seriesId,
      entryId: input.entryId,
      contentHtml: sanitized.contentHtml,
      savedAt: this.clock.now(),
    });
    if (!saved.ok) {
      return { status: 'persistenceFailed' };
    }

    return { status: saved.status };
  }
}
