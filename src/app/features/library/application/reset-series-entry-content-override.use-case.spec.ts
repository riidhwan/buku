import { TestBed } from '@angular/core/testing';
import {
  LibraryRepository,
  ResetSeriesEntryContentOverrideInput as RepositoryInput,
  ResetSeriesEntryContentOverrideRepositoryResult,
} from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import { ResetSeriesEntryContentOverrideUseCase } from './reset-series-entry-content-override.use-case';

describe('ResetSeriesEntryContentOverrideUseCase', () => {
  let repository: FakeLibraryRepository;
  let useCase: ResetSeriesEntryContentOverrideUseCase;

  beforeEach(() => {
    repository = new FakeLibraryRepository();

    TestBed.configureTestingModule({
      providers: [
        ResetSeriesEntryContentOverrideUseCase,
        { provide: LIBRARY_REPOSITORY, useValue: repository },
      ],
    });

    useCase = TestBed.inject(ResetSeriesEntryContentOverrideUseCase);
  });

  it('deletes the current override for an existing entry', async () => {
    await expectAsync(useCase.execute({ seriesId: 'series-1', entryId: 'entry-1' })).toBeResolvedTo(
      { status: 'reset' },
    );

    expect(repository.resetInput).toEqual({ seriesId: 'series-1', entryId: 'entry-1' });
  });

  it('maps missing entry and persistence failures to typed results', async () => {
    repository.result = { ok: true, status: 'missingEntry' };
    await expectAsync(
      useCase.execute({ seriesId: 'series-1', entryId: 'missing-entry' }),
    ).toBeResolvedTo({ status: 'missingEntry' });

    repository.result = { ok: false, reason: 'persistenceFailed' };
    await expectAsync(useCase.execute({ seriesId: 'series-1', entryId: 'entry-1' })).toBeResolvedTo(
      { status: 'persistenceFailed' },
    );
  });
});

class FakeLibraryRepository implements Partial<LibraryRepository> {
  public resetInput: RepositoryInput | null = null;
  public result: ResetSeriesEntryContentOverrideRepositoryResult = { ok: true, status: 'reset' };

  public resetSeriesEntryContentOverride(
    input: RepositoryInput,
  ): Promise<ResetSeriesEntryContentOverrideRepositoryResult> {
    this.resetInput = input;
    return Promise.resolve(this.result);
  }
}
