import { Component, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries, LibrarySeriesEntry } from '../../../domain/library-series';

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
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class LibraryEntryReaderPage {
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
  protected readonly series: LibrarySeries | null = this.library.getSeries(this.seriesId);
  protected readonly entry: LibrarySeriesEntry | null = this.library.getEntry(
    this.seriesId,
    this.entryId,
  );
  protected readonly previousEntryId = this.adjacentEntryId(-1);
  protected readonly nextEntryId = this.adjacentEntryId(1);

  public constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
  }

  protected async navigateToEntry(entryId: string | null): Promise<void> {
    if (entryId === null) {
      return;
    }

    await this.router.navigate(['/library', 'series', this.seriesId, 'entries', entryId]);
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

  private adjacentEntryId(offset: -1 | 1): string | null {
    if (this.series === null) {
      return null;
    }

    const entryIndex = this.series.entries.findIndex((entry) => entry.id === this.entryId);
    const adjacentEntry = this.series.entries[entryIndex + offset];
    return adjacentEntry?.id ?? null;
  }
}
