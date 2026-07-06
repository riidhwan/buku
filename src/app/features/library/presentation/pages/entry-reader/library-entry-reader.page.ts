import {
  Component,
  computed,
  ElementRef,
  OnInit,
  QueryList,
  signal,
  ViewChildren,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, createOutline, textOutline } from 'ionicons/icons';
import { SeriesEntryReadingFontId } from '../../../domain/series-entry-reading-appearance';
import { LibraryFacade } from '../../../application/library.facade';
import {
  libraryEntryReaderFontOption,
  libraryEntryReaderFontOptions,
} from './library-entry-reader-font-options';
import {
  LibraryEntryReaderInfiniteScrollEvent,
  LibraryEntryReaderWorkflow,
} from './library-entry-reader-workflow';

@Component({
  selector: 'app-library-entry-reader-page',
  templateUrl: './library-entry-reader.page.html',
  styleUrl: './library-entry-reader.page.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonPopover,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class LibraryEntryReaderPage implements OnInit {
  private readonly library = inject(LibraryFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publishedTimeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });

  protected readonly seriesId = this.route.snapshot.paramMap.get('seriesId') ?? '';
  protected readonly entryId = this.route.snapshot.paramMap.get('entryId') ?? '';
  private readonly workflow = new LibraryEntryReaderWorkflow({
    library: this.library,
    seriesId: this.seriesId,
    entryId: this.entryId,
  });
  protected readonly series = this.workflow.series;
  protected readonly loadedEntries = this.workflow.loadedEntries;
  protected readonly loadState = this.workflow.loadState;
  protected readonly activeEntry = this.workflow.activeEntry;
  protected readonly appearance = this.workflow.appearance;
  protected readonly fontOptions = libraryEntryReaderFontOptions;
  protected readonly selectedFont = computed(() =>
    libraryEntryReaderFontOption(this.appearance().fontId),
  );
  protected readonly appearanceMenuOpen = signal(false);
  protected readonly appearanceMenuEvent = signal<Event | undefined>(undefined);
  protected readonly infiniteScrollDisabled = this.workflow.infiniteScrollDisabled;

  @ViewChildren('readerArticle')
  private readonly readerArticles!: QueryList<ElementRef<HTMLElement>>;

  public constructor() {
    addIcons({ checkmarkOutline, createOutline, textOutline });
  }

  public ngOnInit(): void {
    void this.workflow.loadAppearance();
    void this.loadEntry();
  }

  public ionViewWillEnter(): Promise<void> {
    return this.loadEntry();
  }

  protected editActiveEntry(): void {
    const activeEntry = this.activeEntry();
    if (activeEntry === null) {
      return;
    }

    void this.router.navigate([
      '/library',
      'series',
      activeEntry.seriesId,
      'entries',
      activeEntry.id,
      'edit',
    ]);
  }

  protected preventReaderLinkNavigation(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('a') !== null) {
      event.preventDefault();
    }
  }

  protected formatPublishedTime(publishedTime: string): string {
    const date = new Date(publishedTime);
    if (Number.isNaN(date.getTime())) {
      return publishedTime;
    }

    return this.publishedTimeFormatter.format(date);
  }

  protected async loadNextEntry(event?: LibraryEntryReaderInfiniteScrollEvent): Promise<void> {
    await this.workflow.loadNextEntry(event);
  }

  protected openAppearanceMenu(event: Event): void {
    this.appearanceMenuEvent.set(event);
    this.appearanceMenuOpen.set(true);
  }

  protected closeAppearanceMenu(): void {
    this.appearanceMenuOpen.set(false);
  }

  protected async selectReadingFont(fontId: SeriesEntryReadingFontId): Promise<void> {
    await this.workflow.selectFont(fontId);
  }

  protected updateActiveEntryFromScroll(): void {
    const articles = this.readerArticles.toArray();
    const [firstArticle, ...remainingArticles] = articles;
    if (firstArticle === undefined) {
      return;
    }

    const activationLine = 16;
    let activeArticle = firstArticle;
    for (const article of remainingArticles.reverse()) {
      if (article.nativeElement.getBoundingClientRect().top <= activationLine) {
        activeArticle = article;
        break;
      }
    }

    const activeEntryId = activeArticle.nativeElement.dataset['entryId'];
    if (activeEntryId !== undefined) {
      this.workflow.setActiveEntryId(activeEntryId);
    }
  }

  private async loadEntry(): Promise<void> {
    await this.workflow.loadEntry();
  }
}
