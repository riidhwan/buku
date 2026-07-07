import { TestBed } from '@angular/core/testing';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import {
  LibraryRepository,
  SaveSeriesEntryHeaderVisibilityInput as RepositoryInput,
  SaveSeriesEntryHeaderVisibilityRepositoryResult,
} from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import { SaveSeriesEntryHeaderVisibilityUseCase } from './save-series-entry-header-visibility.use-case';

describe('SaveSeriesEntryHeaderVisibilityUseCase', () => {
  let repository: FakeLibraryRepository;
  let useCase: SaveSeriesEntryHeaderVisibilityUseCase;

  beforeEach(() => {
    repository = new FakeLibraryRepository();
    const clock: LibraryClock = { now: () => '2026-06-29T10:00:00.000Z' };

    TestBed.configureTestingModule({
      providers: [
        SaveSeriesEntryHeaderVisibilityUseCase,
        { provide: LIBRARY_REPOSITORY, useValue: repository },
        { provide: LIBRARY_CLOCK, useValue: clock },
      ],
    });

    useCase = TestBed.inject(SaveSeriesEntryHeaderVisibilityUseCase);
  });

  it('saves entry header visibility with the current time', async () => {
    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'entry-1',
        headerVisible: false,
      }),
    ).toBeResolvedTo({ status: 'saved' });

    expect(repository.savedInput).toEqual({
      seriesId: 'series-1',
      entryId: 'entry-1',
      headerVisible: false,
      savedAt: '2026-06-29T10:00:00.000Z',
    });
  });

  it('maps missing entry and persistence failures to typed results', async () => {
    repository.result = { ok: true, status: 'missingEntry' };
    await expectAsync(
      useCase.execute({ seriesId: 'series-1', entryId: 'missing', headerVisible: false }),
    ).toBeResolvedTo({ status: 'missingEntry' });

    repository.result = { ok: false, reason: 'persistenceFailed' };
    await expectAsync(
      useCase.execute({ seriesId: 'series-1', entryId: 'entry-1', headerVisible: true }),
    ).toBeResolvedTo({ status: 'persistenceFailed' });
  });
});

class FakeLibraryRepository implements Partial<LibraryRepository> {
  public savedInput: RepositoryInput | null = null;
  public result: SaveSeriesEntryHeaderVisibilityRepositoryResult = { ok: true, status: 'saved' };

  public saveSeriesEntryHeaderVisibility(
    input: RepositoryInput,
  ): Promise<SaveSeriesEntryHeaderVisibilityRepositoryResult> {
    this.savedInput = input;
    return Promise.resolve(this.result);
  }
}
