import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { LibraryFacade } from '../../../application/library.facade';
import {
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
import { LibrarySeriesEntry } from '../../../domain/library-series';
import { LibraryEntryEditWorkflow } from './library-entry-edit-workflow';

describe('LibraryEntryEditWorkflow', () => {
  let library: FakeLibraryFacade;
  let router: FakeRouter;
  let alertController: FakeAlertController;
  let workflow: LibraryEntryEditWorkflow;

  beforeEach(() => {
    library = new FakeLibraryFacade();
    router = new FakeRouter();
    alertController = new FakeAlertController();
    workflow = createWorkflow({ library, router, alertController });
  });

  it('loads the effective entry content as the draft baseline', async () => {
    await workflow.loadEntry();

    expect(workflow.entry()).toEqual(library.entry);
    expect(workflow.draftHtml()).toBe('<p>Original content.</p>');
    expect(workflow.draftHeaderVisible()).toBeTrue();
  });

  it('saves edited content and navigates back to the reader', async () => {
    await workflow.loadEntry();

    const saved = await workflow.save('<p>Edited content.</p>', true);

    expect(saved).toBeTrue();
    expect(library.savedInputs).toEqual([
      {
        seriesId: 'series-1',
        entryId: 'entry-1',
        contentHtml: '<p>Edited content.</p>',
      },
    ]);
    expect(router.navigateCalls).toEqual([
      ['/library', 'series', 'series-1', 'entries', 'entry-1'],
    ]);
  });

  it('saves changed header visibility without creating a content override', async () => {
    await workflow.loadEntry();

    const saved = await workflow.save('<p>Original content.</p>', false);

    expect(saved).toBeTrue();
    expect(library.savedInputs).toEqual([]);
    expect(library.savedHeaderVisibilityInputs).toEqual([
      {
        seriesId: 'series-1',
        entryId: 'entry-1',
        headerVisible: false,
      },
    ]);
    expect(router.navigateCalls).toEqual([
      ['/library', 'series', 'series-1', 'entries', 'entry-1'],
    ]);
  });

  it('keeps header visibility save failures in workflow state', async () => {
    await workflow.loadEntry();
    library.saveHeaderVisibilityResult = { status: 'missingEntry' };

    const saved = await workflow.save('<p>Original content.</p>', false);

    expect(saved).toBeFalse();
    expect(workflow.saveState()).toBe('failed');
    expect(workflow.validationMessage()).toBe('Could not save this edit.');
    expect(router.navigateCalls).toEqual([]);
  });

  it('keeps validation failures in workflow state', async () => {
    await workflow.loadEntry();
    library.saveResult = {
      status: 'validationFailed',
      message: 'Edited content must not be empty.',
    };

    const saved = await workflow.save('', true);

    expect(saved).toBeFalse();
    expect(workflow.saveState()).toBe('failed');
    expect(workflow.validationMessage()).toBe('Edited content must not be empty.');
    expect(router.navigateCalls).toEqual([]);
  });

  it('resets an existing override after destructive confirmation', async () => {
    const resetPromise = workflow.resetToOriginal();
    await flushAlertPresentation();

    expect(alertController.latest?.header).toBe('Reset to original?');
    alertController.confirmLatest();

    expect(await resetPromise).toBeTrue();
    expect(library.resetInputs).toEqual([{ seriesId: 'series-1', entryId: 'entry-1' }]);
    expect(library.savedHeaderVisibilityInputs).toEqual([]);
    expect(router.navigateCalls).toEqual([
      ['/library', 'series', 'series-1', 'entries', 'entry-1'],
    ]);
  });

  it('does not reset when destructive confirmation is dismissed', async () => {
    const resetPromise = workflow.resetToOriginal();
    await flushAlertPresentation();

    alertController.dismissLatest();

    expect(await resetPromise).toBeFalse();
    expect(library.resetInputs).toEqual([]);
    expect(router.navigateCalls).toEqual([]);
  });

  it('asks before leaving changed sanitized content', async () => {
    await workflow.loadEntry();

    const leavePromise = workflow.requestLeave(
      '<p>Changed content.</p><script>bad()</script>',
      true,
    );
    await flushAlertPresentation();

    expect(alertController.latest?.header).toBe('Discard changes?');
    expect(router.navigateCalls).toEqual([]);

    alertController.confirmLatest();

    expect(await leavePromise).toBeTrue();
    expect(router.navigateCalls).toEqual([
      ['/library', 'series', 'series-1', 'entries', 'entry-1'],
    ]);
  });

  it('asks before leaving changed header visibility', async () => {
    await workflow.loadEntry();

    const leavePromise = workflow.requestLeave('<p>Original content.</p>', false);
    await flushAlertPresentation();

    expect(alertController.latest?.header).toBe('Discard changes?');
    expect(router.navigateCalls).toEqual([]);

    alertController.confirmLatest();

    expect(await leavePromise).toBeTrue();
    expect(router.navigateCalls).toEqual([
      ['/library', 'series', 'series-1', 'entries', 'entry-1'],
    ]);
  });
});

class FakeLibraryFacade {
  public entry: LibrarySeriesEntry | null = entryFixture();
  public saveResult: SaveSeriesEntryContentOverrideResult = { status: 'saved' };
  public saveHeaderVisibilityResult: SaveSeriesEntryHeaderVisibilityResult = { status: 'saved' };
  public resetResult: ResetSeriesEntryContentOverrideResult = { status: 'reset' };
  public readonly savedInputs: SaveSeriesEntryContentOverrideInput[] = [];
  public readonly savedHeaderVisibilityInputs: SaveSeriesEntryHeaderVisibilityInput[] = [];
  public readonly resetInputs: ResetSeriesEntryContentOverrideInput[] = [];

  public getEntry(seriesId: string, entryId: string): Promise<LibrarySeriesEntry | null> {
    return Promise.resolve(
      this.entry !== null && this.entry.seriesId === seriesId && this.entry.id === entryId
        ? this.entry
        : null,
    );
  }

  public saveSeriesEntryContentOverride(
    input: SaveSeriesEntryContentOverrideInput,
  ): Promise<SaveSeriesEntryContentOverrideResult> {
    this.savedInputs.push(input);
    return Promise.resolve(this.saveResult);
  }

  public saveSeriesEntryHeaderVisibility(
    input: SaveSeriesEntryHeaderVisibilityInput,
  ): Promise<SaveSeriesEntryHeaderVisibilityResult> {
    this.savedHeaderVisibilityInputs.push(input);
    return Promise.resolve(this.saveHeaderVisibilityResult);
  }

  public resetSeriesEntryContentOverride(
    input: ResetSeriesEntryContentOverrideInput,
  ): Promise<ResetSeriesEntryContentOverrideResult> {
    this.resetInputs.push(input);
    return Promise.resolve(this.resetResult);
  }
}

class FakeRouter {
  public readonly navigateCalls: string[][] = [];

  public navigate(commands: string[]): Promise<boolean> {
    this.navigateCalls.push(commands);
    return Promise.resolve(true);
  }
}

class FakeContentSanitizer implements LibraryContentSanitizer {
  public sanitizeContentHtml(contentHtml: string): SanitizedLibraryContent {
    const template = document.createElement('template');
    template.innerHTML = contentHtml;
    template.content.querySelectorAll('script').forEach((element) => {
      element.remove();
    });

    return {
      contentHtml: template.innerHTML.trim(),
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

function createWorkflow(dependencies: {
  readonly library: FakeLibraryFacade;
  readonly router: FakeRouter;
  readonly alertController: FakeAlertController;
}): LibraryEntryEditWorkflow {
  return new LibraryEntryEditWorkflow({
    library: dependencies.library as unknown as LibraryFacade,
    router: dependencies.router as unknown as Router,
    alertController: dependencies.alertController as unknown as AlertController,
    sanitizer: new FakeContentSanitizer(),
    seriesId: 'series-1',
    entryId: 'entry-1',
  });
}

function entryFixture(): LibrarySeriesEntry {
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
    originalContentHtml: '<p>Original content.</p>',
    contentOverrideHtml: null,
    effectiveContentHtml: '<p>Original content.</p>',
    hasContentOverride: false,
    createdAt: '2026-06-27T10:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
  };
}

async function flushAlertPresentation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
