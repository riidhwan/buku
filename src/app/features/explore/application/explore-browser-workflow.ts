import { Subscription } from 'rxjs';
import type { BrowserUrlPolicy } from './browser-url-policy';
import {
  canUseNativeBackNavigation,
  discardLatestBackNavigationAttempt,
  initialExploreBrowserBackNavigationState,
  recordFallbackBackNavigationAttempt,
  recordNativeBackNavigation,
} from './explore-browser-back-navigation-policy';
import {
  browserNoticeForLoadFailure,
  browserNoticeForReadingModeResult,
} from './explore-browser-notice-policy';
import {
  resolveReadingModeTargetUrl,
  type ReadingChapterDirection,
} from './explore-browser-reading-mode-policy';
import type {
  BrowserOpenResult,
  BrowserReadingChapterNavigationResult,
  BrowserReadingModeResult,
} from './explore-browser-results';
import {
  closeExploreBrowserTab,
  selectExploreBrowserTab,
} from './explore-browser-tab-lifecycle-policy';
import {
  blankExploreBrowserTabSession,
  commitExploreBrowserNavigation,
  createExploreBrowserTab,
  rememberExploreBrowserTabLibrarySeriesTitle,
  selectedTabIdForBrowserSession,
} from './explore-browser-session-policy';
import { reduceBrowserViewportEvent } from './explore-browser-viewport-event-reducer';
import { ExploreBrowserWorkflowState } from './explore-browser-workflow-state';
import type { ExploreReadingChapterNavigator } from './explore-reading-chapter-navigator';
import type {
  BrowserSessionStorePort,
  BrowserTabSession,
} from './ports/browser-session-store.port';
import type {
  BrowserHistoryNavigationResult,
  BrowserViewportPort,
  BrowserViewportRect,
} from './ports/browser-viewport.port';
import type { ExternalUrlOpenerPort } from './ports/external-url-opener.port';

export interface ExploreBrowserWorkflowDependencies {
  readonly urlPolicy: BrowserUrlPolicy;
  readonly sessionStore: BrowserSessionStorePort;
  readonly viewport: BrowserViewportPort;
  readonly externalUrlOpener: ExternalUrlOpenerPort;
  readonly chapterNavigator: ExploreReadingChapterNavigator;
}

export class ExploreBrowserWorkflow {
  private readonly state = new ExploreBrowserWorkflowState();
  private readonly viewportSubscription: Subscription;

  public readonly inputValue = this.state.inputValue;
  public readonly currentUrl = this.state.currentUrl;
  public readonly tabs = this.state.tabs;
  public readonly activeTab = this.state.activeTab;
  public readonly recentTabs = this.state.recentTabs;
  public readonly lastUrl = this.state.lastUrl;
  public readonly loading = this.state.loading;
  public readonly canGoBack = this.state.canGoBack;
  public readonly canGoForward = this.state.canGoForward;
  public readonly validationError = this.state.validationError;
  public readonly notice = this.state.notice;
  public readonly secureNavigationFailure = this.state.secureNavigationFailure;
  public readonly readingModeActive = this.state.readingModeActive;
  public readonly readingArticle = this.state.readingArticle;
  public readonly chapterNavigationLoading = this.state.chapterNavigationLoading;
  public readonly isSecure = this.state.isSecure;
  public readonly isInsecure = this.state.isInsecure;

  public constructor(private readonly dependencies: ExploreBrowserWorkflowDependencies) {
    this.viewportSubscription = dependencies.viewport.events$.subscribe((event) => {
      const reduction = reduceBrowserViewportEvent(event);
      this.state.inputValueSignal.set(reduction.inputValue ?? this.state.inputValueSignal());
      this.state.currentUrlSignal.set(reduction.currentUrl ?? this.state.currentUrlSignal());
      this.state.loadingSignal.set(reduction.loading ?? this.state.loadingSignal());
      this.state.nativeCanGoBackSignal.set(
        reduction.nativeCanGoBack ?? this.state.nativeCanGoBackSignal(),
      );
      this.state.canGoForwardSignal.set(reduction.canGoForward ?? this.state.canGoForwardSignal());
      if (reduction.notice !== undefined) {
        this.state.noticeSignal.set(reduction.notice);
      }
      this.applySecureNavigationFailure(reduction.secureNavigationFailure);
      if (reduction.committedNavigation !== undefined) {
        if (this.shouldDiscardReadingModeForCommittedUrl(reduction.committedNavigation.url)) {
          this.discardReadingMode();
        }
        this.commitActiveTabUrl(
          reduction.committedNavigation.url,
          reduction.committedNavigation.title,
        );
        void this.persistTabs();
      }
    });
  }

  public destroy(): void {
    this.viewportSubscription.unsubscribe();
  }

  public async initialize(): Promise<void> {
    const session = await this.dependencies.sessionStore.readTabSession();
    if (session.tabs.length > 0) {
      this.applySession(session);
      await this.loadActiveTabUrl();
      return;
    }

    const legacyLastUrl = await this.dependencies.sessionStore.readLegacyLastUrl();
    if (legacyLastUrl !== null) {
      const tab = createExploreBrowserTab(legacyLastUrl);
      this.applySession({ tabs: [tab], selectedTabId: tab.id });
      await this.persistTabs();
      await this.loadActiveTabUrl();
      return;
    }

    this.replaceWithBlankTab();
  }

  public updateInputValue(value: string): void {
    this.state.inputValueSignal.set(value);
    this.state.validationErrorSignal.set(null);
  }

  public openInput(): Promise<BrowserOpenResult> {
    return this.openRawValue(this.state.inputValueSignal(), 'active');
  }

  public openInputInNewTab(): Promise<BrowserOpenResult> {
    return this.openRawValue(this.state.inputValueSignal(), 'new');
  }

  public async resumeTab(tabId: string): Promise<BrowserOpenResult> {
    const tab = this.state.tabsSignal().find((candidate) => candidate.id === tabId);
    if (tab?.url === undefined || tab.url === null) {
      return { ok: false };
    }

    await this.selectTab(tab.id);
    return { ok: true };
  }

  public async resumeLastUrl(): Promise<BrowserOpenResult> {
    const recentTabs = this.recentTabs();
    const lastTab = recentTabs[recentTabs.length - 1];
    return lastTab === undefined ? { ok: false } : this.resumeTab(lastTab.id);
  }

  public async createBlankTab(): Promise<void> {
    this.discardReadingMode();
    const tab = createExploreBrowserTab(null);
    this.state.tabsSignal.update((tabs) => [...tabs, tab]);
    this.state.selectedTabIdSignal.set(tab.id);
    await this.clearVisiblePageForBlankTab();
    await this.persistTabs();
  }

  public async selectTab(tabId: string): Promise<void> {
    const result = selectExploreBrowserTab({ tabs: this.state.tabsSignal(), tabId });
    if (result.status === 'missing') {
      return;
    }

    this.discardReadingMode();
    this.applySession(result.session);
    await this.persistTabs();
    if (result.status === 'blank') {
      await this.clearVisiblePageForBlankTab();
      return;
    }

    await this.loadSelectedTabUrl(result.url);
  }

  public async closeTab(tabId: string): Promise<void> {
    const result = closeExploreBrowserTab({
      tabs: this.state.tabsSignal(),
      selectedTabId: this.state.selectedTabIdSignal(),
      tabId,
    });

    if (result.status === 'missing') {
      return;
    }

    if (result.status !== 'closed-inactive') {
      this.discardReadingMode();
    }
    this.applySession(result.session);
    if (result.status === 'blank') {
      await this.clearVisiblePageForBlankTab();
      await this.persistTabs();
      return;
    }

    if (result.status === 'closed-inactive') {
      await this.persistTabs();
      return;
    }

    await this.persistTabs();
    if (result.url === null) {
      await this.clearVisiblePageForBlankTab();
      return;
    }

    await this.loadSelectedTabUrl(result.url);
  }

  public async retryCurrentUrl(): Promise<BrowserOpenResult> {
    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl === null) {
      return { ok: false };
    }

    this.state.secureNavigationFailureSignal.set(null);
    this.state.loadingSignal.set(true);
    await this.dependencies.viewport.load(currentUrl);
    return { ok: true };
  }

  public async showViewport(rect: BrowserViewportRect): Promise<void> {
    if (
      this.state.readingModeActiveSignal() ||
      this.state.secureNavigationFailureSignal() !== null
    ) {
      await this.dependencies.viewport.hide();
      return;
    }

    await this.dependencies.viewport.show(rect);
  }

  public hideViewport(): Promise<void> {
    return this.dependencies.viewport.hide();
  }

  public async closeBrowser(): Promise<void> {
    this.discardReadingMode();
    this.state.secureNavigationFailureSignal.set(null);
    await this.dependencies.viewport.hide();
  }

  public async stopOrReload(): Promise<void> {
    this.discardReadingMode();
    if (this.state.loadingSignal()) {
      await this.dependencies.viewport.stop();
      this.state.loadingSignal.set(false);
      return;
    }

    await this.dependencies.viewport.reload();
  }

  public async goBack(): Promise<BrowserHistoryNavigationResult> {
    this.discardReadingMode();
    if (this.state.secureNavigationFailureSignal() !== null) {
      this.state.secureNavigationFailureSignal.set(null);
      const committedUrl = this.state.findActiveTab()?.url ?? null;
      if (committedUrl === null) {
        await this.clearVisiblePageForBlankTab();
      } else {
        await this.loadSelectedTabUrl(committedUrl);
      }
      return { didNavigate: true };
    }
    if (this.canUseNativeBack()) {
      const result = await this.dependencies.viewport.back();
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
    this.discardReadingMode();
    if (this.state.canGoForwardSignal()) {
      await this.dependencies.viewport.forward();
    }
  }

  public async copyCurrentUrl(): Promise<void> {
    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl === null) {
      return;
    }

    await this.dependencies.viewport.copyUrl(currentUrl);
    this.state.noticeSignal.set({ kind: 'copied', message: 'URL copied.', url: currentUrl });
  }

  public async openCurrentUrlExternally(): Promise<void> {
    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl !== null) {
      await this.dependencies.externalUrlOpener.open(currentUrl);
    }
  }

  public async openSecureNavigationFailureExternally(): Promise<void> {
    const externalUrl = this.state.secureNavigationFailureSignal()?.externalUrl ?? null;
    if (externalUrl !== null) {
      await this.dependencies.externalUrlOpener.open(externalUrl);
    }
  }

  public async openReadingMode(): Promise<BrowserReadingModeResult> {
    if (this.state.readingModeActiveSignal()) {
      this.closeReadingMode();
      return { ok: true };
    }

    if (this.state.readingArticleSignal() !== null) {
      this.state.readingModeActiveSignal.set(true);
      await this.dependencies.viewport.hide();
      return { ok: true };
    }

    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl === null || this.state.loadingSignal()) {
      return { ok: false };
    }

    const result = await this.dependencies.viewport.extractArticle();
    switch (result.status) {
      case 'ok':
        this.state.readingArticleSignal.set(result.article);
        this.state.readingModeActiveSignal.set(true);
        this.state.noticeSignal.set(null);
        await this.dependencies.viewport.hide();
        return { ok: true };
      case 'unavailable':
      case 'failed':
        this.state.noticeSignal.set(browserNoticeForReadingModeResult(result, currentUrl));
        return { ok: false };
    }
  }

  public closeReadingMode(): void {
    this.state.readingModeActiveSignal.set(false);
  }

  public discardReadingMode(): void {
    this.state.readingModeActiveSignal.set(false);
    this.state.readingArticleSignal.set(null);
  }

  public async rememberActiveTabLibrarySeriesTitle(title: string): Promise<void> {
    this.state.tabsSignal.set(
      rememberExploreBrowserTabLibrarySeriesTitle({
        tabs: this.state.tabsSignal(),
        selectedTabId: this.state.selectedTabIdSignal(),
        title,
      }),
    );
    await this.persistTabs();
  }

  public async openReadingModeLink(href: string): Promise<BrowserOpenResult> {
    const article = this.state.readingArticleSignal();
    if (article === null) {
      return { ok: false };
    }

    const targetUrl = resolveReadingModeTargetUrl(href, article.url, this.dependencies.urlPolicy);
    if (!targetUrl.ok) {
      this.state.noticeSignal.set(targetUrl.notice);
      return { ok: false };
    }

    this.discardReadingMode();
    await this.loadNormalizedUrl(targetUrl.url);
    return { ok: true };
  }

  public async navigateReadingChapter(
    direction: ReadingChapterDirection,
  ): Promise<BrowserReadingChapterNavigationResult> {
    const article = this.state.readingArticleSignal();
    if (
      article === null ||
      this.state.loadingSignal() ||
      this.state.chapterNavigationLoadingSignal()
    ) {
      return { ok: false };
    }

    this.state.chapterNavigationLoadingSignal.set(true);
    try {
      const result = await this.dependencies.chapterNavigator.navigate(article, direction);
      if (!result.ok) {
        this.state.noticeSignal.set(result.notice);
        return { ok: false };
      }

      if (result.destination === 'reader') {
        this.state.readingArticleSignal.set(result.article);
        this.state.readingModeActiveSignal.set(true);
        this.state.noticeSignal.set(null);
        await this.dependencies.viewport.hide();
        return { ok: true, destination: 'reader' };
      }

      this.discardReadingMode();
      if (result.notice !== null) {
        this.state.noticeSignal.set(result.notice);
      }
      return { ok: true, destination: 'browser' };
    } finally {
      this.state.chapterNavigationLoadingSignal.set(false);
    }
  }

  public dismissNotice(): void {
    this.state.noticeSignal.set(null);
  }

  private async openRawValue(value: string, target: 'active' | 'new'): Promise<BrowserOpenResult> {
    const normalized = this.dependencies.urlPolicy.normalize(value);
    if (!normalized.ok) {
      this.state.validationErrorSignal.set(normalized.message);
      return { ok: false };
    }

    this.state.validationErrorSignal.set(null);
    this.discardReadingMode();
    if (target === 'new') {
      const tab = createExploreBrowserTab(null);
      this.state.tabsSignal.update((tabs) => [...tabs, tab]);
      this.state.selectedTabIdSignal.set(tab.id);
    } else {
      this.ensureActiveTab();
    }

    await this.loadSelectedTabUrl(normalized.url);
    return { ok: true };
  }

  private async loadNormalizedUrl(url: string): Promise<void> {
    this.ensureActiveTab();
    await this.loadSelectedTabUrl(url);
  }

  private async loadSelectedTabUrl(url: string): Promise<void> {
    this.state.secureNavigationFailureSignal.set(null);
    this.state.readingModeActiveSignal.set(false);
    this.state.inputValueSignal.set(url);
    this.state.currentUrlSignal.set(url);
    this.state.loadingSignal.set(true);
    await this.dependencies.viewport.load(url);
  }

  private async loadActiveTabUrl(): Promise<void> {
    const url = this.state.findActiveTab()?.url ?? null;
    if (url !== null) {
      await this.loadSelectedTabUrl(url);
    }
  }

  private async clearVisiblePageForBlankTab(): Promise<void> {
    this.discardReadingMode();
    this.state.inputValueSignal.set('');
    this.state.currentUrlSignal.set(null);
    this.state.loadingSignal.set(false);
    this.state.nativeCanGoBackSignal.set(false);
    this.state.canGoForwardSignal.set(false);
    this.state.backNavigationState = initialExploreBrowserBackNavigationState();
    this.state.validationErrorSignal.set(null);
    this.state.secureNavigationFailureSignal.set(null);
    await this.dependencies.viewport.hide();
    await this.dependencies.viewport.destroy();
  }

  private applySession(session: BrowserTabSession): void {
    this.state.secureNavigationFailureSignal.set(null);
    const selectedTabId = selectedTabIdForBrowserSession(session);
    this.state.tabsSignal.set(session.tabs);
    this.state.selectedTabIdSignal.set(selectedTabId);

    const activeTab = this.state.findActiveTab();
    /* istanbul ignore if -- selectedTabIdForBrowserSession always returns a tab from this session. */
    if (activeTab === null) {
      this.state.currentUrlSignal.set(null);
      this.state.inputValueSignal.set('');
      return;
    }

    this.state.currentUrlSignal.set(activeTab.url);
    this.state.inputValueSignal.set(activeTab.url ?? '');
  }

  private ensureActiveTab(): void {
    if (this.state.findActiveTab() === null) {
      this.replaceWithBlankTab();
    }
  }

  private replaceWithBlankTab(): void {
    this.discardReadingMode();
    const session = blankExploreBrowserTabSession();
    this.state.tabsSignal.set(session.tabs);
    this.state.selectedTabIdSignal.set(session.selectedTabId);
    this.state.currentUrlSignal.set(null);
    this.state.inputValueSignal.set('');
    this.state.secureNavigationFailureSignal.set(null);
  }

  private commitActiveTabUrl(url: string, title: string | null): void {
    const commit = commitExploreBrowserNavigation({
      tabs: this.state.tabsSignal(),
      selectedTabId: this.state.selectedTabIdSignal(),
      url,
      title,
      backNavigationState: this.state.backNavigationState,
    });
    this.state.tabsSignal.set(commit.tabs);
    this.state.backNavigationState = commit.backNavigationState;
  }

  private shouldDiscardReadingModeForCommittedUrl(url: string): boolean {
    const article = this.state.readingArticleSignal();
    return article !== null && article.url !== url;
  }

  private canUseNativeBack(): boolean {
    return canUseNativeBackNavigation(
      this.state.nativeCanGoBackSignal(),
      this.state.backNavigationState,
    );
  }

  private async persistTabs(): Promise<void> {
    await this.dependencies.sessionStore.writeTabSession({
      tabs: this.state.tabsSignal(),
      selectedTabId: this.state.selectedTabIdSignal(),
    });
  }

  private applySecureNavigationFailure(
    failure: ReturnType<typeof reduceBrowserViewportEvent>['secureNavigationFailure'],
  ): void {
    if (failure === undefined) {
      return;
    }

    this.state.secureNavigationFailureSignal.set(failure);
    if (failure !== null) {
      void this.dependencies.viewport.hide();
    }
  }

  private loadFailureMessage(error: unknown): string {
    /* istanbul ignore if */
    if (!(error instanceof Error)) {
      return 'Unknown error';
    }

    return error.message;
  }
}
