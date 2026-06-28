import { Component, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
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
import { LibraryFacade } from '../../application/library.facade';
import { LibrarySeriesSummary } from '../../domain/library-series';

@Component({
  selector: 'app-library-page',
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  imports: [
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
export class LibraryPage {
  private readonly library = inject(LibraryFacade);

  @ViewChild(IonContent)
  private readonly content?: IonContent;

  protected readonly series = signal<readonly LibrarySeriesSummary[]>([]);

  private readonly dateFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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

  protected formatSeriesSummary(entryCount: number, lastSavedAt: string): string {
    const entryLabel = entryCount === 1 ? '1 entry' : `${String(entryCount)} entries`;
    return `${entryLabel} - Last saved ${this.formatDate(lastSavedAt)}`;
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return this.dateFormatter.format(date);
  }

  private async loadSeries(): Promise<void> {
    this.series.set(await this.library.listSeries());
  }

  private async completeRefresh(event: CustomEvent): Promise<void> {
    const refresher = event.target as HTMLIonRefresherElement | null;
    await refresher?.complete();
  }
}
