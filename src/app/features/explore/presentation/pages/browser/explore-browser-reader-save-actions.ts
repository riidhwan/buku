import type { Signal } from '@angular/core';
import type { ExploreBrowserTab } from '../../../application/ports/browser-session-store.port';
import {
  ReadingLibrarySavePort,
  ReadingLibrarySeriesOption,
} from '../../../application/ports/reading-library-save.port';
import type { ReadingArticleSnapshot } from '../../../domain/reading-article';
import { ExploreReaderSaveForm } from '../reader/explore-reader-save-form';

export interface ExploreBrowserReaderSaveBrowser {
  readonly readingArticle: Signal<ReadingArticleSnapshot | null>;
  readonly chapterNavigationLoading: Signal<boolean>;
  readonly activeTab: Signal<ExploreBrowserTab | null>;
  rememberActiveTabLibrarySeriesTitle(title: string): Promise<void>;
}

export class ExploreBrowserReaderSaveActions {
  public readonly saveForm = new ExploreReaderSaveForm();

  public constructor(
    private readonly browser: ExploreBrowserReaderSaveBrowser,
    private readonly librarySave: ReadingLibrarySavePort,
  ) {}

  public async openSaveModal(): Promise<void> {
    const article = this.browser.readingArticle();
    if (article === null || this.browser.chapterNavigationLoading()) {
      return;
    }

    this.saveForm.resetForArticle({
      rememberedSeriesTitle: this.browser.activeTab()?.lastLibrarySeriesTitle ?? null,
      entryTitle: article.title,
      existingSeries: await this.librarySave.listSeries(),
    });
  }

  public closeSaveModal(): void {
    this.saveForm.close();
  }

  public selectSeries(series: ReadingLibrarySeriesOption): void {
    this.saveForm.selectSeries(series);
  }

  public updateSeriesInput(value: string | number | null | undefined): void {
    this.saveForm.updateSeriesInput(value);
  }

  public updateEntryTitle(value: string | number | null | undefined): void {
    this.saveForm.updateEntryTitle(value);
  }

  public canSave(): boolean {
    return this.saveForm.canSave();
  }

  public filteredSeries(): readonly ReadingLibrarySeriesOption[] {
    return this.saveForm.filteredSeries();
  }

  public showCreateSeries(): boolean {
    return this.saveForm.showCreateSeries();
  }

  public async saveToLibrary(): Promise<void> {
    const article = this.browser.readingArticle();
    if (article === null || !this.canSave()) {
      return;
    }

    this.saveForm.saving.set(true);
    this.saveForm.error.set(null);
    const result = await this.librarySave.save({
      article,
      entryTitle: this.saveForm.entryTitleInput,
      target: this.saveForm.seriesTarget(),
    });
    if (result.status === 'saved') {
      await this.browser.rememberActiveTabLibrarySeriesTitle(this.saveForm.normalizedSeriesInput());
    }
    this.saveForm.saving.set(false);
    this.saveForm.handleSaveResult(result);
  }
}
