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
import {
  SaveSeriesEntryHeaderVisibilityInput,
  SaveSeriesEntryHeaderVisibilityResult,
} from '../../../application/save-series-entry-header-visibility.use-case';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeriesEntry } from '../../../domain/library-series';
import { LibraryEntryEditPage } from './library-entry-edit.page';

let entry: LibrarySeriesEntry | null;
let savedInputs: SaveSeriesEntryContentOverrideInput[];
let savedHeaderVisibilityInputs: SaveSeriesEntryHeaderVisibilityInput[];
let resetInputs: ResetSeriesEntryContentOverrideInput[];
let saveResult: SaveSeriesEntryContentOverrideResult;
let saveHeaderVisibilityResult: SaveSeriesEntryHeaderVisibilityResult;
let resetResult: ResetSeriesEntryContentOverrideResult;
let deferredSave: Deferred<SaveSeriesEntryContentOverrideResult> | null;
let deferredReset: Deferred<ResetSeriesEntryContentOverrideResult> | null;
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
    if (deferredSave !== null) {
      return deferredSave.promise;
    }

    return Promise.resolve(saveResult);
  }

  public saveSeriesEntryHeaderVisibility(
    input: SaveSeriesEntryHeaderVisibilityInput,
  ): Promise<SaveSeriesEntryHeaderVisibilityResult> {
    savedHeaderVisibilityInputs.push(input);
    return Promise.resolve(saveHeaderVisibilityResult);
  }

  public resetSeriesEntryContentOverride(
    input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideResult> {
    resetInputs.push(input);
    if (deferredReset !== null) {
      return deferredReset.promise;
    }

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
    savedHeaderVisibilityInputs = [];
    resetInputs = [];
    saveResult = { status: 'saved' };
    saveHeaderVisibilityResult = { status: 'saved' };
    resetResult = { status: 'reset' };
    deferredSave = null;
    deferredReset = null;
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

  it('renders the formatting toolbar only when an entry is loaded', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(formatToolbarOrNull(fixture)).not.toBeNull();

    entry = null;
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(formatToolbarOrNull(fixture)).toBeNull();
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
    expect(savedHeaderVisibilityInputs).toEqual([]);
    expect(navigateSpy).toHaveBeenCalledOnceWith([
      '/library',
      'series',
      'series-1',
      'entries',
      'entry-1',
    ]);
  });

  it('saves header visibility without creating a content override', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    headerVisibilityToggle(fixture).dispatchEvent(
      new CustomEvent('ionChange', { detail: { checked: false } }),
    );
    fixture.detectChanges();
    saveButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs).toEqual([]);
    expect(savedHeaderVisibilityInputs).toEqual([
      {
        seriesId: 'series-1',
        entryId: 'entry-1',
        headerVisible: false,
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

  it('persists formatted HTML through the existing save path', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '<h2>Heading</h2><p><strong>Edited</strong> content.</p>';

    saveButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs[0]?.contentHtml).toBe(
      '<h2>Heading</h2><p><strong>Edited</strong> content.</p>',
    );
  });

  it('runs bold and italic commands against the editor selection', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    selectEditorText(editorBody(fixture));
    const execCommand = spyOn(document, 'execCommand').and.returnValue(true);

    formatButton(fixture, '.library-entry-edit-format-bold').click();
    formatButton(fixture, '.library-entry-edit-format-italic').click();

    expect(execCommand.calls.allArgs()).toEqual([['bold'], ['italic']]);
  });

  it('preserves the editor selection when the formatting toolbar is pressed', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });

    formatToolbar(fixture).dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
  });

  it('ignores formatting commands while the editor is disabled', async () => {
    deferredSave = new Deferred<SaveSeriesEntryContentOverrideResult>();
    await fixture.whenStable();
    fixture.detectChanges();
    const execCommand = spyOn(document, 'execCommand').and.returnValue(true);
    editorBody(fixture).innerHTML = '<p>Saving content.</p>';

    saveButton(fixture).click();
    fixture.detectChanges();
    formatButton(fixture, '.library-entry-edit-format-bold').click();

    expect(execCommand).not.toHaveBeenCalled();

    deferredSave.resolve({ status: 'saved' });
    await fixture.whenStable();
  });

  it('changes the current block style', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    selectEditorText(editorBody(fixture));
    const execCommand = spyOn(document, 'execCommand').and.returnValue(true);

    blockFormatButton(fixture, 'h2').click();
    fixture.detectChanges();

    expect(execCommand).toHaveBeenCalledOnceWith('formatBlock', false, 'h2');
  });

  it('ignores disabled block style changes', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const execCommand = spyOn(document, 'execCommand').and.returnValue(true);

    deferredSave = new Deferred<SaveSeriesEntryContentOverrideResult>();
    editorBody(fixture).innerHTML = '<p>Saving content.</p>';
    saveButton(fixture).click();
    fixture.detectChanges();
    blockFormatButton(fixture, 'h3').click();

    expect(execCommand).not.toHaveBeenCalled();

    deferredSave.resolve({ status: 'saved' });
    await fixture.whenStable();
  });

  it('runs undo and redo history commands', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    selectEditorText(editorBody(fixture));
    const execCommand = spyOn(document, 'execCommand').and.returnValue(true);

    formatButton(fixture, '.library-entry-edit-format-undo').click();
    formatButton(fixture, '.library-entry-edit-format-redo').click();

    expect(execCommand.calls.allArgs()).toEqual([['undo'], ['redo']]);
  });

  it('marks the active block style from the editor selection', async () => {
    entry = entryFixture({
      originalContentHtml: '<ol><li><h3>Selected heading</h3></li></ol>',
      contentOverrideHtml: null,
      effectiveContentHtml: '<ol><li><h3>Selected heading</h3></li></ol>',
      hasContentOverride: false,
    });
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const heading = editorBody(fixture).querySelector('h3');
    if (heading === null) {
      throw new Error('Expected heading.');
    }

    selectEditorText(heading);
    heading.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    fixture.detectChanges();

    expect(
      blockFormatButton(fixture, 'h3').classList.contains('library-entry-edit-format-active'),
    ).toBeTrue();
  });

  it('refreshes formatting state when the document selection changes', async () => {
    entry = entryFixture({
      originalContentHtml: '<h2>Selected heading</h2>',
      contentOverrideHtml: null,
      effectiveContentHtml: '<h2>Selected heading</h2>',
      hasContentOverride: false,
    });
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const heading = editorBody(fixture).querySelector('h2');
    if (heading === null) {
      throw new Error('Expected heading.');
    }

    selectEditorText(heading);
    document.dispatchEvent(new Event('selectionchange'));
    fixture.detectChanges();

    expect(
      blockFormatButton(fixture, 'h2').classList.contains('library-entry-edit-format-active'),
    ).toBeTrue();
  });

  it('disables formatting controls while saving', async () => {
    deferredSave = new Deferred<SaveSeriesEntryContentOverrideResult>();
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '<p>Saving content.</p>';

    saveButton(fixture).click();
    fixture.detectChanges();

    expect(formatButton(fixture, '.library-entry-edit-format-bold').disabled).toBeTrue();
    expect(blockFormatButton(fixture, 'p').disabled).toBeTrue();
    expect(blockFormatButton(fixture, 'h2').disabled).toBeTrue();
    expect(blockFormatButton(fixture, 'h3').disabled).toBeTrue();

    deferredSave.resolve({ status: 'saved' });
    await fixture.whenStable();
  });

  it('disables formatting controls while resetting', async () => {
    deferredReset = new Deferred<ResetSeriesEntryContentOverrideResult>();
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
    fixture.detectChanges();

    expect(formatButton(fixture, '.library-entry-edit-format-bold').disabled).toBeTrue();
    expect(blockFormatButton(fixture, 'p').disabled).toBeTrue();
    expect(blockFormatButton(fixture, 'h2').disabled).toBeTrue();
    expect(blockFormatButton(fixture, 'h3').disabled).toBeTrue();

    deferredReset.resolve({ status: 'reset' });
    await fixture.whenStable();
  });

  it('shows validation failures without navigating', async () => {
    saveResult = { status: 'validationFailed', message: 'Edited content must not be empty.' };
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '';

    saveButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Edited content must not be empty.',
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not create an empty content override when editable content is unavailable', async () => {
    entry = null;
    fixture = TestBed.createComponent(LibraryEntryEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as LibraryEntryEditPageHarness;

    await component.save();
    fixture.detectChanges();

    expect(savedInputs).toEqual([]);
    expect(savedHeaderVisibilityInputs).toEqual([]);
  });

  it('shows generic save failures without navigating', async () => {
    saveResult = { status: 'missingEntry' };
    await fixture.whenStable();
    fixture.detectChanges();
    editorBody(fixture).innerHTML = '<p>Changed content.</p>';

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

  it('asks before discarding changed header visibility', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    headerVisibilityToggle(fixture).dispatchEvent(
      new CustomEvent('ionChange', { detail: { checked: false } }),
    );
    fixture.detectChanges();
    cancelButton(fixture).click();
    await flushAlertPresentation();

    expect(alerts.latest?.header).toBe('Discard changes?');
    expect(navigateSpy).not.toHaveBeenCalled();

    alerts.confirmLatest();
    await flushAlertPresentation();
    await fixture.whenStable();

    expect(savedHeaderVisibilityInputs).toEqual([]);
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
    editorBody(fixture).insertAdjacentHTML('beforeend', '<p>Changed content.</p>');
    saveButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs[0]?.contentHtml).toBe(
      '<p>Original content.</p><img src="https://example.com/a.jpg"><p>Changed content.</p>',
    );
  });

  it('keeps selected media deletion independent from formatting controls', async () => {
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
    spyOn(document, 'execCommand').and.returnValue(true);
    formatButton(fixture, '.library-entry-edit-format-bold').click();
    fixture.detectChanges();
    deleteMediaButton(fixture).click();
    saveButton(fixture).click();
    await fixture.whenStable();

    expect(savedInputs[0]?.contentHtml).toBe('<p>Original content.</p>');
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

class Deferred<T> {
  public readonly promise: Promise<T>;
  private resolvePromise: ((value: T) => void) | null = null;

  public constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  public resolve(value: T): void {
    this.resolvePromise?.(value);
  }
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
    headerVisible: true,
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

function selectEditorText(element: Element): void {
  const selection = document.getSelection();
  if (selection === null) {
    throw new Error('Expected document selection.');
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
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

function headerVisibilityToggle(
  fixture: ComponentFixture<LibraryEntryEditPage>,
): HTMLIonToggleElement {
  const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLIonToggleElement>(
    '.library-entry-edit-header-visibility ion-toggle',
  );
  if (toggle === null) {
    throw new Error('Expected header visibility toggle.');
  }

  return toggle;
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

function formatToolbarOrNull(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    '.library-entry-edit-formatting',
  );
}

function formatToolbar(fixture: ComponentFixture<LibraryEntryEditPage>): HTMLElement {
  const element = formatToolbarOrNull(fixture);
  if (element === null) {
    throw new Error('Expected formatting toolbar.');
  }

  return element;
}

function formatButton(
  fixture: ComponentFixture<LibraryEntryEditPage>,
  selector: string,
): HTMLIonButtonElement {
  return toolbarButton(fixture, selector);
}

function blockFormatButton(
  fixture: ComponentFixture<LibraryEntryEditPage>,
  format: 'p' | 'h2' | 'h3',
): HTMLIonButtonElement {
  const selectors = {
    h2: '.library-entry-edit-format-heading-2',
    h3: '.library-entry-edit-format-heading-3',
    p: '.library-entry-edit-format-paragraph',
  } as const;
  return toolbarButton(fixture, selectors[format]);
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
