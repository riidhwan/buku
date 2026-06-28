import { signal } from '@angular/core';
import type {
  ReadingLibrarySeriesOption,
  ReadingLibrarySeriesTarget,
  SaveReadingArticleToLibraryResult,
} from '../../../application/ports/reading-library-save.port';

type DefensiveSaveReadingArticleToLibraryResult =
  | Exclude<SaveReadingArticleToLibraryResult, { readonly status: 'validationFailed' }>
  | {
      readonly status: 'validationFailed';
      readonly message?: string;
    };

export class ExploreReaderSaveForm {
  public readonly modalOpen = signal(false);
  public readonly saving = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly confirmed = signal(false);
  public readonly existingSeries = signal<readonly ReadingLibrarySeriesOption[]>([]);
  public seriesInput = '';
  public entryTitleInput = '';
  public selectedSeriesId: string | null = null;

  public resetForArticle(options: {
    readonly rememberedSeriesTitle: string | null;
    readonly entryTitle: string;
    readonly existingSeries: readonly ReadingLibrarySeriesOption[];
  }): void {
    this.seriesInput = options.rememberedSeriesTitle ?? '';
    this.entryTitleInput = options.entryTitle;
    this.selectedSeriesId = null;
    this.error.set(null);
    this.existingSeries.set(options.existingSeries);
    this.modalOpen.set(true);
  }

  public close(): void {
    if (!this.saving()) {
      this.modalOpen.set(false);
    }
  }

  public selectSeries(series: ReadingLibrarySeriesOption): void {
    this.seriesInput = series.title;
    this.selectedSeriesId = series.id;
    this.error.set(null);
  }

  public updateSeriesInput(value: string | number | null | undefined): void {
    this.seriesInput = String(value ?? '');
    this.selectedSeriesId = null;
    this.error.set(null);
  }

  public updateEntryTitle(value: string | number | null | undefined): void {
    this.entryTitleInput = String(value ?? '');
    this.error.set(null);
  }

  public canSave(): boolean {
    return (
      this.normalizedSeriesInput() !== '' && this.entryTitleInput.trim() !== '' && !this.saving()
    );
  }

  public filteredSeries(): readonly ReadingLibrarySeriesOption[] {
    const query = this.normalizedSeriesInput().toLocaleLowerCase();
    if (query === '') {
      return this.existingSeries();
    }

    return this.existingSeries().filter((series) =>
      series.title.toLocaleLowerCase().includes(query),
    );
  }

  public showCreateSeries(): boolean {
    const title = this.normalizedSeriesInput();
    return title !== '' && this.exactSeriesMatch() === null;
  }

  public seriesTarget(): ReadingLibrarySeriesTarget {
    if (this.selectedSeriesId !== null) {
      return { kind: 'existing', seriesId: this.selectedSeriesId };
    }

    const exactMatch = this.exactSeriesMatch();
    return exactMatch === null
      ? { kind: 'title', title: this.seriesInput }
      : { kind: 'existing', seriesId: exactMatch.id };
  }

  public handleSaveResult(result: DefensiveSaveReadingArticleToLibraryResult): void {
    switch (result.status) {
      case 'saved':
        this.modalOpen.set(false);
        this.confirmed.set(true);
        return;
      case 'duplicate':
        this.error.set('This article is already saved in that Series.');
        return;
      case 'validationFailed':
        this.error.set(result.message ?? 'Series and entry title are required.');
        return;
      case 'persistenceFailed':
        this.error.set('Library could not save this article. Try again.');
        return;
    }
  }

  public normalizedSeriesInput(): string {
    return this.seriesInput.trim().replace(/\s+/g, ' ');
  }

  private exactSeriesMatch(): ReadingLibrarySeriesOption | null {
    const input = this.normalizedSeriesInput().toLocaleLowerCase();
    return (
      this.existingSeries().find(
        (series) => series.title.trim().replace(/\s+/g, ' ').toLocaleLowerCase() === input,
      ) ?? null
    );
  }
}
