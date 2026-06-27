import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LibrarySeriesSummary } from '../../domain/library-series';
import { LibraryFacade } from '../../application/library.facade';
import { LibraryPage } from './library.page';

let seriesSummaries: readonly LibrarySeriesSummary[];

class FakeLibraryFacade {
  public listSeries(): readonly LibrarySeriesSummary[] {
    return seriesSummaries;
  }
}

describe('LibraryPage', () => {
  let fixture: ComponentFixture<LibraryPage>;

  beforeEach(async () => {
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

  it('renders Series summaries', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const item = nativeElement.querySelector('ion-item');

    expect(item?.textContent).toContain('The Clockwork Archive');
    expect(item?.textContent).toContain('2 entries');
  });

  it('renders singular entry counts and falls back to invalid date text', () => {
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

    const nativeElement = fixture.nativeElement as HTMLElement;
    const item = nativeElement.querySelector('ion-item');

    expect(item?.textContent).toContain('1 entry');
    expect(item?.textContent).toContain('unknown date');
  });
});
