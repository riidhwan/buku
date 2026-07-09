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
  public readonly previousLoadState = signal<LibraryEntryReaderLoadState>('idle');
  public readonly nextLoadState = signal<LibraryEntryReaderLoadState>('idle');
  public readonly loadState = this.nextLoadState;
  public readonly entry = computed(() => this.loadedEntries()[0] ?? null);
  public readonly activeEntry = computed(
    () => this.loadedEntries().find((entry) => entry.id === this.activeEntryId()) ?? this.entry(),
  );
  public readonly loadingAdjacentEntry = computed(
    () => this.previousLoadState() === 'loading' || this.nextLoadState() === 'loading',
  );
  public readonly previousLoadingDisabled = computed(
    () =>
      this.loadedEntries().length === 0 ||
      this.previousLoadState() === 'ended' ||
      this.previousLoadState() === 'failed' ||
      this.loadingAdjacentEntry(),
  );
  public readonly infiniteScrollDisabled = computed(
    () =>
      this.loadedEntries().length === 0 ||
      this.nextLoadState() === 'ended' ||
      this.nextLoadState() === 'failed' ||
      (this.loadingAdjacentEntry() && this.nextLoadState() !== 'loading'),
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
    this.previousLoadState.set('idle');
    this.nextLoadState.set('idle');
  }

  public async loadAppearance(): Promise<void> {
    this.appearance.set(await this.dependencies.library.getSeriesEntryReadingAppearance());
  }

  public async loadNextEntry(event?: LibraryEntryReaderInfiniteScrollEvent): Promise<void> {
    if (this.loadingAdjacentEntry()) {
      await event?.target.complete();
      return;
    }

    this.nextLoadState.set('loading');

    try {
      const nextEntryId = this.nextEntryId();
      if (nextEntryId === null) {
        this.nextLoadState.set('ended');
        return;
      }

      const nextEntry = await this.dependencies.library.getEntry(
        this.dependencies.seriesId,
        nextEntryId,
      );
      if (nextEntry === null) {
        this.nextLoadState.set('failed');
        return;
      }

      this.loadedEntries.update((entries) => [...entries, nextEntry]);
      this.nextLoadState.set('idle');
    } finally {
      await event?.target.complete();
    }
  }

  public async loadPreviousEntry(): Promise<boolean> {
    if (this.loadingAdjacentEntry()) {
      return false;
    }

    this.previousLoadState.set('loading');

    const previousEntryId = this.previousEntryId();
    if (previousEntryId === null) {
      this.previousLoadState.set('ended');
      return false;
    }

    const previousEntry = await this.dependencies.library.getEntry(
      this.dependencies.seriesId,
      previousEntryId,
    );
    if (previousEntry === null) {
      this.previousLoadState.set('failed');
      return false;
    }

    this.loadedEntries.update((entries) => [previousEntry, ...entries]);
    this.previousLoadState.set('idle');
    return true;
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
    return this.adjacentEntryId('next');
  }

  private previousEntryId(): string | null {
    return this.adjacentEntryId('previous');
  }

  private adjacentEntryId(direction: 'previous' | 'next'): string | null {
    const series = this.series();
    if (series === null) {
      return null;
    }

    const loadedEntries = this.loadedEntries();
    const boundaryEntry =
      direction === 'previous' ? loadedEntries[0] : loadedEntries[loadedEntries.length - 1];
    if (boundaryEntry === undefined) {
      return null;
    }

    const entryIndex = series.entries.findIndex((entry) => entry.id === boundaryEntry.id);
    const adjacentIndex = direction === 'previous' ? entryIndex - 1 : entryIndex + 1;
    const adjacentEntry = series.entries[adjacentIndex];
    return adjacentEntry?.id ?? null;
  }
}
