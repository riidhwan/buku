import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { EMPTY } from 'rxjs';
import {
  SaveSeriesEntryContentOverrideInput,
  SaveSeriesEntryContentOverrideResult,
} from '../../../application/save-series-entry-content-override.use-case';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeriesEntry } from '../../../domain/library-series';
import { LibraryEntryEditPage } from './library-entry-edit.page';

let entry: LibrarySeriesEntry | null;
let savedInputs: SaveSeriesEntryContentOverrideInput[];
let saveResult: SaveSeriesEntryContentOverrideResult;
let navigateSpy: jasmine.Spy;

class FakeLibraryFacade {
  public getEntry(seriesId: string, entryId: string): Promise<LibrarySeriesEntry | null> {
    return Promise.resolve(
      entry !== null && entry.seriesId === seriesId && entry.id === entryId ? entry : null,
    );
  }

  public saveSeriesEntryContentOverride(
    input: SaveSeriesEntryContentOverrideInput,
  ): Promise<SaveSeriesEntryContentOverrideResult> {
    savedInputs.push(input);
    return Promise.resolve(saveResult);
  }
}

describe('LibraryEntryEditPage', () => {
  let fixture: ComponentFixture<LibraryEntryEditPage>;

  beforeEach(async () => {
    entry = entryFixture({
      originalContentHtml: '<p>Original content.</p>',
      contentOverrideHtml: null,
      effectiveContentHtml: '<p>Original content.</p>',
      hasContentOverride: false,
    });
    savedInputs = [];
    saveResult = { status: 'saved' };
    navigateSpy = jasmine.createSpy('navigate').and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LibraryEntryEditPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        { provide: Router, useValue: { events: EMPTY, navigate: navigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ seriesId: 'series-1', entryId: 'entry-1' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
  });

  it('loads effective content into the editable body', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(editorBody(fixture).textContent).toContain('Original content.');
  });

  it('starts from the existing override when re-editing an overridden entry', async () => {
    entry = entryFixture({
      originalContentHtml: '<p>Original content.</p>',
      contentOverrideHtml: '<p>Existing edit.</p>',
      effectiveContentHtml: '<p>Existing edit.</p>',
      hasContentOverride: true,
    });
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(editorBody(fixture).textContent).toContain('Existing edit.');
  });

  it('saves edited HTML and returns to the entry reader', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '<p>Edited content.</p>';

    saveButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs).toEqual([
      {
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<p>Edited content.</p>',
      },
    ]);
    expect(navigateSpy).toHaveBeenCalledOnceWith([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-1',
    ]);
  });

  it('shows validation failures without navigating', async () => {
    saveResult = { status: 'validationFailed', message: 'Edited content must not be empty.' };
    await fixture.whenStable();
    fixture.detectChanges();

    saveButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Edited content must not be empty.',
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('saves an empty fallback when editable content is unavailable', async () => {
    entry = null;
    saveResult = { status: 'persistenceFailed' };
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as LibraryEntryEditPageHarness;

    await component.save();
    fixture.detectChanges();

    expect(savedInputs).toEqual([
      {
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '',
      },
    ]);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('shows generic save failures without navigating', async () => {
    saveResult = { status: 'missingEntry' };
    await fixture.whenStable();
    fixture.detectChanges();

    saveButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Could not save this edit.',
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('cancels without saving', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    cancelButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs).toEqual([]);
    expect(navigateSpy).toHaveBeenCalledOnceWith([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-1',
    ]);
  });

  it('renders not found when the route has no Series or entry id', async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [LibraryEntryEditPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        { provide: Router, useValue: { events: EMPTY, navigate: navigateSpy } },
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

    const missingFixture = TestBed.createComponent(LibraryEntryEditPage);
    missingFixture.detectChanges();
    await missingFixture.whenStable();
    missingFixture.detectChanges();

    expect((missingFixture.nativeElement as HTMLElement).textContent).toContain(
      'This entry is not in the Library.',
    );
  });
});

interface LibraryEntryEditPageHarness {
  save(): Promise<void>;
}

function entryFixture(
  content: Pick<
    LibrarySeriesEntry,
    'originalContentHtml' | 'contentOverrideHtml' | 'effectiveContentHtml' | 'hasContentOverride'
  >,
): LibrarySeriesEntry {
  return {
    id: 'entry-1',
    seriesId: 'series-1',
    seriesTitle: 'Series',
    displayTitle: 'Chapter 1',
    sourceUrl: 'https://example.com/chapter-1',
    sourceHost: 'example.com',
    articleTitle: 'Chapter 1',
    byline: null,
    siteName: null,
    publishedTime: null,
    ...content,
    createdAt: '2026-06-27T10:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
  };
}

function editorBody(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    '.library-entry-edit-body',
  );
  if (element === null) {
    throw new Error('Expected editable body.');
  }

  return element;
}

function saveButton(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLIonButtonElement {
  return toolbarButton(fixture, '.library-entry-edit-save');
}

function cancelButton(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLIonButtonElement {
  return toolbarButton(fixture, '.library-entry-edit-cancel');
}

function toolbarButton(
  fixture: ComponentFixture<LibraryEntryEditPage>,
  selector: string,
): HTMLIonButtonElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLIonButtonElement>(
    selector,
  );
  if (element === null) {
    throw new Error(`Expected ${selector} button.`);
  }

  return element;
}
