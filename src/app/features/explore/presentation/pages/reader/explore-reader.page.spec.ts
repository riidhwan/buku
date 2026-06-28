import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ReadingArticleSnapshot } from '../../../domain/reading-article';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import {
  READING_LIBRARY_SAVE,
  ReadingLibrarySeriesOption,
} from '../../../application/ports/reading-library-save.port';
import { ExploreReaderPage } from './explore-reader.page';
import { ExploreReaderSaveForm } from './explore-reader-save-form';

const articleSnapshot: ReadingArticleSnapshot = {
  url: 'https://example.com/article',
  title: 'Readable article',
  byline: 'A Writer',
  siteName: 'Example',
  excerpt: 'A short summary.',
  publishedTime: '2026-06-26',
  contentHtml:
    '<p>Readable body.</p><p><a href="/next"><span>Next article</span></a></p><script>window.bad = true;</script>',
  textContent: 'Readable body. Next article',
  length: 27,
  previousChapter: {
    href: '/previous',
    label: 'Previous chapter',
  },
  nextChapter: {
    href: '/next-chapter',
    label: 'Next chapter',
  },
};

class FakeExploreBrowserFacade {
  public readonly readingArticle = signal<ReadingArticleSnapshot | null>(articleSnapshot);
  public readonly chapterNavigationLoading = signal(false);
  public readonly activeTab = signal({
    id: 'tab-1',
    url: 'https://example.com/article',
    pageTitle: 'Readable article',
    backStack: [],
    lastLibrarySeriesTitle: null as string | null,
  });
  public hidden = 0;
  public closed = 0;
  public openedHref: string | null = null;
  public chapterDirection: 'previous' | 'next' | null = null;
  public linkResult = true;
  public chapterDestination: 'reader' | 'browser' = 'reader';
  public rememberedSeriesTitle: string | null = null;

  public hideViewport(): Promise<void> {
    this.hidden += 1;
    return Promise.resolve();
  }

  public closeReadingMode(): Promise<void> {
    this.closed += 1;
    this.readingArticle.set(null);
    return Promise.resolve();
  }

  public rememberActiveTabLibrarySeriesTitle(title: string): Promise<void> {
    this.rememberedSeriesTitle = title;
    this.activeTab.update((tab) => ({ ...tab, lastLibrarySeriesTitle: title }));
    return Promise.resolve();
  }

  public openReadingModeLink(href: string): Promise<{ readonly ok: boolean }> {
    this.openedHref = href;
    return Promise.resolve({ ok: this.linkResult });
  }

  public navigateReadingChapter(
    direction: 'previous' | 'next',
  ): Promise<{ readonly ok: true; readonly destination: 'reader' | 'browser' }> {
    this.chapterDirection = direction;
    return Promise.resolve({ ok: true, destination: this.chapterDestination });
  }
}

class FakeRouter {
  public readonly navigations: string[][] = [];

  public navigate(commands: string[]): Promise<boolean> {
    this.navigations.push(commands);
    return Promise.resolve(true);
  }
}

class FakeReadingLibrarySave {
  public readonly savedInputs: unknown[] = [];
  public listSeriesCount = 0;
  public saveStatus:
    | 'saved'
    | 'duplicate'
    | 'validationFailed'
    | 'validationFailedWithoutMessage'
    | 'persistenceFailed' = 'saved';

  public listSeries(): Promise<
    readonly [
      {
        readonly id: 'series-1';
        readonly title: 'Existing Series';
        readonly entryCount: 2;
        readonly lastSavedAt: '2026-06-26T10:00:00.000Z';
      },
    ]
  > {
    this.listSeriesCount += 1;
    return Promise.resolve([
      {
        id: 'series-1',
        title: 'Existing Series',
        entryCount: 2,
        lastSavedAt: '2026-06-26T10:00:00.000Z',
      },
    ]);
  }

  public save(
    input: unknown,
  ): Promise<
    | { readonly status: 'saved' | 'duplicate' | 'persistenceFailed' }
    | { readonly status: 'validationFailed'; readonly message: 'Invalid save input.' }
    | { readonly status: 'validationFailed' }
  > {
    this.savedInputs.push(input);
    if (this.saveStatus === 'validationFailed') {
      return Promise.resolve({ status: 'validationFailed', message: 'Invalid save input.' });
    }
    if (this.saveStatus === 'validationFailedWithoutMessage') {
      return Promise.resolve({ status: 'validationFailed' });
    }

    return Promise.resolve({ status: this.saveStatus });
  }
}

interface ExploreReaderPageHarness {
  readonly saveForm: ExploreReaderSaveForm;
  openSaveModal(): Promise<void>;
  closeSaveModal(): void;
  selectSeries(series: ReadingLibrarySeriesOption): void;
  updateSeriesInput(value: string | number | null | undefined): void;
  updateEntryTitle(value: string | number | null | undefined): void;
  canSave(): boolean;
  filteredSeries(): readonly ReadingLibrarySeriesOption[];
  showCreateSeries(): boolean;
  saveToLibrary(): Promise<void>;
}

function isIonButtonDisabled(button: Element): boolean {
  return (
    button.hasAttribute('disabled') ||
    ((button as HTMLElement & { readonly disabled?: boolean }).disabled ?? false)
  );
}

describe('ExploreReaderPage', () => {
  let fixture: ComponentFixture<ExploreReaderPage>;
  let browser: FakeExploreBrowserFacade;
  let router: FakeRouter;
  let librarySave: FakeReadingLibrarySave;

  beforeEach(async () => {
    browser = new FakeExploreBrowserFacade();
    router = new FakeRouter();
    librarySave = new FakeReadingLibrarySave();

    await TestBed.configureTestingModule({
      imports: [ExploreReaderPage],
      providers: [
        { provide: ExploreBrowserFacade, useValue: browser },
        { provide: READING_LIBRARY_SAVE, useValue: librarySave },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(ExploreReaderPage);
    fixture.detectChanges();
  }

  it('hides the native viewport and renders the in-memory article', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(browser.hidden).toBe(1);
    expect(nativeElement.querySelector('h1')?.textContent).toContain('Readable article');
    expect(nativeElement.querySelector('.reader-source')?.textContent).toContain('Example');
    expect(nativeElement.querySelector('time')?.getAttribute('datetime')).toBe('2026-06-26');
    expect(nativeElement.querySelector('time')?.textContent).toContain('Jun 26, 2026');
    expect(nativeElement.querySelector('.reader-excerpt')).toBeNull();
    expect(nativeElement.querySelector('.reader-body')?.textContent).toContain('Readable body.');
    expect(nativeElement.querySelector('.reader-body script')).toBeNull();
  });

  it('falls back to raw published time text when it cannot be parsed', async () => {
    browser.readingArticle.set({
      ...articleSnapshot,
      publishedTime: 'unknown date',
    });

    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('time')?.textContent).toContain('unknown date');
  });

  it('redirects cold reader opens back to Explore', async () => {
    browser.readingArticle.set(null);

    createPage();
    await fixture.whenStable();

    expect(router.navigations).toEqual([['explore']]);
  });

  it('closes reading mode back to the Explore Browser', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const closeButton = nativeElement.querySelectorAll('ion-header ion-button').item(0);
    closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.closed).toBe(1);
    expect(router.navigations).toEqual([['explore']]);
  });

  it('always renders chapter buttons and disables unavailable directions', async () => {
    const nextChapter = articleSnapshot.nextChapter;
    if (nextChapter === undefined) {
      fail('Expected the base article fixture to include a next chapter.');
      return;
    }

    browser.readingArticle.set({
      url: articleSnapshot.url,
      title: articleSnapshot.title,
      byline: articleSnapshot.byline,
      siteName: articleSnapshot.siteName,
      excerpt: articleSnapshot.excerpt,
      publishedTime: articleSnapshot.publishedTime,
      contentHtml: articleSnapshot.contentHtml,
      textContent: articleSnapshot.textContent,
      length: articleSnapshot.length,
      nextChapter,
    });
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const chapterButtons = chapterButtonsFrom(nativeElement);
    const previousButton = chapterButtonAt(chapterButtons, 0);
    const nextButton = chapterButtonAt(chapterButtons, 1);

    expect(chapterButtons.length).toBe(2);
    expect(previousButton.querySelector('ion-icon')?.getAttribute('name')).toBe(
      'chevron-back-outline',
    );
    expect(nextButton.querySelector('ion-icon')?.getAttribute('name')).toBe(
      'chevron-forward-outline',
    );
    expect(isIonButtonDisabled(previousButton)).toBeTrue();
    expect(isIonButtonDisabled(nextButton)).toBeFalse();
  });

  it('shows chapter loading state and disables chapter buttons while loading', async () => {
    browser.chapterNavigationLoading.set(true);
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const chapterButtons = chapterButtonsFrom(nativeElement);

    expect(nativeElement.querySelector('ion-spinner[aria-label="Loading chapter"]')).not.toBeNull();
    expect(isIonButtonDisabled(chapterButtonAt(chapterButtons, 0))).toBeTrue();
    expect(isIonButtonDisabled(chapterButtonAt(chapterButtons, 1))).toBeTrue();
  });

  it('navigates chapters through the facade without leaving the reader on replacement', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const nextButton = chapterButtonAt(chapterButtonsFrom(nativeElement), 1);
    nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.chapterDirection).toBe('next');
    expect(router.navigations).toEqual([]);
  });

  it('routes to the Explore Browser when chapter navigation falls back', async () => {
    browser.chapterDestination = 'browser';
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const previousButton = chapterButtonAt(chapterButtonsFrom(nativeElement), 0);
    previousButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.chapterDirection).toBe('previous');
    expect(router.navigations).toEqual([['explore']]);
  });

  it('opens article links through the Explore Browser', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const link = nativeElement.querySelector('.reader-body a');
    link
      ?.querySelector('span')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(browser.openedHref).toBe('/next');
    expect(router.navigations).toEqual([['explore']]);
  });

  it('stays in the reader when a reader link cannot be opened', async () => {
    browser.linkResult = false;
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    nativeElement.querySelector('.reader-body a')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBe('/next');
    expect(router.navigations).toEqual([]);
  });

  it('ignores reader body clicks that are not links', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    nativeElement.querySelector('.reader-body')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBeNull();
    expect(router.navigations).toEqual([]);
  });

  it('ignores reader events that do not start from an element', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const readerBody = nativeElement.querySelector('.reader-body');
    const text = document.createTextNode('plain text');
    readerBody?.append(text);
    text.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBeNull();
    expect(router.navigations).toEqual([]);
  });

  it('opens the save modal with Series empty and Entry title prefilled', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.saveForm.modalOpen()).toBeTrue();
    expect(component.saveForm.existingSeries().map((series) => series.title)).toEqual([
      'Existing Series',
    ]);
    expect(component.saveForm.entryTitleInput).toBe('Readable article');
    expect(component.saveForm.seriesInput).toBe('');
  });

  it('prefills the save modal with the active tab remembered Series', async () => {
    browser.activeTab.update((tab) => ({
      ...tab,
      lastLibrarySeriesTitle: 'Existing Series',
    }));
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();

    expect(component.saveForm.seriesInput).toBe('Existing Series');
  });

  it('does not open the save modal while article state is unavailable', async () => {
    browser.chapterNavigationLoading.set(true);
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();

    expect(component.saveForm.modalOpen()).toBeFalse();
    expect(librarySave.listSeriesCount).toBe(0);

    browser.chapterNavigationLoading.set(false);
    browser.readingArticle.set(null);
    await component.openSaveModal();

    expect(component.saveForm.modalOpen()).toBeFalse();
    expect(librarySave.listSeriesCount).toBe(0);
  });

  it('keeps save disabled until Series and Entry title are present', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();

    expect(component.canSave()).toBeFalse();
    component.updateSeriesInput('New Series');
    expect(component.canSave()).toBeTrue();
    component.updateEntryTitle('   ');
    expect(component.canSave()).toBeFalse();
  });

  it('filters Series results and exposes create state only for non-exact input', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    component.updateSeriesInput('exist');

    expect(component.filteredSeries().map((series) => series.title)).toEqual(['Existing Series']);
    expect(component.showCreateSeries()).toBeTrue();

    component.updateSeriesInput('Existing   Series');
    expect(component.showCreateSeries()).toBeFalse();
  });

  it('selects existing Series, closes when idle, and ignores close while saving', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    const series = component.saveForm.existingSeries()[0];
    if (series === undefined) {
      fail('Expected existing Series option.');
      return;
    }

    component.selectSeries(series);

    expect(component.saveForm.seriesInput).toBe('Existing Series');
    expect(component.saveForm.selectedSeriesId).toBe('series-1');

    component.saveForm.saving.set(true);
    component.closeSaveModal();
    expect(component.saveForm.modalOpen()).toBeTrue();

    component.saveForm.saving.set(false);
    component.closeSaveModal();
    expect(component.saveForm.modalOpen()).toBeFalse();
  });

  it('treats nullish form values as empty input', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    component.updateSeriesInput(null);
    component.updateEntryTitle(undefined);

    expect(component.saveForm.seriesInput).toBe('');
    expect(component.saveForm.entryTitleInput).toBe('');
  });

  it('saves without navigating away from Reading Mode', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    component.updateSeriesInput('Existing Series');
    await component.saveToLibrary();

    expect(librarySave.savedInputs.length).toBe(1);
    expect(browser.rememberedSeriesTitle).toBe('Existing Series');
    expect(component.saveForm.modalOpen()).toBeFalse();
    expect(component.saveForm.confirmed()).toBeTrue();
    expect(router.navigations).toEqual([]);
  });

  it('does not save when required input or article state is unavailable', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();

    await component.saveToLibrary();
    expect(librarySave.savedInputs.length).toBe(0);

    component.updateSeriesInput('Existing Series');
    browser.readingArticle.set(null);
    await component.saveToLibrary();
    expect(librarySave.savedInputs.length).toBe(0);
  });

  it('saves to an explicitly selected existing Series target', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    const series = component.saveForm.existingSeries()[0];
    if (series === undefined) {
      fail('Expected existing Series option.');
      return;
    }

    component.selectSeries(series);
    await component.saveToLibrary();

    expect(librarySave.savedInputs[0]).toEqual(
      jasmine.objectContaining({
        target: { kind: 'existing', seriesId: 'series-1' },
      }),
    );
  });

  it('keeps duplicate and persistence errors inline', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    component.updateSeriesInput('Existing Series');
    librarySave.saveStatus = 'duplicate';
    await component.saveToLibrary();
    expect(component.saveForm.modalOpen()).toBeTrue();
    expect(component.saveForm.error()).toContain('already saved');

    librarySave.saveStatus = 'persistenceFailed';
    await component.saveToLibrary();
    expect(component.saveForm.error()).toContain('could not save');
  });

  it('keeps validation failures inline and creates a title target for new Series', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    component.updateSeriesInput('Brand New Series');
    librarySave.saveStatus = 'validationFailed';
    await component.saveToLibrary();

    expect(librarySave.savedInputs[0]).toEqual(
      jasmine.objectContaining({
        target: { kind: 'title', title: 'Brand New Series' },
      }),
    );
    expect(component.saveForm.error()).toBe('Invalid save input.');
  });

  it('uses a fallback validation message when the save boundary omits one', async () => {
    createPage();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as ExploreReaderPageHarness;
    await component.openSaveModal();
    component.updateSeriesInput('Existing Series');
    librarySave.saveStatus = 'validationFailedWithoutMessage';
    await component.saveToLibrary();

    expect(component.saveForm.error()).toBe('Series and entry title are required.');
  });
});

function chapterButtonsFrom(nativeElement: HTMLElement): Element[] {
  return Array.from(nativeElement.querySelectorAll('ion-buttons[slot="end"] ion-button')).slice(1);
}

function chapterButtonAt(buttons: readonly Element[], index: number): Element {
  const button = buttons[index];
  if (button === undefined) {
    fail(`Expected chapter button at index ${String(index)}.`);
    return document.createElement('ion-button');
  }

  return button;
}
