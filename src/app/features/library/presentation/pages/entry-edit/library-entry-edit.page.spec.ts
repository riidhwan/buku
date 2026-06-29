import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular/standalone';
import { EMPTY } from 'rxjs';
import {
  LIBRARY_CONTENT_SANITIZER,
  LibraryContentSanitizer,
  SanitizedLibraryContent,
} from '../../../application/ports/library-content-sanitizer.port';
import {
  ResetSeriesEntryContentOverrideInput,
  ResetSeriesEntryContentOverrideResult,
} from '../../../application/reset-series-entry-content-override.use-case';
import {
  SaveSeriesEntryContentOverrideInput,
  SaveSeriesEntryContentOverrideResult,
} from '../../../application/save-series-entry-content-override.use-case';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeriesEntry } from '../../../domain/library-series';
import { LibraryEntryEditPage } from './library-entry-edit.page';

let entry: LibrarySeriesEntry | null;
let savedInputs: SaveSeriesEntryContentOverrideInput[];
let resetInputs: ResetSeriesEntryContentOverrideInput[];
let saveResult: SaveSeriesEntryContentOverrideResult;
let resetResult: ResetSeriesEntryContentOverrideResult;
let navigateSpy: jasmine.Spy;
let alerts: FakeAlertController;
let platform: FakePlatform;

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

  public resetSeriesEntryContentOverride(
    input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideResult> {
    resetInputs.push(input);
    return Promise.resolve(resetResult);
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
    resetInputs = [];
    saveResult = { status: 'saved' };
    resetResult = { status: 'reset' };
    navigateSpy = jasmine.createSpy('navigate').and.resolveTo(true);
    alerts = new FakeAlertController();
    platform = new FakePlatform();

    await TestBed.configureTestingModule({
      imports: [LibraryEntryEditPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        { provide: Router, useValue: { events: EMPTY, navigate: navigateSpy } },
        { provide: AlertController, useValue: alerts },
        { provide: Platform, useValue: platform },
        { provide: LIBRARY_CONTENT_SANITIZER, useClass: FakeContentSanitizer },
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

  it('shows reset only for entries with overrides', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(resetButtonOrNull(fixture)).toBeNull();

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

    expect(resetButtonOrNull(fixture)).not.toBeNull();
  });

  it('resets an existing override after confirmation and returns to the reader', async () => {
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

    resetButton(fixture).click();
    await flushAlertPresentation();
    alerts.confirmLatest();
    await flushAlertPresentation();
    await fixture.whenStable();

    expect(resetInputs).toEqual([{ seriesId: 'series-1', entryId: 'entry-1' }]);
    expect(navigateSpy).toHaveBeenCalledOnceWith([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-1',
    ]);
  });

  it('leaves the draft unchanged when reset is cancelled', async () => {
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
    editorBody(fixture).innerHTML = '<p>Unsaved draft.</p>';

    resetButton(fixture).click();
    await flushAlertPresentation();
    alerts.dismissLatest();
    await fixture.whenStable();

    expect(resetInputs).toEqual([]);
    expect(editorBody(fixture).textContent).toContain('Unsaved draft.');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('shows typed reset failures without navigating', async () => {
    resetResult = { status: 'missingEntry' };
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

    resetButton(fixture).click();
    await flushAlertPresentation();
    alerts.confirmLatest();
    await flushAlertPresentation();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Could not reset this edit.',
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('asks before discarding changed sanitized content', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '<p>Changed content.</p>';

    cancelButton(fixture).click();
    await flushAlertPresentation();

    expect(alerts.latest?.header).toBe('Discard changes?');
    expect(navigateSpy).not.toHaveBeenCalled();

    alerts.confirmLatest();
    await flushAlertPresentation();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledOnceWith([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-1',
    ]);
  });

  it('keeps the editor open when discard is dismissed', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '<p>Changed content.</p>';

    backButton(fixture).click();
    await flushAlertPresentation();
    alerts.dismissLatest();
    await fixture.whenStable();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('uses the same discard behavior for Android back', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '<p>Changed content.</p>';

    const backPromise = platform.backButton.trigger();
    await flushAlertPresentation();

    expect(alerts.latest?.header).toBe('Discard changes?');
    expect(navigateSpy).not.toHaveBeenCalled();

    alerts.confirmLatest();
    await backPromise;
    await flushAlertPresentation();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledOnceWith([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-1',
    ]);
  });

  it('selects and deletes existing media from the draft', async () => {
    entry = entryFixture({
      originalContentHtml:
        '<p>Original content.</p><figure><img src="https://example.com/a.jpg"></figure>',
      contentOverrideHtml: null,
      effectiveContentHtml:
        '<p>Original content.</p><figure><img src="https://example.com/a.jpg"></figure>',
      hasContentOverride: false,
    });
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const figure = editorBody(fixture).querySelector('figure');
    if (figure === null) {
      throw new Error('Expected figure.');
    }

    figure.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(deleteMediaButtonOrNull(fixture)).not.toBeNull();
    expect(figure.classList.contains('library-entry-edit-media-selected')).toBeTrue();

    deleteMediaButton(fixture).click();
    fixture.detectChanges();

    expect(editorBody(fixture).querySelector('figure')).toBeNull();
    expect(deleteMediaButtonOrNull(fixture)).toBeNull();
  });

  it('saves media deletion without the selected media element', async () => {
    entry = entryFixture({
      originalContentHtml: '<p>Original content.</p><img src="https://example.com/a.jpg">',
      contentOverrideHtml: null,
      effectiveContentHtml: '<p>Original content.</p><img src="https://example.com/a.jpg">',
      hasContentOverride: false,
    });
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const image = editorBody(fixture).querySelector('img');
    if (image === null) {
      throw new Error('Expected image.');
    }

    image.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    deleteMediaButton(fixture).click();
    saveButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs[0]?.contentHtml).toBe('<p>Original content.</p>');
  });

  it('clears selected media when non-media content is tapped', async () => {
    entry = entryFixture({
      originalContentHtml: '<p>Original content.</p><img src="https://example.com/a.jpg">',
      contentOverrideHtml: null,
      effectiveContentHtml: '<p>Original content.</p><img src="https://example.com/a.jpg">',
      hasContentOverride: false,
    });
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const body = editorBody(fixture);
    const image = body.querySelector('img');
    const paragraph = body.querySelector('p');
    if (image === null || paragraph === null) {
      throw new Error('Expected image and paragraph.');
    }

    image.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    paragraph.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(image.classList.contains('library-entry-edit-media-selected')).toBeFalse();
    expect(deleteMediaButtonOrNull(fixture)).toBeNull();
  });

  it('does not persist the temporary media selected state when saving', async () => {
    entry = entryFixture({
      originalContentHtml: '<p>Original content.</p><img src="https://example.com/a.jpg">',
      contentOverrideHtml: null,
      effectiveContentHtml: '<p>Original content.</p><img src="https://example.com/a.jpg">',
      hasContentOverride: false,
    });
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const image = editorBody(fixture).querySelector('img');
    if (image === null) {
      throw new Error('Expected image.');
    }

    image.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    saveButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs[0]?.contentHtml).toBe(
      '<p>Original content.</p><img src="https://example.com/a.jpg">',
    );
  });

  it('ignores media selection events without an editor target', async () => {
    entry = null;
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as LibraryEntryEditPageHarness;

    component.selectMedia(new Event('click'));
    component.selectMedia(eventWithTarget(document.createElement('img')));
    fixture.detectChanges();

    expect(deleteMediaButtonOrNull(fixture)).toBeNull();
  });

  it('unsubscribes from Android back when destroyed', () => {
    fixture.destroy();

    expect(platform.backButton.unsubscribed).toBeTrue();
  });

  it('renders not found when the route has no Series or entry id', async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [LibraryEntryEditPage],
      providers: [
        { provide: LibraryFacade, useClass: FakeLibraryFacade },
        { provide: Router, useValue: { events: EMPTY, navigate: navigateSpy } },
        { provide: AlertController, useValue: alerts },
        { provide: Platform, useValue: platform },
        { provide: LIBRARY_CONTENT_SANITIZER, useClass: FakeContentSanitizer },
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
  selectMedia(event: Event): void;
}

class FakeContentSanitizer implements LibraryContentSanitizer {
  public sanitizeContentHtml(contentHtml: string): SanitizedLibraryContent {
    return {
      contentHtml: contentHtml
        .replace(/ class="library-entry-edit-media-selected"/g, '')
        .replace(/ onclick="bad\(\)"/g, '')
        .trim(),
      hasRenderableContent: contentHtml.trim() !== '',
    };
  }
}

interface FakeAlertButton {
  readonly role?: string;
  readonly handler?: () => void;
}

interface FakeAlertOptions {
  readonly header?: string;
  readonly buttons?: readonly FakeAlertButton[];
}

class FakeAlert {
  private dismiss: (() => void) | null = null;
  private dismissed = false;

  public constructor(private readonly options: FakeAlertOptions) {}

  public get header(): string | undefined {
    return this.options.header;
  }

  public present(): Promise<void> {
    return Promise.resolve();
  }

  public onDidDismiss(): Promise<void> {
    if (this.dismissed) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.dismiss = resolve;
    });
  }

  public confirm(): void {
    this.options.buttons?.find((button) => button.role === 'destructive')?.handler?.();
    this.resolveDismissal();
  }

  public cancel(): void {
    this.resolveDismissal();
  }

  private resolveDismissal(): void {
    this.dismissed = true;
    this.dismiss?.();
    this.dismiss = null;
  }
}

class FakeAlertController {
  public latest: FakeAlert | null = null;

  public create(options: FakeAlertOptions): Promise<FakeAlert> {
    this.latest = new FakeAlert(options);
    return Promise.resolve(this.latest);
  }

  public confirmLatest(): void {
    this.latest?.confirm();
  }

  public dismissLatest(): void {
    this.latest?.cancel();
  }
}

type BackButtonCallback = (processNextHandler: () => void) => void | Promise<void>;

class FakeBackButton {
  private callback: BackButtonCallback | null = null;
  public priority: number | null = null;
  public unsubscribed = false;

  public subscribeWithPriority(priority: number, callback: BackButtonCallback) {
    this.priority = priority;
    this.callback = callback;
    return {
      unsubscribe: () => {
        this.unsubscribed = true;
      },
    };
  }

  public async trigger(): Promise<void> {
    await this.callback?.(() => undefined);
  }
}

class FakePlatform {
  public readonly backButton = new FakeBackButton();
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

async function flushAlertPresentation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function eventWithTarget(target: EventTarget): Event {
  const event = new Event('click');
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

function saveButton(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLIonButtonElement {
  return toolbarButton(fixture, '.library-entry-edit-save');
}

function cancelButton(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLIonButtonElement {
  return toolbarButton(fixture, '.library-entry-edit-cancel');
}

function backButton(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLIonButtonElement {
  return toolbarButton(fixture, '.library-entry-edit-back');
}

function resetButton(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLIonButtonElement {
  return toolbarButton(fixture, '.library-entry-edit-reset');
}

function resetButtonOrNull(
  fixture: ComponentFixture<LibraryEntryEditPage>,
): HTMLIonButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLIonButtonElement>(
    '.library-entry-edit-reset',
  );
}

function deleteMediaButton(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLIonButtonElement {
  return toolbarButton(fixture, '.library-entry-edit-delete-media');
}

function deleteMediaButtonOrNull(
  fixture: ComponentFixture<LibraryEntryEditPage>,
): HTMLIonButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLIonButtonElement>(
    '.library-entry-edit-delete-media',
  );
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
