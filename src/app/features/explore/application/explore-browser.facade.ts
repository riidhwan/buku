import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { filter, firstValueFrom, Subscription, take } from 'rxjs';
import { ReadingArticleSnapshot, ReadingChapterLink } from '../domain/reading-article';
import { BrowserUrlPolicy } from './browser-url-policy';
import {
  BROWSER_SESSION_STORE,
  BrowserSessionStorePort,
  BrowserTabSession,
  ExploreBrowserTab,
} from './ports/browser-session-store.port';
import {
  BROWSER_VIEWPORT,
  BrowserArticleExtractionResult,
  BrowserCapability,
  BrowserHistoryNavigationResult,
  BrowserViewportEvent,
  BrowserViewportPort,
  BrowserViewportRect,
} from './ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER, ExternalUrlOpenerPort } from './ports/external-url-opener.port';

export type BrowserNoticeKind =
  | 'loadFailed'
  | 'unsupportedCapability'
  | 'copied'
  | 'readingModeUnavailable'
  | 'readingModeFailed';

export interface BrowserNotice {
  readonly kind: BrowserNoticeKind;
  readonly message: string;
  readonly url: string | null;
}

export interface BrowserOpenResult {
  readonly ok: boolean;
}

export interface BrowserReadingModeResult {
  readonly ok: boolean;
}

export type ReadingChapterDirection = 'previous' | 'next';

export type BrowserReadingChapterNavigationResult =
  | {
      readonly ok: true;
      readonly destination: 'reader' | 'browser';
    }
  | {
      readonly ok: false;
    };

const capabilityMessages: Record<BrowserCapability, string> = {
  camera: 'Camera access is not supported in Explore Browser.',
  customScheme: 'This link type is not supported in Explore Browser.',
  download: 'Downloads are not supported in Explore Browser.',
  fileUpload: 'File upload is not supported in Explore Browser.',
  geolocation: 'Location access is not supported in Explore Browser.',
  microphone: 'Microphone access is not supported in Explore Browser.',
  newWindow: 'Pop-up windows are opened in the current Explore Browser session when possible.',
  unknown: 'This page requested something Explore Browser does not support.',
};
const maxBackStackEntries = 25;
type PendingBackNavigationKind = 'native' | 'fallback';

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
  private readonly pendingBackNavigationKinds: PendingBackNavigationKind[] = [];
  private fallbackBackCreatedNativeHistory = false;

  public readonly inputValue = this.inputValueSignal.asReadonly();
  public readonly currentUrl = this.currentUrlSignal.asReadonly();
  public readonly tabs = this.tabsSignal.asReadonly();
  public readonly activeTab = computed(() => this.findActiveTab());
  public readonly recentTabs = computed(() => this.tabsSignal().filter((tab) => tab.url !== null));
  public readonly lastUrl = computed(() => {
    const recentTabs = this.recentTabs();
    if (recentTabs.length === 0) {
      return null;
    }

    const lastTab = recentTabs[recentTabs.length - 1];
    /* istanbul ignore if -- guarded by the length check above. */
    if (lastTab === undefined) {
      return null;
    }

    return lastTab.url;
  });
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
      const tab = this.createTab(legacyLastUrl);
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
    const tab = this.createTab(null);
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
      if (result.didNavigate) {
        this.pendingBackNavigationKinds.push('native');
      }

      return result;
    }

    const activeBackStack = this.activeBackStack();
    const backTarget = activeBackStack[activeBackStack.length - 1];
    if (backTarget !== undefined) {
      try {
        this.pendingBackNavigationKinds.push('fallback');
        await this.loadSelectedTabUrl(backTarget);
        return { didNavigate: true };
      } catch (error) {
        this.pendingBackNavigationKinds.pop();
        const message = this.loadFailureMessage(error);
        this.noticeSignal.set({
          kind: 'loadFailed',
          message: `Page failed to load: ${message}`,
          url: backTarget,
        });
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
        this.noticeSignal.set({
          kind: 'readingModeUnavailable',
          message: 'Reading Mode is not available for this page.',
          url: currentUrl,
        });
        return { ok: false };
      case 'failed':
        this.noticeSignal.set({
          kind: 'readingModeFailed',
          message: `Reading Mode failed: ${result.message}`,
          url: currentUrl,
        });
        return { ok: false };
    }
  }

  public closeReadingMode(): void {
    this.readingArticleSignal.set(null);
  }

  public async openReadingModeLink(href: string): Promise<BrowserOpenResult> {
    const article = this.readingArticleSignal();
    if (article === null) {
      return { ok: false };
    }

    let targetUrl: string;
    try {
      targetUrl = new URL(href, article.url).toString();
    } catch (_error) {
      this.noticeSignal.set({
        kind: 'unsupportedCapability',
        message: capabilityMessages.customScheme,
        url: article.url,
      });
      return { ok: false };
    }

    const normalized = this.urlPolicy.normalize(targetUrl);
    if (!normalized.ok) {
      this.noticeSignal.set({
        kind: 'unsupportedCapability',
        message: normalized.message,
        url: article.url,
      });
      return { ok: false };
    }

    this.readingArticleSignal.set(null);
    await this.loadNormalizedUrl(normalized.url);
    return { ok: true };
  }

  public async navigateReadingChapter(
    direction: ReadingChapterDirection,
  ): Promise<BrowserReadingChapterNavigationResult> {
    const article = this.readingArticleSignal();
    if (article === null || this.loadingSignal() || this.chapterNavigationLoadingSignal()) {
      return { ok: false };
    }

    const chapter = this.chapterLinkForDirection(article, direction);
    if (chapter === undefined) {
      return { ok: false };
    }

    const targetUrl = this.resolveReadingModeHref(chapter.href, article.url);
    if (targetUrl === null) {
      this.noticeSignal.set({
        kind: 'unsupportedCapability',
        message: capabilityMessages.customScheme,
        url: article.url,
      });
      return { ok: false };
    }

    const normalized = this.urlPolicy.normalize(targetUrl);
    if (!normalized.ok) {
      this.noticeSignal.set({
        kind: 'unsupportedCapability',
        message: normalized.message,
        url: article.url,
      });
      return { ok: false };
    }

    this.chapterNavigationLoadingSignal.set(true);
    try {
      const navigationResultPromise = this.waitForChapterNavigation();
      await this.viewport.load(normalized.url);
      const navigationResult = await navigationResultPromise;
      if (navigationResult === 'failed') {
        this.readingArticleSignal.set(null);
        return { ok: true, destination: 'browser' };
      }

      return await this.replaceReadingArticleFromCurrentPage(normalized.url);
    } catch (error) {
      this.readingArticleSignal.set(null);
      const message = this.loadFailureMessage(error);
      this.noticeSignal.set({
        kind: 'loadFailed',
        message: `Page failed to load: ${message}`,
        url: normalized.url,
      });
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
      const tab = this.createTab(null);
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
    this.fallbackBackCreatedNativeHistory = false;
    this.validationErrorSignal.set(null);
    await this.viewport.hide();
    await this.viewport.destroy();
  }

  private chapterLinkForDirection(
    article: ReadingArticleSnapshot,
    direction: ReadingChapterDirection,
  ): ReadingChapterLink | undefined {
    return direction === 'previous' ? article.previousChapter : article.nextChapter;
  }

  private resolveReadingModeHref(href: string, baseUrl: string): string | null {
    try {
      return new URL(href, baseUrl).toString();
    } catch (_error) {
      return null;
    }
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
        this.noticeSignal.set(this.toReadingModeNotice(result, fallbackUrl));
        return { ok: true, destination: 'browser' };
    }
  }

  private toReadingModeNotice(
    result: Exclude<BrowserArticleExtractionResult, { readonly status: 'ok' }>,
    url: string,
  ): BrowserNotice {
    if (result.status === 'unavailable') {
      return {
        kind: 'readingModeUnavailable',
        message: 'Reading Mode is not available for this page.',
        url,
      };
    }

    return {
      kind: 'readingModeFailed',
      message: `Reading Mode failed: ${result.message}`,
      url,
    };
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
          this.commitActiveTabUrl(event.state.url);
          void this.persistTabs();
        }
        break;
      case 'loadFailed':
        this.loadingSignal.set(false);
        this.noticeSignal.set({
          kind: 'loadFailed',
          message: `Page failed to load: ${event.event.description}`,
          url: event.event.url,
        });
        break;
      case 'capabilityUnsupported':
        this.noticeSignal.set({
          kind: 'unsupportedCapability',
          message: capabilityMessages[event.event.capability],
          url: event.event.url,
        });
        break;
    }
  }

  private applySession(session: BrowserTabSession): void {
    const selectedTabId = this.selectedTabIdForSession(session);
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

  private selectedTabIdForSession(session: BrowserTabSession): string {
    const selectedTabId = session.selectedTabId;
    if (selectedTabId !== null && session.tabs.some((tab) => tab.id === selectedTabId)) {
      return selectedTabId;
    }

    const firstTab = session.tabs[0];
    /* istanbul ignore if -- initialize only applies non-empty persisted sessions. */
    if (firstTab === undefined) {
      throw new Error('Cannot select a tab from an empty session.');
    }

    return firstTab.id;
  }

  private findActiveTab(): ExploreBrowserTab | null {
    const selectedTabId = this.selectedTabIdSignal();
    if (selectedTabId === null) {
      return null;
    }

    const tab = this.tabsSignal().find((candidate) => candidate.id === selectedTabId);
    /* istanbul ignore next -- selected ids are maintained through facade tab commands. */
    return tab ?? null;
  }

  private ensureActiveTab(): void {
    if (this.findActiveTab() !== null) {
      return;
    }

    this.replaceWithBlankTab();
  }

  private replaceWithBlankTab(): void {
    const tab = this.createTab(null);
    this.tabsSignal.set([tab]);
    this.selectedTabIdSignal.set(tab.id);
    this.currentUrlSignal.set(null);
    this.inputValueSignal.set('');
  }

  private commitActiveTabUrl(url: string): void {
    const selectedTabId = this.selectedTabIdSignal();
    if (selectedTabId === null) {
      return;
    }

    const pendingBackNavigationKind = this.pendingBackNavigationKinds.shift();
    if (pendingBackNavigationKind !== undefined) {
      if (pendingBackNavigationKind === 'fallback') {
        this.fallbackBackCreatedNativeHistory = true;
      }

      this.popActiveBackStackForCommittedUrl(url);
      return;
    }

    const previousUrl = this.findActiveTab()?.url ?? null;
    this.tabsSignal.update((tabs) =>
      tabs.map((tab) =>
        tab.id === selectedTabId
          ? {
              ...tab,
              url,
              backStack: this.stackWithPreviousUrl(tab.backStack, previousUrl, url),
            }
          : tab,
      ),
    );
  }

  private popActiveBackStackForCommittedUrl(url: string): void {
    const selectedTabId = this.selectedTabIdSignal();
    if (selectedTabId === null) {
      return;
    }

    this.tabsSignal.update((tabs) =>
      tabs.map((tab) =>
        tab.id === selectedTabId
          ? {
              ...tab,
              url,
              backStack: tab.backStack.slice(0, -1),
            }
          : tab,
      ),
    );
  }

  private stackWithPreviousUrl(
    backStack: readonly string[],
    previousUrl: string | null,
    committedUrl: string,
  ): readonly string[] {
    if (previousUrl === null || previousUrl === committedUrl) {
      return backStack;
    }

    const lastEntry = backStack[backStack.length - 1];
    if (lastEntry === previousUrl) {
      return backStack;
    }

    return [...backStack, previousUrl].slice(-maxBackStackEntries);
  }

  private activeBackStack(): readonly string[] {
    return this.findActiveTab()?.backStack ?? [];
  }

  private canUseNativeBack(): boolean {
    return this.nativeCanGoBackSignal() && !this.fallbackBackCreatedNativeHistory;
  }

  private createTab(url: string | null): ExploreBrowserTab {
    return {
      id: `explore-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      url,
      backStack: [],
    };
  }

  private async persistTabs(): Promise<void> {
    await this.sessionStore.writeTabSession({
      tabs: this.tabsSignal(),
      selectedTabId: this.selectedTabIdSignal(),
    });
  }
}
