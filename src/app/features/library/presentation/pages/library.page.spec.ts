import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LibrarySeriesSummary } from '../../domain/library-series';
import { LibraryFacade } from '../../application/library.facade';
import { LibraryPage } from './library.page';

let seriesSummaries: readonly LibrarySeriesSummary[];
let listSeriesCalls: number;

class FakeLibraryFacade {
  public listSeries(): Promise<readonly LibrarySeriesSummary[]> {
    listSeriesCalls += 1;
    return Promise.resolve(seriesSummaries);
  }
}

interface RefreshableLibraryPage {
  refreshSeries(event: CustomEvent): Promise<void>;
}

describe('LibraryPage', () => {
  let fixture: ComponentFixture<LibraryPage>;

  beforeEach(async () => {
    listSeriesCalls = 0;
    seriesSummaries = [
      {
        id: 'series-1',
        title: 'The Clockwork Archive',
        entryCount: 2,
        lastSavedAt: '2026-01-19T10:15:00.000Z',
      },
    ];

    await TestBed.configureTestingModule({
      imports: [LibraryPage],
      providers: [provideRouter([]), { provide: LibraryFacade, useClass: FakeLibraryFacade }],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryPage);
    fixture.detectChanges();
  });

  it('renders the page title', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const title = nativeElement.querySelector('ion-title')?.textContent.trim();

    expect(title).toBe('Library');
  });

  it('renders Series summaries', async () => {
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const item = nativeElement.querySelector('ion-item');

    expect(item?.textContent).toContain('The Clockwork Archive');
    expect(item?.textContent).toContain('2 entries');
  });

  it('renders singular entry counts and falls back to invalid date text', async () => {
    seriesSummaries = [
      {
        id: 'series-2',
        title: 'Single Entry Series',
        entryCount: 1,
        lastSavedAt: 'unknown date',
      },
    ];
    fixture = TestBed.createComponent(LibraryPage);
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const item = nativeElement.querySelector('ion-item');

    expect(item?.textContent).toContain('1 entry');
    expect(item?.textContent).toContain('unknown date');
  });

  it('reloads Series when the page enters', async () => {
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();

    expect(listSeriesCalls).toBe(2);
  });

  it('reloads Series and completes pull-to-refresh', async () => {
    let completed = false;
    const event = new CustomEvent('ionRefresh');
    Object.defineProperty(event, 'target', {
      value: {
        complete: () => {
          completed = true;
        },
      },
    });

    await (fixture.componentInstance as unknown as RefreshableLibraryPage).refreshSeries(event);

    expect(listSeriesCalls).toBe(1);
    expect(completed).toBe(true);
  });
});
