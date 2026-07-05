import { TestBed } from '@angular/core/testing';
import { LibraryFacade } from './features/library/application/library.facade';
import {
  SaveReadingSnapshotToLibraryInput,
  SaveReadingSnapshotToLibraryResult,
} from './features/library/application/save-reading-snapshot-to-library.use-case';
import { ReadingLibrarySaveAdapter } from './reading-library-save.adapter';

class FakeLibraryFacade {
  public result: SaveReadingSnapshotToLibraryResult = {
    status: 'saved',
    seriesId: 'series-1',
    entryId: 'entry-1',
  };
  public target: SaveReadingSnapshotToLibraryInput['target'] | null = null;

  public listSeries() {
    return Promise.resolve([
      {
        id: 'series-1',
        title: 'Existing Series',
        entryCount: 1,
        lastSavedAt: '2026-06-26T10:00:00.000Z',
      },
    ]);
  }

  public saveReadingSnapshot(input: SaveReadingSnapshotToLibraryInput) {
    this.target = input.target;
    return Promise.resolve(this.result);
  }
}

describe('ReadingLibrarySaveAdapter', () => {
  let adapter: ReadingLibrarySaveAdapter;
  let library: FakeLibraryFacade;

  beforeEach(() => {
    library = new FakeLibraryFacade();
    TestBed.configureTestingModule({
      providers: [ReadingLibrarySaveAdapter, { provide: LibraryFacade, useValue: library }],
    });

    adapter = TestBed.inject(ReadingLibrarySaveAdapter);
  });

  it('lists Library Series options through the Library facade', async () => {
    await expectAsync(adapter.listSeries()).toBeResolvedTo([
      {
        id: 'series-1',
        title: 'Existing Series',
        entryCount: 1,
        lastSavedAt: '2026-06-26T10:00:00.000Z',
      },
    ]);
  });

  it('maps saved and expected failure results from the Library facade', async () => {
    await expectAsync(adapter.save(saveInput())).toBeResolvedTo({ status: 'saved' });

    library.result = { status: 'duplicate', seriesId: 'series-1', entryId: 'entry-1' };

    await expectAsync(adapter.save(saveInput())).toBeResolvedTo({ status: 'duplicate' });

    library.result = { status: 'validationFailed', message: 'Title is required.' };

    await expectAsync(adapter.save(saveInput())).toBeResolvedTo({
      status: 'validationFailed',
      message: 'Title is required.',
    });

    library.result = { status: 'persistenceFailed' };

    await expectAsync(adapter.save(saveInput())).toBeResolvedTo({ status: 'persistenceFailed' });
  });
});

function saveInput() {
  return {
    article: {
      url: 'https://example.com/article',
      title: 'Readable article',
      byline: 'A Writer',
      siteName: 'Example',
      excerpt: 'A short summary.',
      publishedTime: '2026-06-26',
      contentHtml: '<p>Readable body.</p>',
      textContent: 'Readable body.',
      length: 14,
    },
    entryTitle: 'Readable article',
    target: { kind: 'title', title: 'New Series' },
  } as const;
}
