import { signal } from '@angular/core';
import {
  ReadingLibrarySavePort,
  SaveReadingArticleToLibraryInput,
  SaveReadingArticleToLibraryResult,
} from '../../../application/ports/reading-library-save.port';
import { ReadingArticleSnapshot } from '../../../domain/reading-article';
import {
  ExploreBrowserReaderSaveActions,
  ExploreBrowserReaderSaveBrowser,
} from './explore-browser-reader-save-actions';

const articleSnapshot: ReadingArticleSnapshot = {
  url: 'https://example.com/article',
  title: 'Readable article',
  byline: 'A Writer',
  siteName: 'Example',
  excerpt: 'A short summary.',
  publishedTime: '2026-06-26',
  contentHtml: '<p>Readable body.</p>',
  textContent: 'Readable body.',
  length: 14,
};

class FakeExploreBrowserReaderSaveBrowser implements ExploreBrowserReaderSaveBrowser {
  public readonly readingArticle = signal<ReadingArticleSnapshot | null>(articleSnapshot);
  public readonly chapterNavigationLoading = signal(false);
  public readonly activeTab = signal<{
    readonly id: string;
    readonly url: string;
    readonly pageTitle: string;
    readonly backStack: readonly string[];
    readonly lastLibrarySeriesTitle: string | null;
  }>({
    id: 'tab-1',
    url: 'https://example.com/article',
    pageTitle: 'Readable article',
    backStack: [],
    lastLibrarySeriesTitle: 'Remembered Series',
  });
  public rememberedTitle: string | null = null;

  public rememberActiveTabLibrarySeriesTitle(title: string): Promise<void> {
    this.rememberedTitle = title;
    return Promise.resolve();
  }
}

class FakeReadingLibrarySave implements ReadingLibrarySavePort {
  public readonly savedInputs: SaveReadingArticleToLibraryInput[] = [];
  public saveResult: SaveReadingArticleToLibraryResult = { status: 'saved' };
  public listSeriesCount = 0;

  public listSeries(): Promise<
    readonly [
      {
        readonly id: 'series-1';
        readonly title: 'Remembered Series';
        readonly entryCount: 2;
        readonly lastSavedAt: '2026-06-26T10:00:00.000Z';
      },
    ]
  > {
    this.listSeriesCount += 1;
    return Promise.resolve([
      {
        id: 'series-1',
        title: 'Remembered Series',
        entryCount: 2,
        lastSavedAt: '2026-06-26T10:00:00.000Z',
      },
    ]);
  }

  public save(input: SaveReadingArticleToLibraryInput): Promise<SaveReadingArticleToLibraryResult> {
    this.savedInputs.push(input);
    return Promise.resolve(this.saveResult);
  }
}

describe('ExploreBrowserReaderSaveActions', () => {
  let browser: FakeExploreBrowserReaderSaveBrowser;
  let librarySave: FakeReadingLibrarySave;
  let actions: ExploreBrowserReaderSaveActions;

  beforeEach(() => {
    browser = new FakeExploreBrowserReaderSaveBrowser();
    librarySave = new FakeReadingLibrarySave();
    actions = new ExploreBrowserReaderSaveActions(browser, librarySave);
  });

  it('opens and coordinates the save form helpers', async () => {
    await actions.openSaveModal();

    expect(actions.saveForm.modalOpen()).toBeTrue();
    expect(actions.saveForm.seriesInput).toBe('Remembered Series');
    expect(actions.saveForm.entryTitleInput).toBe('Readable article');
    expect(actions.filteredSeries().map((series) => series.title)).toEqual(['Remembered Series']);
    expect(actions.showCreateSeries()).toBeFalse();
    expect(actions.canSave()).toBeTrue();

    const series = actions.saveForm.existingSeries()[0];
    if (series === undefined) {
      fail('Expected an existing Series option.');
      return;
    }

    actions.updateSeriesInput('New Series');
    actions.updateEntryTitle('Updated entry');
    actions.selectSeries(series);

    expect(actions.saveForm.seriesInput).toBe('Remembered Series');
    expect(actions.saveForm.entryTitleInput).toBe('Updated entry');

    actions.closeSaveModal();

    expect(actions.saveForm.modalOpen()).toBeFalse();
  });

  it('does not open while article state is unavailable or chapter navigation is loading', async () => {
    browser.readingArticle.set(null);

    await actions.openSaveModal();

    expect(actions.saveForm.modalOpen()).toBeFalse();
    expect(librarySave.listSeriesCount).toBe(0);

    browser.readingArticle.set(articleSnapshot);
    browser.chapterNavigationLoading.set(true);

    await actions.openSaveModal();

    expect(actions.saveForm.modalOpen()).toBeFalse();
    expect(librarySave.listSeriesCount).toBe(0);
  });

  it('saves to Library and remembers the Series only after a saved result', async () => {
    await actions.openSaveModal();

    await actions.saveToLibrary();

    expect(librarySave.savedInputs[0]).toEqual(
      jasmine.objectContaining({
        article: articleSnapshot,
        entryTitle: 'Readable article',
        target: { kind: 'existing', seriesId: 'series-1' },
      }),
    );
    expect(browser.rememberedTitle).toBe('Remembered Series');
    expect(actions.saveForm.confirmed()).toBeTrue();

    browser.rememberedTitle = null;
    await actions.openSaveModal();
    actions.updateSeriesInput('Remembered Series');
    librarySave.saveResult = { status: 'duplicate' };

    await actions.saveToLibrary();

    expect(browser.rememberedTitle).toBeNull();
    expect(actions.saveForm.error()).toContain('already saved');
  });

  it('does not save when required state is unavailable', async () => {
    await actions.saveToLibrary();

    expect(librarySave.savedInputs).toEqual([]);

    await actions.openSaveModal();
    browser.readingArticle.set(null);

    await actions.saveToLibrary();

    expect(librarySave.savedInputs).toEqual([]);
  });
});
