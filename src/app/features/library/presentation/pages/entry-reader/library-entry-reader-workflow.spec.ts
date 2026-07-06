import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries, LibrarySeriesEntry } from '../../../domain/library-series';
import { SeriesEntryReadingAppearance } from '../../../domain/series-entry-reading-appearance';
import { LibraryEntryReaderWorkflow } from './library-entry-reader-workflow';

describe('LibraryEntryReaderWorkflow', () => {
  let library: FakeLibraryFacade;
  let workflow: LibraryEntryReaderWorkflow;

  beforeEach(() => {
    library = new FakeLibraryFacade();
    workflow = createWorkflow(library);
  });

  it('loads the routed entry as the active reader entry', async () => {
    await workflow.loadEntry();

    expect(workflow.series()).toEqual(library.series);
    expect(workflow.loadedEntries()).toEqual([library.entry('entry-1')]);
    expect(workflow.activeEntry()).toEqual(library.entry('entry-1'));
    expect(workflow.loadState()).toBe('idle');
  });

  it('loads the persisted reading appearance', async () => {
    library.appearance = { fontId: 'libron' };

    await workflow.loadAppearance();

    expect(workflow.appearance()).toEqual({ fontId: 'libron' });
  });

  it('persists selected reader fonts immediately', async () => {
    await workflow.selectFont('sourcerer');

    expect(workflow.appearance()).toEqual({ fontId: 'sourcerer' });
    expect(library.savedAppearances).toEqual([{ fontId: 'sourcerer' }]);
  });

  it('appends the next series entry and keeps the infinite scroll event completed', async () => {
    await workflow.loadEntry();
    const event = new FakeInfiniteScrollEvent();

    await workflow.loadNextEntry(event);

    expect(workflow.loadedEntries().map((entry) => entry.id)).toEqual(['entry-1', 'entry-2']);
    expect(workflow.activeEntry()).toEqual(library.entry('entry-1'));
    expect(workflow.loadState()).toBe('idle');
    expect(event.completeCalls).toBe(1);
  });

  it('marks loading ended when no later series entry exists', async () => {
    await workflow.loadEntry();

    await workflow.loadNextEntry();
    await workflow.loadNextEntry();
    await workflow.loadNextEntry();

    expect(workflow.loadedEntries().map((entry) => entry.id)).toEqual([
      'entry-1',
      'entry-2',
      'entry-3',
    ]);
    expect(workflow.loadState()).toBe('ended');
    expect(workflow.infiniteScrollDisabled()).toBeTrue();
  });

  it('keeps rendered entries and reports failure when the next entry cannot load', async () => {
    await workflow.loadEntry();
    library.entriesById.delete('entry-2');

    await workflow.loadNextEntry();

    expect(workflow.loadedEntries().map((entry) => entry.id)).toEqual(['entry-1']);
    expect(workflow.loadState()).toBe('failed');
    expect(workflow.infiniteScrollDisabled()).toBeTrue();
  });

  it('completes duplicate infinite scroll events while a load is already in progress', async () => {
    workflow.loadState.set('loading');
    const event = new FakeInfiniteScrollEvent();

    await workflow.loadNextEntry(event);

    expect(event.completeCalls).toBe(1);
    expect(workflow.loadState()).toBe('loading');
  });

  it('uses the first loaded entry when the active id no longer points at a loaded entry', async () => {
    await workflow.loadEntry();
    workflow.setActiveEntryId('missing-entry');

    expect(workflow.activeEntry()).toEqual(library.entry('entry-1'));
  });
});

class FakeLibraryFacade {
  public appearance: SeriesEntryReadingAppearance = { fontId: 'nv-charis' };
  public readonly savedAppearances: SeriesEntryReadingAppearance[] = [];
  public readonly series: LibrarySeries = {
    id: 'series-1',
    title: 'The Clockwork Archive',
    entries: [
      entrySummaryFixture('entry-1', 'Chapter 1'),
      entrySummaryFixture('entry-2', 'Chapter 2'),
      entrySummaryFixture('entry-3', 'Chapter 3'),
    ],
  };
  public readonly entriesById = new Map<string, LibrarySeriesEntry>([
    ['entry-1', entryFixture('entry-1', 'Chapter 1')],
    ['entry-2', entryFixture('entry-2', 'Chapter 2')],
    ['entry-3', entryFixture('entry-3', 'Chapter 3')],
  ]);

  public getSeries(seriesId: string): Promise<LibrarySeries | null> {
    return Promise.resolve(seriesId === this.series.id ? this.series : null);
  }

  public getEntry(seriesId: string, entryId: string): Promise<LibrarySeriesEntry | null> {
    return Promise.resolve(
      seriesId === this.series.id ? (this.entriesById.get(entryId) ?? null) : null,
    );
  }

  public getSeriesEntryReadingAppearance(): Promise<SeriesEntryReadingAppearance> {
    return Promise.resolve(this.appearance);
  }

  public saveSeriesEntryReadingAppearance(appearance: SeriesEntryReadingAppearance): Promise<void> {
    this.appearance = appearance;
    this.savedAppearances.push(appearance);
    return Promise.resolve();
  }

  public entry(entryId: string): LibrarySeriesEntry {
    const entry = this.entriesById.get(entryId);
    if (entry === undefined) {
      throw new Error(`Missing test entry fixture: ${entryId}`);
    }

    return entry;
  }
}

class FakeInfiniteScrollEvent {
  public completeCalls = 0;
  public readonly target = {
    complete: (): void => {
      this.completeCalls += 1;
    },
  };
}

function createWorkflow(library: FakeLibraryFacade): LibraryEntryReaderWorkflow {
  return new LibraryEntryReaderWorkflow({
    library: library as unknown as LibraryFacade,
    seriesId: 'series-1',
    entryId: 'entry-1',
  });
}

function entrySummaryFixture(id: string, displayTitle: string): LibrarySeries['entries'][number] {
  return {
    id,
    seriesId: 'series-1',
    displayTitle,
    sourceHost: 'example.com',
    createdAt: '2026-01-12T09:30:00.000Z',
    updatedAt: '2026-01-12T09:30:00.000Z',
  };
}

function entryFixture(id: string, displayTitle: string): LibrarySeriesEntry {
  return {
    id,
    seriesId: 'series-1',
    seriesTitle: 'The Clockwork Archive',
    displayTitle,
    sourceUrl: `https://example.com/${id}`,
    sourceHost: 'example.com',
    articleTitle: `The Clockwork Archive - ${displayTitle}`,
    byline: null,
    siteName: 'Example Reads',
    publishedTime: null,
    originalContentHtml: `<p>${displayTitle}</p>`,
    contentOverrideHtml: null,
    effectiveContentHtml: `<p>${displayTitle}</p>`,
    hasContentOverride: false,
    createdAt: '2026-01-12T09:30:00.000Z',
    updatedAt: '2026-01-12T09:30:00.000Z',
  };
}
