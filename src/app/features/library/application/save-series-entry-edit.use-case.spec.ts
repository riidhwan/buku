import { TestBed } from '@angular/core/testing';
import { LIBRARY_CLOCK, LibraryClock } from './ports/library-clock.port';
import {
  LIBRARY_CONTENT_SANITIZER,
  LibraryContentSanitizer,
  SanitizedLibraryContent,
} from './ports/library-content-sanitizer.port';
import {
  LibraryRepository,
  SaveSeriesEntryEditInput as RepositoryInput,
  SaveSeriesEntryEditRepositoryResult,
} from './ports/library-repository.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';
import { SaveSeriesEntryEditUseCase } from './save-series-entry-edit.use-case';

describe('SaveSeriesEntryEditUseCase', () => {
  let repository: FakeLibraryRepository;
  let sanitizer: FakeContentSanitizer;
  let useCase: SaveSeriesEntryEditUseCase;

  beforeEach(() => {
    repository = new FakeLibraryRepository();
    sanitizer = new FakeContentSanitizer();
    const clock: LibraryClock = { now: () => '2026-06-28T10:00:00.000Z' };

    TestBed.configureTestingModule({
      providers: [
        SaveSeriesEntryEditUseCase,
        { provide: LIBRARY_REPOSITORY, useValue: repository },
        { provide: LIBRARY_CONTENT_SANITIZER, useValue: sanitizer },
        { provide: LIBRARY_CLOCK, useValue: clock },
      ],
    });

    useCase = TestBed.inject(SaveSeriesEntryEditUseCase);
  });

  it('normalizes the title and saves sanitized content in one repository call', async () => {
    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'entry-1',
        displayTitle: '  Renamed   Chapter  ',
        headerVisible: false,
        contentHtml: '<p>Edited</p><script>bad()</script>',
      }),
    ).toBeResolvedTo({ status: 'saved' });

    expect(repository.savedInputs).toEqual([
      {
        seriesId: 'series-1',
        entryId: 'entry-1',
        displayTitle: 'Renamed Chapter',
        headerVisible: false,
        contentHtml: '<p>Edited</p>',
        savedAt: '2026-06-28T10:00:00.000Z',
      },
    ]);
  });

  it('rejects empty titles before persistence', async () => {
    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'entry-1',
        displayTitle: '   ',
        headerVisible: true,
        contentHtml: null,
      }),
    ).toBeResolvedTo({
      status: 'validationFailed',
      message: 'Entry title is required.',
    });

    expect(repository.savedInputs).toEqual([]);
  });

  it('rejects empty edited content before persistence', async () => {
    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'entry-1',
        displayTitle: 'Chapter 1',
        headerVisible: true,
        contentHtml: '   ',
      }),
    ).toBeResolvedTo({
      status: 'validationFailed',
      message: 'Edited content must not be empty.',
    });

    expect(repository.savedInputs).toEqual([]);
  });

  it('maps missing entries and persistence failures to typed results', async () => {
    repository.result = { ok: true, status: 'missingEntry' };

    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'missing-entry',
        displayTitle: 'Chapter 1',
        headerVisible: true,
        contentHtml: null,
      }),
    ).toBeResolvedTo({ status: 'missingEntry' });

    repository.result = { ok: false, reason: 'persistenceFailed' };

    await expectAsync(
      useCase.execute({
        seriesId: 'series-1',
        entryId: 'entry-1',
        displayTitle: 'Chapter 1',
        headerVisible: true,
        contentHtml: null,
      }),
    ).toBeResolvedTo({ status: 'persistenceFailed' });
  });
});

class FakeContentSanitizer implements LibraryContentSanitizer {
  public sanitizeContentHtml(contentHtml: string): SanitizedLibraryContent {
    const template = document.createElement('template');
    template.innerHTML = contentHtml;
    template.content.querySelectorAll('script').forEach((element) => {
      element.remove();
    });

    return {
      contentHtml: template.innerHTML.trim(),
      hasRenderableContent: contentHtml.trim() !== '',
    };
  }
}

class FakeLibraryRepository implements Partial<LibraryRepository> {
  public result: SaveSeriesEntryEditRepositoryResult = { ok: true, status: 'saved' };
  public readonly savedInputs: RepositoryInput[] = [];

  public saveSeriesEntryEdit(input: RepositoryInput): Promise<SaveSeriesEntryEditRepositoryResult> {
    this.savedInputs.push(input);
    return Promise.resolve(this.result);
  }
}
