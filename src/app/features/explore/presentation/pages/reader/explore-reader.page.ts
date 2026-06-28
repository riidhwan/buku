import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookmarkOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
} from 'ionicons/icons';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import type { ReadingChapterDirection } from '../../../application/explore-browser-reading-mode-policy';
import {
  READING_LIBRARY_SAVE,
  ReadingLibrarySeriesOption,
} from '../../../application/ports/reading-library-save.port';
import { ExploreReaderSaveForm } from './explore-reader-save-form';

@Component({
  selector: 'app-explore-reader-page',
  templateUrl: './explore-reader.page.html',
  styleUrl: './explore-reader.page.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonNote,
    IonSpinner,
    IonText,
    IonTitle,
    IonToast,
    IonToolbar,
  ],
})
export class ExploreReaderPage implements OnInit {
  protected readonly browser = inject(ExploreBrowserFacade);
  private readonly librarySave = inject(READING_LIBRARY_SAVE);
  private readonly router = inject(Router);
  protected readonly saveForm = new ExploreReaderSaveForm();
  private readonly publishedTimeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });

  protected filteredSeries(): readonly ReadingLibrarySeriesOption[] {
    return this.saveForm.filteredSeries();
  }

  protected showCreateSeries(): boolean {
    return this.saveForm.showCreateSeries();
  }

  public constructor() {
    addIcons({ bookmarkOutline, chevronBackOutline, chevronForwardOutline, closeOutline });
  }

  public ngOnInit(): void {
    void this.initialize();
  }

  protected async close(): Promise<void> {
    this.browser.closeReadingMode();
    await this.router.navigate(['explore']);
  }

  protected async openReaderLink(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest('a');
    const href = link?.getAttribute('href') ?? null;
    if (href === null) {
      return;
    }

    event.preventDefault();
    const result = await this.browser.openReadingModeLink(href);
    if (result.ok) {
      await this.router.navigate(['explore']);
    }
  }

  protected async navigateChapter(direction: ReadingChapterDirection): Promise<void> {
    const result = await this.browser.navigateReadingChapter(direction);
    if (result.ok && result.destination === 'browser') {
      await this.router.navigate(['explore']);
    }
  }

  protected async openSaveModal(): Promise<void> {
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

  protected closeSaveModal(): void {
    this.saveForm.close();
  }

  protected selectSeries(series: ReadingLibrarySeriesOption): void {
    this.saveForm.selectSeries(series);
  }

  protected updateSeriesInput(value: string | number | null | undefined): void {
    this.saveForm.updateSeriesInput(value);
  }

  protected updateEntryTitle(value: string | number | null | undefined): void {
    this.saveForm.updateEntryTitle(value);
  }

  protected canSave(): boolean {
    return this.saveForm.canSave();
  }

  protected async saveToLibrary(): Promise<void> {
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

  protected formatPublishedTime(publishedTime: string): string {
    const date = new Date(publishedTime);
    if (Number.isNaN(date.getTime())) {
      return publishedTime;
    }

    return this.publishedTimeFormatter.format(date);
  }

  private async initialize(): Promise<void> {
    await this.browser.hideViewport();

    if (this.browser.readingArticle() === null) {
      await this.router.navigate(['explore']);
    }
  }
}
