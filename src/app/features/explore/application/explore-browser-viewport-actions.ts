import { browserNoticeForLoadFailure } from './explore-browser-reading-mode-policy';
import {
  canUseNativeBackNavigation,
  discardLatestBackNavigationAttempt,
  recordFallbackBackNavigationAttempt,
  recordNativeBackNavigation,
} from './explore-browser-back-navigation-policy';
import type { ExploreBrowserFacadeState } from './explore-browser.facade-state';
import type {
  BrowserHistoryNavigationResult,
  BrowserViewportPort,
  BrowserViewportRect,
} from './ports/browser-viewport.port';
import type { ExternalUrlOpenerPort } from './ports/external-url-opener.port';

interface ExploreBrowserViewportActionsParams {
  readonly state: ExploreBrowserFacadeState;
  readonly viewport: BrowserViewportPort;
  readonly externalUrlOpener: ExternalUrlOpenerPort;
  readonly loadSelectedTabUrl: (url: string) => Promise<void>;
}

export class ExploreBrowserViewportActions {
  private readonly state: ExploreBrowserFacadeState;
  private readonly viewport: BrowserViewportPort;
  private readonly externalUrlOpener: ExternalUrlOpenerPort;
  private readonly loadSelectedTabUrl: (url: string) => Promise<void>;

  public constructor(params: ExploreBrowserViewportActionsParams) {
    this.state = params.state;
    this.viewport = params.viewport;
    this.externalUrlOpener = params.externalUrlOpener;
    this.loadSelectedTabUrl = params.loadSelectedTabUrl;
  }

  public async retryCurrentUrl(): Promise<{ readonly ok: boolean }> {
    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl === null) {
      return { ok: false };
    }

    await this.viewport.load(currentUrl);
    return { ok: true };
  }

  public async showViewport(rect: BrowserViewportRect): Promise<void> {
    if (this.state.readingModeActiveSignal()) {
      await this.viewport.hide();
      return;
    }

    await this.viewport.show(rect);
  }

  public async hideViewport(): Promise<void> {
    await this.viewport.hide();
  }

  public async closeBrowser(): Promise<void> {
    this.state.readingModeActiveSignal.set(false);
    this.state.readingArticleSignal.set(null);
    await this.viewport.hide();
  }

  public async stopOrReload(): Promise<void> {
    this.state.readingModeActiveSignal.set(false);
    this.state.readingArticleSignal.set(null);
    if (this.state.loadingSignal()) {
      await this.viewport.stop();
      this.state.loadingSignal.set(false);
      return;
    }

    await this.viewport.reload();
  }

  public async goBack(): Promise<BrowserHistoryNavigationResult> {
    this.state.readingModeActiveSignal.set(false);
    this.state.readingArticleSignal.set(null);
    if (this.canUseNativeBack()) {
      const result = await this.viewport.back();
      this.state.backNavigationState = recordNativeBackNavigation(
        this.state.backNavigationState,
        result.didNavigate,
      );

      return result;
    }

    const activeBackStack = this.state.activeBackStack();
    const backTarget = activeBackStack[activeBackStack.length - 1];
    if (backTarget === undefined) {
      return { didNavigate: false };
    }

    try {
      this.state.backNavigationState = recordFallbackBackNavigationAttempt(
        this.state.backNavigationState,
      );
      await this.loadSelectedTabUrl(backTarget);
      return { didNavigate: true };
    } catch (error) {
      this.state.backNavigationState = discardLatestBackNavigationAttempt(
        this.state.backNavigationState,
      );
      this.state.noticeSignal.set(
        browserNoticeForLoadFailure(this.loadFailureMessage(error), backTarget),
      );
      return { didNavigate: false };
    }
  }

  public async goForward(): Promise<void> {
    this.state.readingModeActiveSignal.set(false);
    this.state.readingArticleSignal.set(null);
    if (this.state.canGoForwardSignal()) {
      await this.viewport.forward();
    }
  }

  public async copyCurrentUrl(): Promise<void> {
    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl === null) {
      return;
    }

    await this.viewport.copyUrl(currentUrl);
    this.state.noticeSignal.set({
      kind: 'copied',
      message: 'URL copied.',
      url: currentUrl,
    });
  }

  public async openCurrentUrlExternally(): Promise<void> {
    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl === null) {
      return;
    }

    await this.externalUrlOpener.open(currentUrl);
  }

  private canUseNativeBack(): boolean {
    return canUseNativeBackNavigation(
      this.state.nativeCanGoBackSignal(),
      this.state.backNavigationState,
    );
  }

  private loadFailureMessage(error: unknown): string {
    /* istanbul ignore if */
    if (!(error instanceof Error)) {
      return 'Unknown error';
    }

    return error.message;
  }
}
