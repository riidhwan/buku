import { Injectable, inject } from '@angular/core';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';

export interface ResetSeriesEntryContentOverrideInput {
  readonly seriesId: string;
  readonly entryId: string;
}

export type ResetSeriesEntryContentOverrideResult =
  | {
      readonly status: 'reset';
    }
  | {
      readonly status: 'missingEntry';
    }
  | {
      readonly status: 'persistenceFailed';
    };

@Injectable()
export class ResetSeriesEntryContentOverrideUseCase {
  private readonly repository = inject(LIBRARY_REPOSITORY);

  public async execute(
    input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideResult> {
    const result = await this.repository.resetSeriesEntryContentOverride(input);
    if (!result.ok) {
      return { status: 'persistenceFailed' };
    }

    return { status: result.status };
  }
}
