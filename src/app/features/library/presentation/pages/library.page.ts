import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
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
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class LibraryPage implements OnInit {
  private readonly library = inject(LibraryFacade);

  protected readonly series = signal<readonly LibrarySeriesSummary[]>([]);

  private readonly dateFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  public ngOnInit(): void {
    void this.loadSeries();
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
}
