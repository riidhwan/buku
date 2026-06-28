import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { filter, firstValueFrom, Subscription, take } from 'rxjs';
import { ReadingArticleSnapshot } from '../domain/reading-article';
import {
  browserNoticeForLoadFailure,
  browserNoticeForReadingModeResult,
  browserNoticeForUnsupportedCapability,
  readingChapterLinkForDirection,
  resolveReadingModeTargetUrl,
  type BrowserNotice,
  type BrowserNoticeKind,
  type ReadingChapterDirection,
} from './explore-browser-reading-mode-policy';
import {
  blankExploreBrowserTabSession,
  canUseNativeBackNavigation,
  commitExploreBrowserNavigation,
  createExploreBrowserTab,
  discardLatestBackNavigationAttempt,
  findExploreBrowserTab,
  initialExploreBrowserBackNavigationState,
  lastExploreBrowserUrl,
  recentExploreBrowserTabs,
  recordFallbackBackNavigationAttempt,
  recordNativeBackNavigation,
  rememberExploreBrowserTabLibrarySeriesTitle,
  resetExploreBrowserBackNavigationState,
  selectedTabIdForBrowserSession,
  type ExploreBrowserBackNavigationState,
} from './explore-browser-session-policy';
import { BrowserUrlPolicy } from './browser-url-policy';
import {
  BROWSER_SESSION_STORE,
  type BrowserSessionStorePort,
  type BrowserTabSession,
  type ExploreBrowserTab,
} from './ports/browser-session-store.port';
import {
  BROWSER_VIEWPORT,
  type BrowserHistoryNavigationResult,
  type BrowserViewportEvent,
  type BrowserViewportPort,
  type BrowserViewportRect,
} from './ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER, type ExternalUrlOpenerPort } from './ports/external-url-opener.port';

export type { BrowserNotice, BrowserNoticeKind, ReadingChapterDirection };

export interface BrowserOpenResult {
  readonly ok: boolean;
}

export interface BrowserReadingModeResult {
  readonly ok: boolean;
}

export type BrowserReadingChapterNavigationResult =
  | {
      readonly ok: true;
      readonly destination: 'reader' | 'browser';
    }
  | {
      readonly ok: false;
    };

@Injectable()
export class ExploreBrowserFacade implements OnDestroy {
  private readonly urlPolicy = inject(BrowserUrlPolicy);
  private readonly sessionStore = inject<BrowserSessionStorePort>(BROWSER_SESSION_STORE);
  private readonly viewport = inject<BrowserViewportPort>(BROWSER_VIEWPORT);
  private readonly externalUrlOpener = inject<ExternalUrlOpenerPort>(EXTERNAL_URL_OPENER);
  private readonly viewportSubscription: Subscription;

  private readonly inputValueSignal = signal('');
  private readonly currentUrlSignal = signal<string | null>(null);
  private readonly tabsSignal = signal<readonly ExploreBrowserTab[]>([]);
  private readonly selectedTabIdSignal = signal<string | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly nativeCanGoBackSignal = signal(false);
  private readonly canGoForwardSignal = signal(false);
  private readonly validationErrorSignal = signal<string | null>(null);
  private readonly noticeSignal = signal<BrowserNotice | null>(null);
  private readonly readingArticleSignal = signal<ReadingArticleSnapshot | null>(null);
  private readonly chapterNavigationLoadingSignal = signal(false);
  private backNavigationState: ExploreBrowserBackNavigationState =
    initialExploreBrowserBackNavigationState();

  public readonly inputValue = this.inputValueSignal.asReadonly();
  public readonly currentUrl = this.currentUrlSignal.asReadonly();
  public readonly tabs = this.tabsSignal.asReadonly();
  public readonly activeTab = computed(() => this.findActiveTab());
  public readonly recentTabs = computed(() => recentExploreBrowserTabs(this.tabsSignal()));
  public readonly lastUrl = computed(() => lastExploreBrowserUrl(this.tabsSignal()));
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly canGoBack = computed(
    () => this.activeBackStack().length > 0 || this.canUseNativeBack(),
  );
  public readonly canGoForward = this.canGoForwardSignal.asReadonly();
  public readonly validationError = this.validationErrorSignal.asReadonly();
  public readonly notice = this.noticeSignal.asReadonly();
  public readonly readingArticle = this.readingArticleSignal.asReadonly();
  public readonly chapterNavigationLoading = this.chapterNavigationLoadingSignal.asReadonly();
  public readonly isSecure = computed(
    () => this.currentUrlSignal()?.startsWith('https://') ?? false,
  );
  public readonly isInsecure = computed(
    () => this.currentUrlSignal()?.startsWith('http://') ?? false,
  );

  public constructor() {
    this.viewportSubscription = this.viewport.events$.subscribe((event) => {
      this.handleViewportEvent(event);
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
    this.inputValueSignal.set(value);
    this.validationErrorSignal.set(null);
  }

  public async openInput(): Promise<BrowserOpenResult> {
    return this.openRawValue(this.inputValueSignal(), 'active');
  }

  public async openInputInNewTab(): Promise<BrowserOpenResult> {
    return this.openRawValue(this.inputValueSignal(), 'new');
  }

  public async resumeTab(tabId: string): Promise<BrowserOpenResult> {
    const tab = this.tabsSignal().find((candidate) => candidate.id === tabId);
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
    this.tabsSignal.update((tabs) => [...tabs, tab]);
    this.selectedTabIdSignal.set(tab.id);
    await this.clearVisiblePageForBlankTab();
    await this.persistTabs();
  }

  public async selectTab(tabId: string): Promise<void> {
    const tab = this.tabsSignal().find((candidate) => candidate.id === tabId);
    if (tab === undefined) {
      return;
    }

    this.selectedTabIdSignal.set(tab.id);
    await this.persistTabs();
    if (tab.url === null) {
      await this.clearVisiblePageForBlankTab();
      return;
    }

    await this.loadSelectedTabUrl(tab.url);
  }

  public async closeTab(tabId: string): Promise<void> {
    const tabs = this.tabsSignal();
    const closedIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (closedIndex === -1) {
      return;
    }

    const wasSelected = this.selectedTabIdSignal() === tabId;
    const remainingTabs = tabs.filter((tab) => tab.id !== tabId);
    if (remainingTabs.length === 0) {
      this.replaceWithBlankTab();
      await this.clearVisiblePageForBlankTab();
      await this.persistTabs();
      return;
    }

    this.tabsSignal.set(remainingTabs);
    if (!wasSelected) {
      await this.persistTabs();
      return;
    }

    const nextIndex = Math.max(0, closedIndex - 1);
    const nextTab = remainingTabs[nextIndex];
    /* istanbul ignore if -- guarded by remaining tab length and bounded nextIndex. */
    if (nextTab === undefined) {
      return;
    }

    await this.selectTab(nextTab.id);
  }

  public async retryCurrentUrl(): Promise<BrowserOpenResult> {
    const currentUrl = this.currentUrlSignal();
    if (currentUrl === null) {
      return { ok: false };
    }

    await this.viewport.load(currentUrl);
    return { ok: true };
  }

  public async showViewport(rect: BrowserViewportRect): Promise<void> {
    await this.viewport.show(rect);
  }

  public async hideViewport(): Promise<void> {
    await this.viewport.hide();
  }

  public async closeBrowser(): Promise<void> {
    this.readingArticleSignal.set(null);
    await this.viewport.hide();
  }

  public async stopOrReload(): Promise<void> {
    if (this.loadingSignal()) {
      await this.viewport.stop();
      this.loadingSignal.set(false);
      return;
    }

    await this.viewport.reload();
  }

  public async goBack(): Promise<BrowserHistoryNavigationResult> {
    if (this.canUseNativeBack()) {
      const result = await this.viewport.back();
      this.backNavigationState = recordNativeBackNavigation(
        this.backNavigationState,
        result.didNavigate,
      );

      return result;
    }

    const activeBackStack = this.activeBackStack();
    const backTarget = activeBackStack[activeBackStack.length - 1];
    if (backTarget !== undefined) {
      try {
        this.backNavigationState = recordFallbackBackNavigationAttempt(this.backNavigationState);
        await this.loadSelectedTabUrl(backTarget);
        return { didNavigate: true };
      } catch (error) {
        this.backNavigationState = discardLatestBackNavigationAttempt(this.backNavigationState);
        const message = this.loadFailureMessage(error);
        this.noticeSignal.set(browserNoticeForLoadFailure(message, backTarget));
        return { didNavigate: false };
      }
    }

    return { didNavigate: false };
  }

  public async goForward(): Promise<void> {
    if (this.canGoForwardSignal()) {
      await this.viewport.forward();
    }
  }

  public async copyCurrentUrl(): Promise<void> {
    const currentUrl = this.currentUrlSignal();
    if (currentUrl === null) {
      return;
    }

    await this.viewport.copyUrl(currentUrl);
    this.noticeSignal.set({
      kind: 'copied',
      message: 'URL copied.',
      url: currentUrl,
    });
  }

  public async openCurrentUrlExternally(): Promise<void> {
    const currentUrl = this.currentUrlSignal();
    if (currentUrl === null) {
      return;
    }

    await this.externalUrlOpener.open(currentUrl);
  }

  public async openReadingMode(): Promise<BrowserReadingModeResult> {
    const currentUrl = this.currentUrlSignal();
    if (currentUrl === null || this.loadingSignal()) {
      return { ok: false };
    }

    const result = await this.viewport.extractArticle();
    switch (result.status) {
      case 'ok':
        this.readingArticleSignal.set(result.article);
        this.noticeSignal.set(null);
        await this.viewport.hide();
        return { ok: true };
      case 'unavailable':
      case 'failed':
        this.noticeSignal.set(browserNoticeForReadingModeResult(result, currentUrl));
        return { ok: false };
    }
  }

  public closeReadingMode(): void {
    this.readingArticleSignal.set(null);
  }

  public async rememberActiveTabLibrarySeriesTitle(title: string): Promise<void> {
    this.tabsSignal.set(
      rememberExploreBrowserTabLibrarySeriesTitle({
        tabs: this.tabsSignal(),
        selectedTabId: this.selectedTabIdSignal(),
        title,
      }),
    );
    await this.persistTabs();
  }

  public async openReadingModeLink(href: string): Promise<BrowserOpenResult> {
    const article = this.readingArticleSignal();
    if (article === null) {
      return { ok: false };
    }

    const targetUrl = resolveReadingModeTargetUrl(href, article.url, this.urlPolicy);
    if (!targetUrl.ok) {
      this.noticeSignal.set(targetUrl.notice);
      return { ok: false };
    }

    this.readingArticleSignal.set(null);
    await this.loadNormalizedUrl(targetUrl.url);
    return { ok: true };
  }

  public async navigateReadingChapter(
    direction: ReadingChapterDirection,
  ): Promise<BrowserReadingChapterNavigationResult> {
    const article = this.readingArticleSignal();
    if (article === null || this.loadingSignal() || this.chapterNavigationLoadingSignal()) {
      return { ok: false };
    }

    const chapter = readingChapterLinkForDirection(article, direction);
    if (chapter === undefined) {
      return { ok: false };
    }

    const targetUrl = resolveReadingModeTargetUrl(chapter.href, article.url, this.urlPolicy);
    if (!targetUrl.ok) {
      this.noticeSignal.set(targetUrl.notice);
      return { ok: false };
    }

    this.chapterNavigationLoadingSignal.set(true);
    try {
      const navigationResultPromise = this.waitForChapterNavigation();
      await this.viewport.load(targetUrl.url);
      const navigationResult = await navigationResultPromise;
      if (navigationResult === 'failed') {
        this.readingArticleSignal.set(null);
        return { ok: true, destination: 'browser' };
      }

      return await this.replaceReadingArticleFromCurrentPage(targetUrl.url);
    } catch (error) {
      this.readingArticleSignal.set(null);
      const message = this.loadFailureMessage(error);
      this.noticeSignal.set(browserNoticeForLoadFailure(message, targetUrl.url));
      return { ok: true, destination: 'browser' };
    } finally {
      this.chapterNavigationLoadingSignal.set(false);
    }
  }

  public dismissNotice(): void {
    this.noticeSignal.set(null);
  }

  private async openRawValue(value: string, target: 'active' | 'new'): Promise<BrowserOpenResult> {
    const normalized = this.urlPolicy.normalize(value);

    if (!normalized.ok) {
      this.validationErrorSignal.set(normalized.message);
      return { ok: false };
    }

    this.validationErrorSignal.set(null);
    if (target === 'new') {
      const tab = createExploreBrowserTab(null);
      this.tabsSignal.update((tabs) => [...tabs, tab]);
      this.selectedTabIdSignal.set(tab.id);
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
    this.inputValueSignal.set(url);
    this.currentUrlSignal.set(url);
    this.loadingSignal.set(true);
    await this.viewport.load(url);
  }

  private async clearVisiblePageForBlankTab(): Promise<void> {
    this.inputValueSignal.set('');
    this.currentUrlSignal.set(null);
    this.loadingSignal.set(false);
    this.nativeCanGoBackSignal.set(false);
    this.canGoForwardSignal.set(false);
    this.backNavigationState = resetExploreBrowserBackNavigationState();
    this.validationErrorSignal.set(null);
    await this.viewport.hide();
    await this.viewport.destroy();
  }

  private loadFailureMessage(error: unknown): string {
    /* istanbul ignore if */
    if (!(error instanceof Error)) {
      return 'Unknown error';
    }

    return error.message;
  }

  private waitForChapterNavigation(): Promise<'loaded' | 'failed'> {
    return firstValueFrom(
      this.viewport.events$.pipe(
        filter(
          (event) =>
            event.type === 'loadFailed' ||
            (event.type === 'navigation' && event.committed && !event.state.loading),
        ),
        take(1),
      ),
    ).then((event) => (event.type === 'loadFailed' ? 'failed' : 'loaded'));
  }

  private async replaceReadingArticleFromCurrentPage(
    fallbackUrl: string,
  ): Promise<BrowserReadingChapterNavigationResult> {
    const result = await this.viewport.extractArticle();
    switch (result.status) {
      case 'ok':
        this.readingArticleSignal.set(result.article);
        this.noticeSignal.set(null);
        await this.viewport.hide();
        return { ok: true, destination: 'reader' };
      case 'unavailable':
      case 'failed':
        this.readingArticleSignal.set(null);
        this.noticeSignal.set(browserNoticeForReadingModeResult(result, fallbackUrl));
        return { ok: true, destination: 'browser' };
    }
  }

  private handleViewportEvent(event: BrowserViewportEvent): void {
    switch (event.type) {
      case 'navigation':
        this.currentUrlSignal.set(event.state.url);
        this.inputValueSignal.set(event.state.url);
        this.loadingSignal.set(event.state.loading);
        this.nativeCanGoBackSignal.set(event.state.canGoBack);
        this.canGoForwardSignal.set(event.state.canGoForward);
        if (event.committed) {
          this.commitActiveTabUrl(event.state.url, event.state.title ?? null);
          void this.persistTabs();
        }
        break;
      case 'loadFailed':
        this.loadingSignal.set(false);
        this.noticeSignal.set(
          browserNoticeForLoadFailure(event.event.description, event.event.url),
        );
        break;
      case 'capabilityUnsupported':
        this.noticeSignal.set(
          browserNoticeForUnsupportedCapability(event.event.capability, event.event.url),
        );
        break;
    }
  }

  private applySession(session: BrowserTabSession): void {
    const selectedTabId = selectedTabIdForBrowserSession(session);
    this.tabsSignal.set(session.tabs);
    this.selectedTabIdSignal.set(selectedTabId);

    const activeTab = this.findActiveTab();
    /* istanbul ignore if -- selectedTabIdForSession always returns a tab from this session. */
    if (activeTab === null) {
      this.currentUrlSignal.set(null);
      this.inputValueSignal.set('');
      return;
    }

    this.currentUrlSignal.set(activeTab.url);
    this.inputValueSignal.set(activeTab.url ?? '');
  }

  private findActiveTab(): ExploreBrowserTab | null {
    return findExploreBrowserTab(this.tabsSignal(), this.selectedTabIdSignal());
  }

  private ensureActiveTab(): void {
    if (this.findActiveTab() !== null) {
      return;
    }

    this.replaceWithBlankTab();
  }

  private replaceWithBlankTab(): void {
    const session = blankExploreBrowserTabSession();
    this.tabsSignal.set(session.tabs);
    this.selectedTabIdSignal.set(session.selectedTabId);
    this.currentUrlSignal.set(null);
    this.inputValueSignal.set('');
  }

  private commitActiveTabUrl(url: string, title: string | null): void {
    const commit = commitExploreBrowserNavigation({
      tabs: this.tabsSignal(),
      selectedTabId: this.selectedTabIdSignal(),
      url,
      title,
      backNavigationState: this.backNavigationState,
    });
    this.tabsSignal.set(commit.tabs);
    this.backNavigationState = commit.backNavigationState;
  }

  private activeBackStack(): readonly string[] {
    return this.findActiveTab()?.backStack ?? [];
  }

  private canUseNativeBack(): boolean {
    return canUseNativeBackNavigation(this.nativeCanGoBackSignal(), this.backNavigationState);
  }

  private async persistTabs(): Promise<void> {
    await this.sessionStore.writeTabSession({
      tabs: this.tabsSignal(),
      selectedTabId: this.selectedTabIdSignal(),
    });
  }
}
