import { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { EMPTY } from 'rxjs';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries, LibrarySeriesEntry } from '../../../domain/library-series';
import {
  SeriesEntryReadingAppearance,
  SeriesEntryReadingFontId,
} from '../../../domain/series-entry-reading-appearance';
import { LibraryEntryReaderPage } from './library-entry-reader.page';

let routeSeriesId = 'series-1';
let routeEntryId = 'entry-1';
let series: LibrarySeries | null = {
  id: 'series-1',
  title: 'The Clockwork Archive',
  entries: [
    {
      id: 'entry-1',
      seriesId: 'series-1',
      displayTitle: 'Chapter 1',
      sourceHost: 'example.com',
      createdAt: '2026-01-12T09:30:00.000Z',
      updatedAt: '2026-01-12T09:30:00.000Z',
    },
    {
      id: 'entry-2',
      seriesId: 'series-1',
      displayTitle: 'Chapter 2',
      sourceHost: 'example.com',
      createdAt: '2026-01-19T10:15:00.000Z',
      updatedAt: '2026-01-19T10:15:00.000Z',
    },
  ],
};

let entriesById = new Map<string, LibrarySeriesEntry>();
let readingAppearance: SeriesEntryReadingAppearance = { fontId: 'nv-charis' };
let savedReadingAppearances: SeriesEntryReadingAppearance[] = [];
let navigateSpy: jasmine.Spy;

class FakeLibraryFacade {
  public getSeries(seriesId: string): Promise<LibrarySeries | null> {
    return Promise.resolve(series !== null && seriesId === series.id ? series : null);
  }

  public getEntry(seriesId: string, entryId: string): Promise<LibrarySeriesEntry | null> {
    return Promise.resolve(
      series !== null && seriesId === series.id ? (entriesById.get(entryId) ?? null) : null,
    );
  }

  public getSeriesEntryReadingAppearance(): Promise<SeriesEntryReadingAppearance> {
    return Promise.resolve(readingAppearance);
  }

  public saveSeriesEntryReadingAppearance(appearance: SeriesEntryReadingAppearance): Promise<void> {
    readingAppearance = appearance;
    savedReadingAppearances.push(appearance);
    return Promise.resolve();
  }
}

interface LibraryEntryReaderPageHarness {
  readonly series: WritableSignal<LibrarySeries | null>;
  readonly loadedEntries: WritableSignal<readonly LibrarySeriesEntry[]>;
  readonly loadState: WritableSignal<'idle' | 'loading' | 'ended' | 'failed'>;
  ionViewWillEnter?(): Promise<void>;
  loadNextEntry(event?: { readonly target: { complete(): void | Promise<void> } }): Promise<void>;
  preventReaderLinkNavigation(event: Event): void;
  editActiveEntry(): void;
  openAppearanceMenu(event: Event): void;
  selectReadingFont(fontId: SeriesEntryReadingFontId): Promise<void>;
  updateActiveEntryFromScroll(): void;
}

describe('LibraryEntryReaderPage', () => {
  let fixture: ComponentFixture<LibraryEntryReaderPage>;

  beforeEach(async () => {
    routeSeriesId = 'series-1';
    routeEntryId = 'entry-1';
    series = {
      id: 'series-1',
      title: 'The Clockwork Archive',
      entries: [
        {
          id: 'entry-1',
          seriesId: 'series-1',
          displayTitle: 'Chapter 1',
          sourceHost: 'example.com',
          createdAt: '2026-01-12T09:30:00.000Z',
          updatedAt: '2026-01-12T09:30:00.000Z',
        },
        {
          id: 'entry-2',
          seriesId: 'series-1',
          displayTitle: 'Chapter 2',
          sourceHost: 'example.com',
          createdAt: '2026-01-19T10:15:00.000Z',
          updatedAt: '2026-01-19T10:15:00.000Z',
        },
        {
          id: 'entry-3',
          seriesId: 'series-1',
          displayTitle: 'Chapter 3',
          sourceHost: 'example.com',
          createdAt: '2026-01-26T11:45:00.000Z',
          updatedAt: '2026-01-26T11:45:00.000Z',
        },
      ],
    };
    entriesById = new Map([
      ['entry-1', entryFixture('entry-1', 'Chapter 1', 'Saved reading content.')],
      ['entry-2', entryFixture('entry-2', 'Chapter 2', 'More saved reading content.')],
      ['entry-3', entryFixture('entry-3', 'Chapter 3', 'Final saved reading content.')],
    ]);
    readingAppearance = { fontId: 'nv-charis' };
    savedReadingAppearances = [];
    navigateSpy = jasmine.createSpy('navigate').and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LibraryEntryReaderPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        { provide: Router, useValue: { events: EMPTY, navigate: navigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ seriesId: routeSeriesId, entryId: routeEntryId }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
  });

  it('renders saved entry content', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Chapter 1');
    expect(nativeElement.querySelector('.library-reader-header')?.textContent).toContain(
      'The Clockwork Archive - Chapter 1',
    );
    expect(nativeElement.querySelector('.library-reader-body')?.textContent).toContain(
      'Saved reading content.',
    );
  });

  it('loads the persisted reading font and applies it to the reader body', async () => {
    readingAppearance = { fontId: 'libron' };
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as LibraryEntryReaderPageHarness
    ).ionViewWillEnter?.();
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const readerBody = nativeElement.querySelector<HTMLElement>('.library-reader-body');

    expect(readerBody?.style.getPropertyValue('--library-reader-font-family')).toBe(
      '"Buku Libron", serif',
    );
  });

  it('persists selected reader fonts and keeps the appearance menu available', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.selectReadingFont('sourcerer');
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const readerBody = nativeElement.querySelector<HTMLElement>('.library-reader-body');

    expect(savedReadingAppearances).toEqual([{ fontId: 'sourcerer' }]);
    expect(readerBody?.style.getPropertyValue('--library-reader-font-family')).toBe(
      '"Buku Sourcerer", serif',
    );
    expect(nativeElement.querySelector('ion-popover')).not.toBeNull();
  });

  it('opens and closes the appearance menu without changing the selected font', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    component.openAppearanceMenu(new MouseEvent('click'));
    fixture.detectChanges();
    let popover = (fixture.nativeElement as HTMLElement).querySelector<HTMLIonPopoverElement>(
      'ion-popover',
    );

    expect(popover?.isOpen).toBeTrue();

    popover?.dispatchEvent(new CustomEvent('didDismiss'));
    fixture.detectChanges();
    popover = (fixture.nativeElement as HTMLElement).querySelector<HTMLIonPopoverElement>(
      'ion-popover',
    );

    expect(popover?.isOpen).toBeFalse();
    expect(savedReadingAppearances).toEqual([]);
  });

  it('renders effective content and shows the edited indicator for overrides', async () => {
    entriesById.set('entry-1', {
      ...entryFixture('entry-1', 'Chapter 1', 'Original reading content.'),
      contentOverrideHtml: '<p>Edited reading content.</p>',
      effectiveContentHtml: '<p>Edited reading content.</p>',
      hasContentOverride: true,
    });
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as LibraryEntryReaderPageHarness
    ).ionViewWillEnter?.();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.library-reader-body')?.textContent).toContain(
      'Edited reading content.',
    );
    expect(nativeElement.querySelector('.library-reader-body')?.textContent).not.toContain(
      'Original reading content.',
    );
    expect(nativeElement.querySelector('.library-reader-edited')?.textContent).toContain('Edited');
  });

  it('refreshes the routed entry when returning from the edit page', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    let nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.library-reader-body')?.textContent).toContain(
      'Saved reading content.',
    );

    entriesById.set('entry-1', {
      ...entryFixture('entry-1', 'Chapter 1', 'Saved reading content.'),
      contentOverrideHtml: '<p>Fresh edited content.</p>',
      effectiveContentHtml: '<p>Fresh edited content.</p>',
      hasContentOverride: true,
    });
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.ionViewWillEnter?.();
    fixture.detectChanges();
    nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.library-reader-body')?.textContent).toContain(
      'Fresh edited content.',
    );
  });

  it('appends one later saved entry without navigating away from the selected entry route', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.loadNextEntry();
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const articles = nativeElement.querySelectorAll('.library-reader-article');

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Chapter 1');
    expect(articles.length).toBe(2);
    expect(articles.item(0).textContent).toContain('Saved reading content.');
    expect(articles.item(1).textContent).toContain('More saved reading content.');
    expect(nativeElement.querySelectorAll('ion-buttons[slot="end"] ion-button').length).toBe(2);
  });

  it('updates the toolbar title when the next saved entry reaches the top threshold', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.loadNextEntry();
    await fixture.whenStable();
    fixture.detectChanges();
    setArticleTops(fixture, [-320, 8]);

    component.updateActiveEntryFromScroll();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Chapter 2');
  });

  it('opens edit for the active scrolled entry', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.loadNextEntry();
    await fixture.whenStable();
    fixture.detectChanges();
    setArticleTops(fixture, [-320, 8]);
    component.updateActiveEntryFromScroll();
    component.editActiveEntry();

    expect(navigateSpy).toHaveBeenCalledOnceWith([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-2',
      'edit',
    ]);
  });

  it('does not navigate to edit when no entry is active', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    component.loadedEntries.set([]);
    component.editActiveEntry();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('changes the toolbar title back when scrolling upward into an earlier saved entry', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.loadNextEntry();
    await fixture.whenStable();
    fixture.detectChanges();
    setArticleTops(fixture, [-320, 8]);
    component.updateActiveEntryFromScroll();
    fixture.detectChanges();

    setArticleTops(fixture, [-12, 80]);
    component.updateActiveEntryFromScroll();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Chapter 1');
  });

  it('shows the end marker only after the bottom load reaches the final saved entry', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;
    let nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).not.toContain('No more saved entries.');

    await component.loadNextEntry();
    await component.loadNextEntry();
    await component.loadNextEntry();
    fixture.detectChanges();
    nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelectorAll('.library-reader-article').length).toBe(3);
    expect(nativeElement.textContent).toContain('No more saved entries.');
  });

  it('keeps already rendered entries and exposes retry when the next saved entry cannot load', async () => {
    entriesById.delete('entry-2');
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.loadNextEntry();
    fixture.detectChanges();
    let nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelectorAll('.library-reader-article').length).toBe(1);
    expect(nativeElement.textContent).toContain('Could not load the next saved entry.');

    entriesById.set('entry-2', entryFixture('entry-2', 'Chapter 2', 'Recovered saved content.'));

    nativeElement.querySelector<HTMLIonButtonElement>('.library-reader-retry')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelectorAll('.library-reader-article').length).toBe(2);
    expect(nativeElement.textContent).toContain('Recovered saved content.');
  });

  it('keeps mock reader links inert', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const link = nativeElement.querySelector('.library-reader-body a');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    link?.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
  });

  it('ignores inert-link handling when the event target is not an element', () => {
    const event = new Event('click', { cancelable: true });
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    component.preventReaderLinkNavigation(event);

    expect(event.defaultPrevented).toBeFalse();
  });

  it('ignores inert-link handling when no link is clicked', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const paragraph = nativeElement.querySelector('.library-reader-body p');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    paragraph?.dispatchEvent(event);

    expect(event.defaultPrevented).toBeFalse();
  });

  it('keeps invalid published time text', async () => {
    entriesById.set('entry-1', {
      ...entryFixture('entry-1', 'Chapter 1', 'Saved reading content.'),
      publishedTime: 'unknown date',
    });
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as LibraryEntryReaderPageHarness
    ).ionViewWillEnter?.();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('time')?.textContent).toContain('unknown date');
  });

  it('renders source host when site name is unavailable and hides absent metadata', async () => {
    entriesById.set('entry-1', {
      ...entryFixture('entry-1', 'Chapter 1', 'Saved reading content.'),
      byline: null,
      siteName: null,
      publishedTime: null,
    });
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as LibraryEntryReaderPageHarness
    ).ionViewWillEnter?.();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.library-reader-source')?.textContent).toContain(
      'example.com',
    );
    expect(nativeElement.querySelector('.library-reader-meta')).toBeNull();
  });

  it('falls back to source URL when source labels are unavailable', async () => {
    entriesById.set('entry-1', {
      ...entryFixture('entry-1', 'Chapter 1', 'Saved reading content.'),
      siteName: null,
      sourceHost: null,
    });
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as LibraryEntryReaderPageHarness
    ).ionViewWillEnter?.();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.library-reader-source')?.textContent).toContain(
      'https://example.com/entry-1',
    );
  });

  it('does not append when no later saved entry is available', async () => {
    series = {
      id: 'series-1',
      title: 'The Clockwork Archive',
      entries: [
        {
          id: 'entry-1',
          seriesId: 'series-1',
          displayTitle: 'Chapter 1',
          sourceHost: 'example.com',
          createdAt: '2026-01-12T09:30:00.000Z',
          updatedAt: '2026-01-12T09:30:00.000Z',
        },
      ],
    };
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as LibraryEntryReaderPageHarness
    ).ionViewWillEnter?.();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.loadNextEntry();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelectorAll('.library-reader-article').length).toBe(1);
    expect(nativeElement.textContent).toContain('No more saved entries.');
  });

  it('completes the infinite-scroll event after loading the next saved entry', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;
    const event = { target: { complete: jasmine.createSpy('complete') } };

    await component.loadNextEntry(event);

    expect(event.target.complete).toHaveBeenCalledOnceWith();
  });

  it('keeps the infinite-scroll trigger enabled after appending an entry', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const firstScroll = infiniteScrollElement(fixture);
    spyOn(firstScroll, 'complete').and.resolveTo();

    firstScroll.dispatchEvent(new CustomEvent('ionInfinite', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    const secondScroll = infiniteScrollElement(fixture);

    expect(secondScroll.disabled).toBeFalse();

    secondScroll.dispatchEvent(new CustomEvent('ionInfinite', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelectorAll('.library-reader-article').length).toBe(3);
    expect(nativeElement.textContent).toContain('Final saved reading content.');
  });

  it('keeps the infinite-scroll trigger enabled while the next entry is loading', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    component.loadState.set('loading');
    fixture.detectChanges();

    expect(infiniteScrollElement(fixture).disabled).toBeFalse();
  });

  it('completes the infinite-scroll event without appending while already loading', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;
    const event = { target: { complete: jasmine.createSpy('complete') } };

    component.loadState.set('loading');

    await component.loadNextEntry(event);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(event.target.complete).toHaveBeenCalledOnceWith();
    expect(nativeElement.querySelectorAll('.library-reader-article').length).toBe(1);
  });

  it('ends bottom loading when Series order is unavailable', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    component.series.set(null);

    await component.loadNextEntry();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('No more saved entries.');
  });

  it('ends bottom loading when no entry has been loaded', async () => {
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    component.loadedEntries.set([]);

    await component.loadNextEntry();

    expect(component.loadState()).toBe('ended');
  });

  it('renders not-found content for unknown entries', async () => {
    entriesById.delete('entry-1');
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Entry not found');
    expect(nativeElement.textContent).toContain('This entry is not in the Library.');
  });

  it('keeps the not-found title when scroll events fire without rendered entries', async () => {
    entriesById.delete('entry-1');
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    component.updateActiveEntryFromScroll();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Entry not found');
  });

  it('renders not-found content when the Series is unknown', async () => {
    series = null;
    entriesById.clear();
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('This entry is not in the Library.');
  });

  it('renders not found when the route has no Series or entry id', async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [LibraryEntryReaderPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();

    const missingFixture = TestBed.createComponent(LibraryEntryReaderPage);
    missingFixture.detectChanges();
    await missingFixture.whenStable();
    missingFixture.detectChanges();

    const nativeElement = missingFixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('This entry is not in the Library.');
  });
});

function entryFixture(id: string, displayTitle: string, bodyText: string): LibrarySeriesEntry {
  return {
    id,
    seriesId: 'series-1',
    seriesTitle: 'The Clockwork Archive',
    displayTitle,
    sourceUrl: `https://example.com/${id}`,
    sourceHost: 'example.com',
    articleTitle: `The Clockwork Archive - ${displayTitle}`,
    byline: 'Mira Vale',
    siteName: 'Example Reads',
    publishedTime: '2026-01-12T00:00:00.000Z',
    originalContentHtml: `<p>${bodyText}</p><p><a href="https://example.com">Source</a></p>`,
    contentOverrideHtml: null,
    effectiveContentHtml: `<p>${bodyText}</p><p><a href="https://example.com">Source</a></p>`,
    hasContentOverride: false,
    createdAt: '2026-01-12T09:30:00.000Z',
    updatedAt: '2026-01-12T09:30:00.000Z',
  };
}

function infiniteScrollElement(
  fixture: ComponentFixture<LibraryEntryReaderPage>,
): HTMLIonInfiniteScrollElement {
  const nativeElement = fixture.nativeElement as HTMLElement;
  const infiniteScroll =
    nativeElement.querySelector<HTMLIonInfiniteScrollElement>('ion-infinite-scroll');
  if (infiniteScroll === null) {
    throw new Error('Expected the reader to render an infinite-scroll trigger.');
  }

  return infiniteScroll;
}

function setArticleTops(
  fixture: ComponentFixture<LibraryEntryReaderPage>,
  tops: readonly number[],
): void {
  const articles = articleElements(fixture);
  articles.forEach((article, index) => {
    const top = tops[index];
    if (top === undefined) {
      return;
    }

    Object.defineProperty(article, 'getBoundingClientRect', {
      configurable: true,
      value: () => rectAt(top),
    });
  });
}

function articleElements(
  fixture: ComponentFixture<LibraryEntryReaderPage>,
): readonly HTMLElement[] {
  const nativeElement = fixture.nativeElement as HTMLElement;
  return Array.from(nativeElement.querySelectorAll<HTMLElement>('.library-reader-article'));
}

function rectAt(top: number): DOMRect {
  return {
    bottom: top + 100,
    height: 100,
    left: 0,
    right: 100,
    toJSON: () => ({}),
    top,
    width: 100,
    x: 0,
    y: top,
  };
}
