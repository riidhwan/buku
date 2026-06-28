import { inject, Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  type ReadingChapterDirection,
  browserNoticeForReadingModeResult,
  resolveReadingModeTargetUrl,
} from './explore-browser-reading-mode-policy';
import type {
  BrowserOpenResult,
  BrowserReadingChapterNavigationResult,
  BrowserReadingModeResult,
} from './explore-browser-results';
import { reduceBrowserViewportEvent } from './explore-browser-viewport-event-reducer';
import { ExploreBrowserViewportActions } from './explore-browser-viewport-actions';
import { ExploreBrowserFacadeState } from './explore-browser.facade-state';
import { ExploreReadingChapterNavigator } from './explore-reading-chapter-navigator';
import {
  closeExploreBrowserTab,
  selectExploreBrowserTab,
} from './explore-browser-tab-lifecycle-policy';
import { initialExploreBrowserBackNavigationState } from './explore-browser-back-navigation-policy';
import {
  blankExploreBrowserTabSession,
  commitExploreBrowserNavigation,
  createExploreBrowserTab,
  rememberExploreBrowserTabLibrarySeriesTitle,
  selectedTabIdForBrowserSession,
} from './explore-browser-session-policy';
import { BrowserUrlPolicy } from './browser-url-policy';
import {
  BROWSER_SESSION_STORE,
  type BrowserSessionStorePort,
  type BrowserTabSession,
} from './ports/browser-session-store.port';
import {
  BROWSER_VIEWPORT,
  type BrowserHistoryNavigationResult,
  type BrowserViewportPort,
  type BrowserViewportRect,
} from './ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER, type ExternalUrlOpenerPort } from './ports/external-url-opener.port';

@Injectable()
export class ExploreBrowserFacade implements OnDestroy {
  private readonly urlPolicy = inject(BrowserUrlPolicy);
  private readonly sessionStore = inject<BrowserSessionStorePort>(BROWSER_SESSION_STORE);
  private readonly viewport = inject<BrowserViewportPort>(BROWSER_VIEWPORT);
  private readonly externalUrlOpener = inject<ExternalUrlOpenerPort>(EXTERNAL_URL_OPENER);
  private readonly chapterNavigator = inject(ExploreReadingChapterNavigator);
  private readonly state = new ExploreBrowserFacadeState();
  private readonly viewportActions = new ExploreBrowserViewportActions({
    state: this.state,
    viewport: this.viewport,
    externalUrlOpener: this.externalUrlOpener,
    loadSelectedTabUrl: (url) => this.loadSelectedTabUrl(url),
  });
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
  public readonly readingArticle = this.state.readingArticle;
  public readonly chapterNavigationLoading = this.state.chapterNavigationLoading;
  public readonly isSecure = this.state.isSecure;
  public readonly isInsecure = this.state.isInsecure;

  public constructor() {
    this.viewportSubscription = this.viewport.events$.subscribe((event) => {
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
      if (reduction.committedNavigation !== undefined) {
        this.commitActiveTabUrl(
          reduction.committedNavigation.url,
          reduction.committedNavigation.title,
        );
        void this.persistTabs();
      }
    });
  }

  public ngOnDestroy(): void {
    this.viewportSubscription.unsubscribe();
  }

  public async initialize(): Promise<void> {
    const session = await this.sessionStore.readTabSession();
    if (session.tabs.length > 0) {
      this.applySession(session);
      return;
    }

    const legacyLastUrl = await this.sessionStore.readLegacyLastUrl();
    if (legacyLastUrl !== null) {
      const tab = createExploreBrowserTab(legacyLastUrl);
      this.applySession({ tabs: [tab], selectedTabId: tab.id });
      await this.persistTabs();
      return;
    }

    this.replaceWithBlankTab();
  }

  public updateInputValue(value: string): void {
    this.state.inputValueSignal.set(value);
    this.state.validationErrorSignal.set(null);
  }

  public async openInput(): Promise<BrowserOpenResult> {
    return this.openRawValue(this.state.inputValueSignal(), 'active');
  }

  public async openInputInNewTab(): Promise<BrowserOpenResult> {
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
    if (lastTab === undefined) {
      return { ok: false };
    }

    return this.resumeTab(lastTab.id);
  }

  public async createBlankTab(): Promise<void> {
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
    return this.viewportActions.retryCurrentUrl();
  }

  public async showViewport(rect: BrowserViewportRect): Promise<void> {
    await this.viewportActions.showViewport(rect);
  }

  public async hideViewport(): Promise<void> {
    await this.viewportActions.hideViewport();
  }

  public async closeBrowser(): Promise<void> {
    await this.viewportActions.closeBrowser();
  }

  public async stopOrReload(): Promise<void> {
    await this.viewportActions.stopOrReload();
  }

  public async goBack(): Promise<BrowserHistoryNavigationResult> {
    return this.viewportActions.goBack();
  }

  public async goForward(): Promise<void> {
    await this.viewportActions.goForward();
  }

  public async copyCurrentUrl(): Promise<void> {
    await this.viewportActions.copyCurrentUrl();
  }

  public async openCurrentUrlExternally(): Promise<void> {
    await this.viewportActions.openCurrentUrlExternally();
  }

  public async openReadingMode(): Promise<BrowserReadingModeResult> {
    const currentUrl = this.state.currentUrlSignal();
    if (currentUrl === null || this.state.loadingSignal()) {
      return { ok: false };
    }

    const result = await this.viewport.extractArticle();
    switch (result.status) {
      case 'ok':
        this.state.readingArticleSignal.set(result.article);
        this.state.noticeSignal.set(null);
        await this.viewport.hide();
        return { ok: true };
      case 'unavailable':
      case 'failed':
        this.state.noticeSignal.set(browserNoticeForReadingModeResult(result, currentUrl));
        return { ok: false };
    }
  }

  public closeReadingMode(): void {
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

    const targetUrl = resolveReadingModeTargetUrl(href, article.url, this.urlPolicy);
    if (!targetUrl.ok) {
      this.state.noticeSignal.set(targetUrl.notice);
      return { ok: false };
    }

    this.state.readingArticleSignal.set(null);
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
      const result = await this.chapterNavigator.navigate(article, direction);
      if (!result.ok) {
        this.state.noticeSignal.set(result.notice);
        return { ok: false };
      }

      if (result.destination === 'reader') {
        this.state.readingArticleSignal.set(result.article);
        this.state.noticeSignal.set(null);
        await this.viewport.hide();
        return { ok: true, destination: 'reader' };
      }

      this.state.readingArticleSignal.set(null);
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
    const normalized = this.urlPolicy.normalize(value);

    if (!normalized.ok) {
      this.state.validationErrorSignal.set(normalized.message);
      return { ok: false };
    }

    this.state.validationErrorSignal.set(null);
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
    this.state.inputValueSignal.set(url);
    this.state.currentUrlSignal.set(url);
    this.state.loadingSignal.set(true);
    await this.viewport.load(url);
  }

  private async clearVisiblePageForBlankTab(): Promise<void> {
    this.state.inputValueSignal.set('');
    this.state.currentUrlSignal.set(null);
    this.state.loadingSignal.set(false);
    this.state.nativeCanGoBackSignal.set(false);
    this.state.canGoForwardSignal.set(false);
    this.state.backNavigationState = initialExploreBrowserBackNavigationState();
    this.state.validationErrorSignal.set(null);
    await this.viewport.hide();
    await this.viewport.destroy();
  }

  private applySession(session: BrowserTabSession): void {
    const selectedTabId = selectedTabIdForBrowserSession(session);
    this.state.tabsSignal.set(session.tabs);
    this.state.selectedTabIdSignal.set(selectedTabId);

    const activeTab = this.state.findActiveTab();
    /* istanbul ignore if -- selectedTabIdForSession always returns a tab from this session. */
    if (activeTab === null) {
      this.state.currentUrlSignal.set(null);
      this.state.inputValueSignal.set('');
      return;
    }

    this.state.currentUrlSignal.set(activeTab.url);
    this.state.inputValueSignal.set(activeTab.url ?? '');
  }

  private ensureActiveTab(): void {
    if (this.state.findActiveTab() !== null) {
      return;
    }

    this.replaceWithBlankTab();
  }

  private replaceWithBlankTab(): void {
    const session = blankExploreBrowserTabSession();
    this.state.tabsSignal.set(session.tabs);
    this.state.selectedTabIdSignal.set(session.selectedTabId);
    this.state.currentUrlSignal.set(null);
    this.state.inputValueSignal.set('');
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

  private async persistTabs(): Promise<void> {
    await this.sessionStore.writeTabSession({
      tabs: this.state.tabsSignal(),
      selectedTabId: this.state.selectedTabIdSignal(),
    });
  }
}
