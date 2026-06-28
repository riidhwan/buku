import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ExploreBrowserFacade } from '../../application/explore-browser.facade';
import { ExploreBrowserTab } from '../../application/ports/browser-session-store.port';

@Component({
  selector: 'app-explore-page',
  templateUrl: './explore.page.html',
  styleUrl: './explore.page.scss',
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
  ],
})
export class ExplorePage implements OnInit {
  protected readonly browser = inject(ExploreBrowserFacade);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    void this.browser.initialize();
  }

  protected updateUrl(event: CustomEvent<{ readonly value?: string | null }>): void {
    this.browser.updateInputValue(event.detail.value ?? '');
  }

  protected async openUrl(): Promise<void> {
    const result = await this.browser.openInputInNewTab();
    if (result.ok) {
      await this.router.navigate(['explore', 'browser']);
    }
  }

  protected async resumeTab(tabId: string): Promise<void> {
    const result = await this.browser.resumeTab(tabId);
    if (result.ok) {
      await this.router.navigate(['explore', 'browser']);
    }
  }

  protected tabLabel(tab: Pick<ExploreBrowserTab, 'url' | 'pageTitle'>): string {
    if (tab.pageTitle !== null) {
      return tab.pageTitle;
    }

    if (tab.url === null) {
      return 'Blank tab';
    }

    const parsedUrl = new URL(tab.url);
    return `${parsedUrl.hostname}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname}`;
  }
}
