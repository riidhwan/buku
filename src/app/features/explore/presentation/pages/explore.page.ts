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
    const result = await this.browser.openInput();
    if (result.ok) {
      await this.router.navigate(['explore', 'browser']);
    }
  }

  protected async resumeLastUrl(): Promise<void> {
    const result = await this.browser.resumeLastUrl();
    if (result.ok) {
      await this.router.navigate(['explore', 'browser']);
    }
  }
}
