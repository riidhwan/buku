import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { EMPTY } from 'rxjs';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries, LibrarySeriesEntry } from '../../../domain/library-series';
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

let entry: LibrarySeriesEntry | null = {
  id: 'entry-1',
  seriesId: 'series-1',
  seriesTitle: 'The Clockwork Archive',
  displayTitle: 'Chapter 1',
  sourceUrl: 'https://example.com/chapter-1',
  sourceHost: 'example.com',
  articleTitle: 'The Clockwork Archive - Chapter 1',
  byline: 'Mira Vale',
  siteName: 'Example Reads',
  publishedTime: '2026-01-12T00:00:00.000Z',
  contentHtml: '<p>Saved reading content.</p><p><a href="https://example.com">Source</a></p>',
  createdAt: '2026-01-12T09:30:00.000Z',
  updatedAt: '2026-01-12T09:30:00.000Z',
};

class FakeLibraryFacade {
  public getSeries(seriesId: string): LibrarySeries | null {
    return series !== null && seriesId === series.id ? series : null;
  }

  public getEntry(seriesId: string, entryId: string): LibrarySeriesEntry | null {
    return series !== null && entry !== null && seriesId === series.id && entryId === entry.id
      ? entry
      : null;
  }
}

interface LibraryEntryReaderPageHarness {
  navigateToEntry(entryId: string | null): Promise<void>;
  preventReaderLinkNavigation(event: Event): void;
}

describe('LibraryEntryReaderPage', () => {
  let fixture: ComponentFixture<LibraryEntryReaderPage>;
  let router: jasmine.SpyObj<Router>;

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
      ],
    };
    entry = {
      id: 'entry-1',
      seriesId: 'series-1',
      seriesTitle: 'The Clockwork Archive',
      displayTitle: 'Chapter 1',
      sourceUrl: 'https://example.com/chapter-1',
      sourceHost: 'example.com',
      articleTitle: 'The Clockwork Archive - Chapter 1',
      byline: 'Mira Vale',
      siteName: 'Example Reads',
      publishedTime: '2026-01-12T00:00:00.000Z',
      contentHtml: '<p>Saved reading content.</p><p><a href="https://example.com">Source</a></p>',
      createdAt: '2026-01-12T09:30:00.000Z',
      updatedAt: '2026-01-12T09:30:00.000Z',
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigate'], { events: EMPTY });
    router.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LibraryEntryReaderPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        { provide: Router, useValue: router },
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

  it('renders saved entry content', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Chapter 1');
    expect(nativeElement.querySelector('.library-reader-header')?.textContent).toContain(
      'The Clockwork Archive - Chapter 1',
    );
    expect(nativeElement.querySelector('.library-reader-body')?.textContent).toContain(
      'Saved reading content.',
    );
  });

  it('navigates only among saved entries in the Series', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const nextButton = nativeElement.querySelector<HTMLElement>(
      'ion-buttons[slot="end"] ion-button[aria-label="Next saved entry"]',
    );
    expect(nextButton).not.toBeNull();
    if (nextButton === null) {
      fail('Expected the next saved entry button to render.');
      return;
    }

    nextButton.click();
    await fixture.whenStable();

    expect(router.navigate.calls.mostRecent().args[0]).toEqual([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-2',
    ]);
  });

  it('keeps mock reader links inert', () => {
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

  it('ignores inert-link handling when no link is clicked', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const paragraph = nativeElement.querySelector('.library-reader-body p');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    paragraph?.dispatchEvent(event);

    expect(event.defaultPrevented).toBeFalse();
  });

  it('keeps invalid published time text', () => {
    if (entry === null) {
      fail('Expected the entry fixture to be present.');
      return;
    }
    entry = { ...entry, publishedTime: 'unknown date' };
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('time')?.textContent).toContain('unknown date');
  });

  it('renders source host when site name is unavailable and hides absent metadata', () => {
    if (entry === null) {
      fail('Expected the entry fixture to be present.');
      return;
    }
    entry = {
      ...entry,
      byline: null,
      siteName: null,
      publishedTime: null,
    };
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.library-reader-source')?.textContent).toContain(
      'example.com',
    );
    expect(nativeElement.querySelector('.library-reader-meta')).toBeNull();
  });

  it('falls back to source URL when source labels are unavailable', () => {
    if (entry === null) {
      fail('Expected the entry fixture to be present.');
      return;
    }
    entry = {
      ...entry,
      siteName: null,
      sourceHost: null,
    };
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.library-reader-source')?.textContent).toContain(
      'https://example.com/chapter-1',
    );
  });

  it('does not navigate when adjacent entry is unavailable', async () => {
    const component = fixture.componentInstance as unknown as LibraryEntryReaderPageHarness;

    await component.navigateToEntry(null);

    expect(router.navigate.calls.count()).toBe(0);
  });

  it('renders not-found content for unknown entries', () => {
    entry = null;
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Entry not found');
    expect(nativeElement.textContent).toContain('This entry is not in the Library.');
  });

  it('renders not-found content when the Series is unknown', () => {
    series = null;
    entry = null;
    fixture = TestBed.createComponent(LibraryEntryReaderPage);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('This entry is not in the Library.');
  });

  it('renders not found when the route has no Series or entry id', async () => {
    TestBed.resetTestingModule();
    router = jasmine.createSpyObj<Router>('Router', ['navigate'], { events: EMPTY });
    router.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LibraryEntryReaderPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        { provide: Router, useValue: router },
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

    const nativeElement = missingFixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('This entry is not in the Library.');
  });
});
