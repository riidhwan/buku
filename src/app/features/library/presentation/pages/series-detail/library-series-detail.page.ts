import { Component, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeries } from '../../../domain/library-series';

@Component({
  selector: 'app-library-series-detail-page',
  templateUrl: './library-series-detail.page.html',
  styleUrl: './library-series-detail.page.scss',
  imports: [
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class LibrarySeriesDetailPage {
  private readonly library = inject(LibraryFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  protected readonly series = signal<LibrarySeries | null>(null);

  @ViewChild(IonContent)
  private readonly content?: IonContent;

  public ionViewWillEnter(): void {
    void this.loadSeries();
  }

  protected async refreshSeries(event: CustomEvent): Promise<void> {
    try {
      await this.loadSeries();
      await this.content?.scrollToTop(0);
    } finally {
      await this.completeRefresh(event);
    }
  }

  protected formatEntrySummary(sourceHost: string | null, createdAt: string): string {
    const savedAt = `Saved ${this.formatDateTime(createdAt)}`;
    return sourceHost === null ? savedAt : `${sourceHost} - ${savedAt}`;
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return this.dateTimeFormatter.format(date);
  }

  private async loadSeries(): Promise<void> {
    this.series.set(
      await this.library.getSeries(this.route.snapshot.paramMap.get('seriesId') ?? ''),
    );
  }

  private async completeRefresh(event: CustomEvent): Promise<void> {
    const refresher = event.target as HTMLIonRefresherElement | null;
    await refresher?.complete();
  }
}
