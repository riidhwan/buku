import { Injectable, inject } from '@angular/core';
import { LIBRARY_CLOCK } from './ports/library-clock.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';

export interface SaveSeriesEntryHeaderVisibilityInput {
  readonly seriesId: string;
  readonly entryId: string;
  readonly headerVisible: boolean;
}

export type SaveSeriesEntryHeaderVisibilityResult =
  | {
      readonly status: 'saved';
    }
  | {
      readonly status: 'missingEntry';
    }
  | {
      readonly status: 'persistenceFailed';
    };

@Injectable()
export class SaveSeriesEntryHeaderVisibilityUseCase {
  private readonly repository = inject(LIBRARY_REPOSITORY);
  private readonly clock = inject(LIBRARY_CLOCK);

  public async execute(
    input: SaveSeriesEntryHeaderVisibilityInput,
  ): Promise<SaveSeriesEntryHeaderVisibilityResult> {
    const result = await this.repository.saveSeriesEntryHeaderVisibility({
      ...input,
      savedAt: this.clock.now(),
    });
    if (!result.ok) {
      return { status: 'persistenceFailed' };
    }

    return { status: result.status };
  }
}
