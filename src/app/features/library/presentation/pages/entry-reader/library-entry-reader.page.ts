import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries, LibrarySeriesEntry } from '../../../domain/library-series';

type LibraryEntryReaderLoadState = 'idle' | 'loading' | 'ended' | 'failed';

interface LibraryEntryReaderInfiniteScrollEvent {
  readonly target: {
    complete(): Promise<void> | void;
  };
}

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
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class LibraryEntryReaderPage implements OnInit {
  private readonly library = inject(LibraryFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly publishedTimeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });

  protected readonly seriesId = this.route.snapshot.paramMap.get('seriesId') ?? '';
  protected readonly entryId = this.route.snapshot.paramMap.get('entryId') ?? '';
  protected readonly series = signal<LibrarySeries | null>(null);
  protected readonly loadedEntries = signal<readonly LibrarySeriesEntry[]>([]);
  protected readonly activeEntryId = signal<string | null>(null);
  protected readonly loadState = signal<LibraryEntryReaderLoadState>('idle');
  protected readonly entry = computed(() => this.loadedEntries()[0] ?? null);
  protected readonly activeEntry = computed(
    () => this.loadedEntries().find((entry) => entry.id === this.activeEntryId()) ?? this.entry(),
  );
  protected readonly infiniteScrollDisabled = computed(
    () =>
      this.loadedEntries().length === 0 ||
      this.loadState() === 'ended' ||
      this.loadState() === 'failed',
  );

  @ViewChildren('readerArticle')
  private readonly readerArticles!: QueryList<ElementRef<HTMLElement>>;

  public ngOnInit(): void {
    void this.loadEntry();
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

      const nextEntry = await this.library.getEntry(this.seriesId, nextEntryId);
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
      this.activeEntryId.set(activeEntryId);
    }
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

  private async loadEntry(): Promise<void> {
    const series = await this.library.getSeries(this.seriesId);
    const entry = await this.library.getEntry(this.seriesId, this.entryId);

    this.series.set(series);
    this.loadedEntries.set(series === null || entry === null ? [] : [entry]);
    this.activeEntryId.set(entry?.id ?? null);
    this.loadState.set('idle');
  }
}
