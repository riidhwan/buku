import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonText,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import {
  ExploreBrowserFacade,
  ReadingChapterDirection,
} from '../../../application/explore-browser.facade';

@Component({
  selector: 'app-explore-reader-page',
  templateUrl: './explore-reader.page.html',
  styleUrl: './explore-reader.page.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonText, IonToolbar],
})
export class ExploreReaderPage implements OnInit {
  protected readonly browser = inject(ExploreBrowserFacade);
  private readonly router = inject(Router);
  private readonly publishedTimeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });

  public constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, closeOutline });
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
