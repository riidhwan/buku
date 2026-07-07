import { computed, signal } from '@angular/core';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries, LibrarySeriesEntry } from '../../../domain/library-series';
import {
  defaultSeriesEntryReadingAppearance,
  SeriesEntryReadingColorSchemeId,
  SeriesEntryReadingFontId,
} from '../../../domain/series-entry-reading-appearance';

export type LibraryEntryReaderLoadState = 'idle' | 'loading' | 'ended' | 'failed';

export interface LibraryEntryReaderInfiniteScrollEvent {
  readonly target: {
    complete(): Promise<void> | void;
  };
}

export class LibraryEntryReaderWorkflow {
  public readonly series = signal<LibrarySeries | null>(null);
  public readonly loadedEntries = signal<readonly LibrarySeriesEntry[]>([]);
  public readonly activeEntryId = signal<string | null>(null);
  public readonly appearance = signal(defaultSeriesEntryReadingAppearance);
  public readonly loadState = signal<LibraryEntryReaderLoadState>('idle');
  public readonly entry = computed(() => this.loadedEntries()[0] ?? null);
  public readonly activeEntry = computed(
    () => this.loadedEntries().find((entry) => entry.id === this.activeEntryId()) ?? this.entry(),
  );
  public readonly infiniteScrollDisabled = computed(
    () =>
      this.loadedEntries().length === 0 ||
      this.loadState() === 'ended' ||
      this.loadState() === 'failed',
  );

  public constructor(
    private readonly dependencies: {
      readonly library: LibraryFacade;
      readonly seriesId: string;
      readonly entryId: string;
    },
  ) {}

  public async loadEntry(): Promise<void> {
    const series = await this.dependencies.library.getSeries(this.dependencies.seriesId);
    const entry = await this.dependencies.library.getEntry(
      this.dependencies.seriesId,
      this.dependencies.entryId,
    );

    this.series.set(series);
    this.loadedEntries.set(series === null || entry === null ? [] : [entry]);
    this.activeEntryId.set(entry?.id ?? null);
    this.loadState.set('idle');
  }

  public async loadAppearance(): Promise<void> {
    this.appearance.set(await this.dependencies.library.getSeriesEntryReadingAppearance());
  }

  public async loadNextEntry(event?: LibraryEntryReaderInfiniteScrollEvent): Promise<void> {
    if (this.loadState() === 'loading') {
      await event?.target.complete();
      return;
    }

    this.loadState.set('loading');

    try {
      const nextEntryId = this.nextEntryId();
      if (nextEntryId === null) {
        this.loadState.set('ended');
        return;
      }

      const nextEntry = await this.dependencies.library.getEntry(
        this.dependencies.seriesId,
        nextEntryId,
      );
      if (nextEntry === null) {
        this.loadState.set('failed');
        return;
      }

      this.loadedEntries.update((entries) => [...entries, nextEntry]);
      this.loadState.set('idle');
    } finally {
      await event?.target.complete();
    }
  }

  public setActiveEntryId(entryId: string): void {
    this.activeEntryId.set(entryId);
  }

  public async selectFont(fontId: SeriesEntryReadingFontId): Promise<void> {
    const appearance = { ...this.appearance(), fontId };
    this.appearance.set(appearance);
    await this.dependencies.library.saveSeriesEntryReadingAppearance(appearance);
  }

  public async selectColorScheme(colorSchemeId: SeriesEntryReadingColorSchemeId): Promise<void> {
    const appearance = { ...this.appearance(), colorSchemeId };
    this.appearance.set(appearance);
    await this.dependencies.library.saveSeriesEntryReadingAppearance(appearance);
  }

  private nextEntryId(): string | null {
    const series = this.series();
    if (series === null) {
      return null;
    }

    const loadedEntries = this.loadedEntries();
    const lastLoadedEntry = loadedEntries[loadedEntries.length - 1];
    if (lastLoadedEntry === undefined) {
      return null;
    }

    const entryIndex = series.entries.findIndex((entry) => entry.id === lastLoadedEntry.id);
    const nextEntry = series.entries[entryIndex + 1];
    return nextEntry?.id ?? null;
  }
}
