import type { Signal } from '@angular/core';
import type { IonInput, Platform } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import type {
  BrowserHistoryNavigationResult,
  BrowserViewportRect,
} from '../../../application/ports/browser-viewport.port';

export interface ExploreBrowserPageShellBrowser {
  readonly readingModeActive: Signal<boolean>;
  readonly canGoBack: Signal<boolean>;
  showViewport(rect: BrowserViewportRect): Promise<void>;
  hideViewport(): Promise<void>;
  closeReadingMode(): void;
  goBack(): Promise<BrowserHistoryNavigationResult>;
}

export interface ExploreBrowserPageShellHost {
  isAddressBarFocused(): boolean;
  blurAddressBar(): void;
  getAddressInput(): IonInput;
  isActionsOpen(): boolean;
  closeActions(): void;
  getViewportElement(): HTMLElement;
}

export class ExploreBrowserPageShell {
  private backButtonSubscription: Subscription | null = null;
  private viewportUpdateTimer: number | null = null;
  private readonly resizeListener = (): void => {
    void this.updateViewportRect();
  };

  public constructor(
    private readonly browser: ExploreBrowserPageShellBrowser,
    private readonly host: ExploreBrowserPageShellHost,
    private readonly platform: Platform,
  ) {}

  public afterViewInit(): void {
    window.addEventListener('resize', this.resizeListener);
    this.registerBackButtonHandler();
    void this.updateViewportRect();
  }

  public ionViewDidEnter(): void {
    this.registerBackButtonHandler();
    this.scheduleViewportRectUpdate();
  }

  public ionViewWillLeave(): void {
    this.unregisterBackButtonHandler();
    this.clearViewportUpdateTimer();
    void this.browser.hideViewport();
  }

  public destroy(): void {
    this.unregisterBackButtonHandler();
    window.removeEventListener('resize', this.resizeListener);
    this.clearViewportUpdateTimer();
    void this.browser.hideViewport();
  }

  public scheduleViewportRectUpdate(): void {
    this.clearViewportUpdateTimer();

    this.viewportUpdateTimer = window.setTimeout(() => {
      this.viewportUpdateTimer = null;
      void this.updateViewportRect();
    });
  }

  public async blurAddressBar(): Promise<void> {
    this.host.blurAddressBar();
    const inputElement = await this.host.getAddressInput().getInputElement();
    inputElement.blur();
  }

  private async handleHardwareBackButton(processNextHandler: () => void): Promise<void> {
    if (this.host.isAddressBarFocused()) {
      await this.blurAddressBar();
      return;
    }

    if (this.host.isActionsOpen()) {
      this.host.closeActions();
      this.scheduleViewportRectUpdate();
      return;
    }

    if (this.browser.readingModeActive()) {
      this.browser.closeReadingMode();
      this.scheduleViewportRectUpdate();
      return;
    }

    if (this.browser.canGoBack()) {
      const result = await this.browser.goBack();
      if (result.didNavigate) {
        return;
      }
    }

    processNextHandler();
  }

  private registerBackButtonHandler(): void {
    if (this.backButtonSubscription !== null) {
      return;
    }

    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(
      10,
      (processNextHandler) => {
        void this.handleHardwareBackButton(processNextHandler);
      },
    );
  }

  private unregisterBackButtonHandler(): void {
    this.backButtonSubscription?.unsubscribe();
    this.backButtonSubscription = null;
  }

  private clearViewportUpdateTimer(): void {
    if (this.viewportUpdateTimer !== null) {
      window.clearTimeout(this.viewportUpdateTimer);
      this.viewportUpdateTimer = null;
    }
  }

  private async updateViewportRect(): Promise<void> {
    const rect = this.host.getViewportElement().getBoundingClientRect();
    const viewportRect: BrowserViewportRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    await this.browser.showViewport(viewportRect);
  }
}
