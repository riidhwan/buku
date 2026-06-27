import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, checkmarkCircleOutline, closeOutline } from 'ionicons/icons';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';

@Component({
  selector: 'app-explore-browser-tabs-page',
  templateUrl: './explore-browser-tabs.page.html',
  styleUrl: './explore-browser-tabs.page.scss',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
  ],
})
export class ExploreBrowserTabsPage {
  protected readonly browser = inject(ExploreBrowserFacade);
  private readonly router = inject(Router);

  public constructor() {
    addIcons({
      addOutline,
      checkmarkCircleOutline,
      closeOutline,
    });
  }

  protected async createBlankTab(): Promise<void> {
    await this.browser.createBlankTab();
    await this.router.navigate(['explore', 'browser']);
  }

  protected async selectTab(tabId: string): Promise<void> {
    await this.browser.selectTab(tabId);
    await this.router.navigate(['explore', 'browser']);
  }

  protected async closeTab(event: Event, tabId: string): Promise<void> {
    event.stopPropagation();
    await this.browser.closeTab(tabId);
  }

  protected async close(): Promise<void> {
    await this.router.navigate(['explore', 'browser']);
  }

  protected tabLabel(url: string | null): string {
    if (url === null) {
      return 'Blank tab';
    }

    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname}`;
  }
}
