import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries } from '../../../domain/library-series';
import { LibrarySeriesDetailPage } from './library-series-detail.page';

let routeSeriesId = 'series-1';
let getSeriesCalls: number;
let series: LibrarySeries | null = {
  id: 'series-1',
  title: 'The Clockwork Archive',
  entries: [
    {
      id: 'entry-1',
      seriesId: 'series-1',
      displayTitle: 'Chapter 1: The Brass Door',
      sourceHost: 'example.com',
      createdAt: '2026-01-12T09:30:00.000Z',
      updatedAt: '2026-01-12T09:30:00.000Z',
    },
  ],
};

class FakeLibraryFacade {
  public getSeries(seriesId: string): Promise<LibrarySeries | null> {
    getSeriesCalls += 1;
    return Promise.resolve(series !== null && seriesId === series.id ? series : null);
  }
}

interface RefreshableLibrarySeriesDetailPage {
  refreshSeries(event: CustomEvent): Promise<void>;
}

describe('LibrarySeriesDetailPage', () => {
  let fixture: ComponentFixture<LibrarySeriesDetailPage>;

  beforeEach(async () => {
    routeSeriesId = 'series-1';
    getSeriesCalls = 0;
    series = {
      id: 'series-1',
      title: 'The Clockwork Archive',
      entries: [
        {
          id: 'entry-1',
          seriesId: 'series-1',
          displayTitle: 'Chapter 1: The Brass Door',
          sourceHost: 'example.com',
          createdAt: '2026-01-12T09:30:00.000Z',
          updatedAt: '2026-01-12T09:30:00.000Z',
        },
      ],
    };

    await TestBed.configureTestingModule({
      imports: [LibrarySeriesDetailPage],
      providers: [
        provideRouter([]),
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ seriesId: routeSeriesId }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LibrarySeriesDetailPage);
    fixture.detectChanges();
  });

  it('renders the selected Series and its entries', async () => {
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain(
      'The Clockwork Archive',
    );
    expect(nativeElement.querySelector('ion-item')?.textContent).toContain('Chapter 1');
    expect(nativeElement.querySelector('ion-item')?.textContent).toContain('example.com');
  });

  it('renders entry summaries without source hosts and keeps invalid date text', async () => {
    series = {
      id: 'series-1',
      title: 'The Clockwork Archive',
      entries: [
        {
          id: 'entry-1',
          seriesId: 'series-1',
          displayTitle: 'Untitled saved entry',
          sourceHost: null,
          createdAt: 'unknown date',
          updatedAt: 'unknown date',
        },
      ],
    };
    fixture = TestBed.createComponent(LibrarySeriesDetailPage);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-item')?.textContent).toContain('Saved unknown date');
  });

  it('renders a not-found state for unknown Series', async () => {
    series = null;
    fixture = TestBed.createComponent(LibrarySeriesDetailPage);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent).toContain('Series not found');
    expect(nativeElement.textContent).toContain('This Series is not in the Library.');
  });

  it('renders an empty state for Series without entries', async () => {
    series = {
      id: 'series-1',
      title: 'The Clockwork Archive',
      entries: [],
    };
    fixture = TestBed.createComponent(LibrarySeriesDetailPage);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('No entries saved for this Series.');
  });

  it('renders not found when the route has no Series id', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LibrarySeriesDetailPage],
      providers: [
        provideRouter([]),
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

    const missingFixture = TestBed.createComponent(LibrarySeriesDetailPage);
    missingFixture.detectChanges();
    missingFixture.componentInstance.ionViewWillEnter();
    await missingFixture.whenStable();
    missingFixture.detectChanges();

    const nativeElement = missingFixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('This Series is not in the Library.');
  });

  it('reloads the Series when the page enters', async () => {
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();

    expect(getSeriesCalls).toBe(2);
  });

  it('reloads the Series and completes pull-to-refresh', async () => {
    let completed = false;
    const event = new CustomEvent('ionRefresh');
    Object.defineProperty(event, 'target', {
      value: {
        complete: () => {
          completed = true;
        },
      },
    });

    await (
      fixture.componentInstance as unknown as RefreshableLibrarySeriesDetailPage
    ).refreshSeries(event);

    expect(getSeriesCalls).toBe(1);
    expect(completed).toBe(true);
  });
});
