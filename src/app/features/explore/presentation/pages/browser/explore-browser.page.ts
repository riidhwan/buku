import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonText,
  IonToolbar,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  closeOutline,
  copyOutline,
  ellipsisVerticalOutline,
  lockClosedOutline,
  openOutline,
  readerOutline,
  refreshOutline,
  stopOutline,
  tabletLandscapeOutline,
  warningOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import { BrowserViewportRect } from '../../../application/ports/browser-viewport.port';

@Component({
  selector: 'app-explore-browser-page',
  templateUrl: './explore-browser.page.html',
  styleUrl: './explore-browser.page.scss',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonText,
    IonToolbar,
  ],
})
export class ExploreBrowserPage implements AfterViewInit, OnDestroy {
  @ViewChild('viewportHost', { static: true })
  private readonly viewportHost!: ElementRef<HTMLElement>;

  protected readonly browser = inject(ExploreBrowserFacade);
  public readonly actionsOpen = signal(false);
  private readonly router = inject(Router);
  private readonly platform = inject(Platform);
  private readonly backButtonSubscription: Subscription;
  private viewportUpdateTimer: number | null = null;
  private readonly resizeListener = (): void => {
    void this.updateViewportRect();
  };

  public constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      closeOutline,
      copyOutline,
      ellipsisVerticalOutline,
      lockClosedOutline,
      openOutline,
      readerOutline,
      refreshOutline,
      stopOutline,
      tabletLandscapeOutline,
      warningOutline,
    });
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      void this.handleHardwareBackButton();
    });
  }

  public ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeListener);
    void this.updateViewportRect();
  }

  public ionViewDidEnter(): void {
    this.scheduleViewportRectUpdate();
  }

  public ngOnDestroy(): void {
    this.backButtonSubscription.unsubscribe();
    window.removeEventListener('resize', this.resizeListener);
    if (this.viewportUpdateTimer !== null) {
      window.clearTimeout(this.viewportUpdateTimer);
    }
    void this.browser.hideViewport();
  }

  protected updateUrl(event: CustomEvent<{ readonly value?: string | null }>): void {
    this.browser.updateInputValue(event.detail.value ?? '');
  }

  protected async openUrl(): Promise<void> {
    await this.browser.openInput();
  }

  protected async close(): Promise<void> {
    await this.browser.closeBrowser();
    this.closeActions();
    await this.router.navigate(['explore']);
  }

  protected async openTabs(): Promise<void> {
    this.closeActions();
    await this.browser.hideViewport();
    await this.router.navigate(['explore', 'browser', 'tabs']);
  }

  protected async openNoticeUrlExternally(): Promise<void> {
    await this.browser.openCurrentUrlExternally();
    this.browser.dismissNotice();
  }

  protected async openReadingMode(): Promise<void> {
    const result = await this.browser.openReadingMode();
    this.closeActions();
    if (result.ok) {
      await this.router.navigate(['explore', 'reader']);
    }
  }

  public openActions(): void {
    this.actionsOpen.update((isOpen) => !isOpen);
    this.scheduleViewportRectUpdate();
  }

  public closeActions(): void {
    this.actionsOpen.set(false);
  }

  private async handleHardwareBackButton(): Promise<void> {
    if (this.actionsOpen()) {
      this.closeActions();
      this.scheduleViewportRectUpdate();
      return;
    }

    if (this.browser.canGoBack()) {
      const result = await this.browser.goBack();
      if (result.didNavigate) {
        return;
      }
    }

    await this.close();
  }

  private scheduleViewportRectUpdate(): void {
    if (this.viewportUpdateTimer !== null) {
      window.clearTimeout(this.viewportUpdateTimer);
    }

    this.viewportUpdateTimer = window.setTimeout(() => {
      this.viewportUpdateTimer = null;
      void this.updateViewportRect();
    });
  }

  private async updateViewportRect(): Promise<void> {
    const rect = this.viewportHost.nativeElement.getBoundingClientRect();
    const viewportRect: BrowserViewportRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    await this.browser.showViewport(viewportRect);
  }
}
