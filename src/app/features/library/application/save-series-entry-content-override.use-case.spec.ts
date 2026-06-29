import { TestBed } from '@angular/core/testing';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import {
  LIBRARY_CONTENT_SANITIZER,
  LibraryContentSanitizer,
  SanitizedLibraryContent,
} from './ports/library-content-sanitizer.port';
import {
  LibraryRepository,
  SaveSeriesEntryContentOverrideInput as RepositoryInput,
  SaveSeriesEntryContentOverrideRepositoryResult,
} from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import { SaveSeriesEntryContentOverrideUseCase } from './save-series-entry-content-override.use-case';

describe('SaveSeriesEntryContentOverrideUseCase', () => {
  let repository: FakeLibraryRepository;
  let sanitizer: FakeContentSanitizer;
  let useCase: SaveSeriesEntryContentOverrideUseCase;

  beforeEach(() => {
    repository = new FakeLibraryRepository();
    sanitizer = new FakeContentSanitizer();
    const clock: LibraryClock = { now: () => '2026-06-29T10:00:00.000Z' };

    TestBed.configureTestingModule({
      providers: [
        SaveSeriesEntryContentOverrideUseCase,
        { provide: LIBRARY_REPOSITORY, useValue: repository },
        { provide: LIBRARY_CONTENT_SANITIZER, useValue: sanitizer },
        { provide: LIBRARY_CLOCK, useValue: clock },
      ],
    });

    useCase = TestBed.inject(SaveSeriesEntryContentOverrideUseCase);
  });

  it('sanitizes content before saving the override', async () => {
    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<p onclick="bad()">Draft</p>',
      }),
    ).toBeResolvedTo({ status: 'saved' });

    expect(sanitizer.seenHtml).toBe('<p onclick="bad()">Draft</p>');
    expect(repository.savedInput).toEqual({
      seriesId: 'series-1',
      entryId: 'entry-1',
      contentHtml: '<p>Clean</p>',
      savedAt: '2026-06-29T10:00:00.000Z',
    });
  });

  it('returns validationFailed when sanitized content is empty', async () => {
    sanitizer.result = { contentHtml: '', hasRenderableContent: false };

    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<script></script>',
      }),
    ).toBeResolvedTo({
      status: 'validationFailed',
      message: 'Edited content must not be empty.',
    });
    expect(repository.savedInput).toBeNull();
  });

  it('maps missing entry and persistence failures to typed results', async () => {
    repository.result = { ok: true, status: 'missingEntry' };
    await expectAsync(
      useCase.execute({ seriesId: 'series-1', entryId: 'missing', contentHtml: '<p>Clean</p>' }),
    ).toBeResolvedTo({ status: 'missingEntry' });

    repository.result = { ok: false, reason: 'persistenceFailed' };
    await expectAsync(
      useCase.execute({ seriesId: 'series-1', entryId: 'entry-1', contentHtml: '<p>Clean</p>' }),
    ).toBeResolvedTo({ status: 'persistenceFailed' });
  });
});

class FakeContentSanitizer implements LibraryContentSanitizer {
  public seenHtml: string | null = null;
  public result: SanitizedLibraryContent = {
    contentHtml: '<p>Clean</p>',
    hasRenderableContent: true,
  };

  public sanitizeContentHtml(contentHtml: string): SanitizedLibraryContent {
    this.seenHtml = contentHtml;
    return this.result;
  }
}

class FakeLibraryRepository implements Partial<LibraryRepository> {
  public savedInput: RepositoryInput | null = null;
  public result: SaveSeriesEntryContentOverrideRepositoryResult = { ok: true, status: 'saved' };

  public saveSeriesEntryContentOverride(
    input: RepositoryInput,
  ): Promise<SaveSeriesEntryContentOverrideRepositoryResult> {
    this.savedInput = input;
    return Promise.resolve(this.result);
  }
}
