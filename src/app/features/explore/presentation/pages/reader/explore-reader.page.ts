import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
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
import {
  ExploreBrowserFacade,
  ReadingChapterDirection,
} from '../../../application/explore-browser.facade';
import {
  READING_LIBRARY_SAVE,
  ReadingLibrarySeriesOption,
  ReadingLibrarySeriesTarget,
} from '../../../application/ports/reading-library-save.port';

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
  private readonly publishedTimeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
  protected readonly saveModalOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveConfirmed = signal(false);
  protected readonly existingSeries = signal<readonly ReadingLibrarySeriesOption[]>([]);
  protected filteredSeries(): readonly ReadingLibrarySeriesOption[] {
    const query = this.normalizedSeriesInput().toLocaleLowerCase();
    if (query === '') {
      return this.existingSeries();
    }

    return this.existingSeries().filter((series) =>
      series.title.toLocaleLowerCase().includes(query),
    );
  }

  protected showCreateSeries(): boolean {
    const title = this.normalizedSeriesInput();
    return title !== '' && this.exactSeriesMatch() === null;
  }

  protected seriesInput = '';
  protected entryTitleInput = '';
  protected selectedSeriesId: string | null = null;

  public constructor() {
    addIcons({ bookmarkOutline, chevronBackOutline, chevronForwardOutline, closeOutline });
  }

  public ngOnInit(): void {
    void this.initialize();
  }

  protected async close(): Promise<void> {
    this.browser.closeReadingMode();
    await this.router.navigate(['explore', 'browser']);
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
      await this.router.navigate(['explore', 'browser']);
    }
  }

  protected async navigateChapter(direction: ReadingChapterDirection): Promise<void> {
    const result = await this.browser.navigateReadingChapter(direction);
    if (result.ok && result.destination === 'browser') {
      await this.router.navigate(['explore', 'browser']);
    }
  }

  protected async openSaveModal(): Promise<void> {
    const article = this.browser.readingArticle();
    if (article === null || this.browser.chapterNavigationLoading()) {
      return;
    }

    this.seriesInput = this.browser.activeTab()?.lastLibrarySeriesTitle ?? '';
    this.entryTitleInput = article.title;
    this.selectedSeriesId = null;
    this.saveError.set(null);
    this.existingSeries.set(await this.librarySave.listSeries());
    this.saveModalOpen.set(true);
  }

  protected closeSaveModal(): void {
    if (!this.saving()) {
      this.saveModalOpen.set(false);
    }
  }

  protected selectSeries(series: ReadingLibrarySeriesOption): void {
    this.seriesInput = series.title;
    this.selectedSeriesId = series.id;
    this.saveError.set(null);
  }

  protected updateSeriesInput(value: string | number | null | undefined): void {
    this.seriesInput = String(value ?? '');
    this.selectedSeriesId = null;
    this.saveError.set(null);
  }

  protected updateEntryTitle(value: string | number | null | undefined): void {
    this.entryTitleInput = String(value ?? '');
    this.saveError.set(null);
  }

  protected canSave(): boolean {
    return (
      this.normalizedSeriesInput() !== '' && this.entryTitleInput.trim() !== '' && !this.saving()
    );
  }

  protected async saveToLibrary(): Promise<void> {
    const article = this.browser.readingArticle();
    if (article === null || !this.canSave()) {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    const result = await this.librarySave.save({
      article,
      entryTitle: this.entryTitleInput,
      target: this.seriesTarget(),
    });
    if (result.status === 'saved') {
      await this.browser.rememberActiveTabLibrarySeriesTitle(this.normalizedSeriesInput());
    }
    this.saving.set(false);
    this.handleSaveResult(result.status, 'message' in result ? result.message : null);
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

  private normalizedSeriesInput(): string {
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

  private seriesTarget(): ReadingLibrarySeriesTarget {
    if (this.selectedSeriesId !== null) {
      return { kind: 'existing', seriesId: this.selectedSeriesId };
    }

    const exactMatch = this.exactSeriesMatch();
    return exactMatch === null
      ? { kind: 'title', title: this.seriesInput }
      : { kind: 'existing', seriesId: exactMatch.id };
  }

  private handleSaveResult(status: string, validationMessage: string | null): void {
    switch (status) {
      case 'saved':
        this.saveModalOpen.set(false);
        this.saveConfirmed.set(true);
        return;
      case 'duplicate':
        this.saveError.set('This article is already saved in that Series.');
        return;
      case 'validationFailed':
        this.saveError.set(validationMessage ?? 'Series and entry title are required.');
        return;
      case 'persistenceFailed':
        this.saveError.set('Library could not save this article. Try again.');
        return;
    }
  }
}
