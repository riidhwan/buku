import { inject, Injectable, OnDestroy } from '@angular/core';
import { BrowserUrlPolicy } from './browser-url-policy';
import type { ReadingChapterDirection } from './explore-browser-reading-mode-policy';
import type {
  BrowserOpenResult,
  BrowserReadingChapterNavigationResult,
  BrowserReadingModeResult,
} from './explore-browser-results';
import { ExploreBrowserWorkflow } from './explore-browser-workflow';
import { ExploreReadingChapterNavigator } from './explore-reading-chapter-navigator';
import {
  BROWSER_SESSION_STORE,
  type BrowserSessionStorePort,
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
  private readonly workflow = new ExploreBrowserWorkflow({
    urlPolicy: inject(BrowserUrlPolicy),
    sessionStore: inject<BrowserSessionStorePort>(BROWSER_SESSION_STORE),
    viewport: inject<BrowserViewportPort>(BROWSER_VIEWPORT),
    externalUrlOpener: inject<ExternalUrlOpenerPort>(EXTERNAL_URL_OPENER),
    chapterNavigator: inject(ExploreReadingChapterNavigator),
  });

  public readonly inputValue = this.workflow.inputValue;
  public readonly currentUrl = this.workflow.currentUrl;
  public readonly tabs = this.workflow.tabs;
  public readonly activeTab = this.workflow.activeTab;
  public readonly recentTabs = this.workflow.recentTabs;
  public readonly lastUrl = this.workflow.lastUrl;
  public readonly loading = this.workflow.loading;
  public readonly canGoBack = this.workflow.canGoBack;
  public readonly canGoForward = this.workflow.canGoForward;
  public readonly validationError = this.workflow.validationError;
  public readonly notice = this.workflow.notice;
  public readonly readingModeActive = this.workflow.readingModeActive;
  public readonly readingArticle = this.workflow.readingArticle;
  public readonly chapterNavigationLoading = this.workflow.chapterNavigationLoading;
  public readonly isSecure = this.workflow.isSecure;
  public readonly isInsecure = this.workflow.isInsecure;

  public ngOnDestroy(): void {
    this.workflow.destroy();
  }

  public initialize(): Promise<void> {
    return this.workflow.initialize();
  }

  public updateInputValue(value: string): void {
    this.workflow.updateInputValue(value);
  }

  public openInput(): Promise<BrowserOpenResult> {
    return this.workflow.openInput();
  }

  public openInputInNewTab(): Promise<BrowserOpenResult> {
    return this.workflow.openInputInNewTab();
  }

  public resumeTab(tabId: string): Promise<BrowserOpenResult> {
    return this.workflow.resumeTab(tabId);
  }

  public resumeLastUrl(): Promise<BrowserOpenResult> {
    return this.workflow.resumeLastUrl();
  }

  public createBlankTab(): Promise<void> {
    return this.workflow.createBlankTab();
  }

  public selectTab(tabId: string): Promise<void> {
    return this.workflow.selectTab(tabId);
  }

  public closeTab(tabId: string): Promise<void> {
    return this.workflow.closeTab(tabId);
  }

  public retryCurrentUrl(): Promise<BrowserOpenResult> {
    return this.workflow.retryCurrentUrl();
  }

  public showViewport(rect: BrowserViewportRect): Promise<void> {
    return this.workflow.showViewport(rect);
  }

  public hideViewport(): Promise<void> {
    return this.workflow.hideViewport();
  }

  public closeBrowser(): Promise<void> {
    return this.workflow.closeBrowser();
  }

  public stopOrReload(): Promise<void> {
    return this.workflow.stopOrReload();
  }

  public goBack(): Promise<BrowserHistoryNavigationResult> {
    return this.workflow.goBack();
  }

  public goForward(): Promise<void> {
    return this.workflow.goForward();
  }

  public copyCurrentUrl(): Promise<void> {
    return this.workflow.copyCurrentUrl();
  }

  public openCurrentUrlExternally(): Promise<void> {
    return this.workflow.openCurrentUrlExternally();
  }

  public openReadingMode(): Promise<BrowserReadingModeResult> {
    return this.workflow.openReadingMode();
  }

  public closeReadingMode(): void {
    this.workflow.closeReadingMode();
  }

  public discardReadingMode(): void {
    this.workflow.discardReadingMode();
  }

  public rememberActiveTabLibrarySeriesTitle(title: string): Promise<void> {
    return this.workflow.rememberActiveTabLibrarySeriesTitle(title);
  }

  public openReadingModeLink(href: string): Promise<BrowserOpenResult> {
    return this.workflow.openReadingModeLink(href);
  }

  public navigateReadingChapter(
    direction: ReadingChapterDirection,
  ): Promise<BrowserReadingChapterNavigationResult> {
    return this.workflow.navigateReadingChapter(direction);
  }

  public dismissNotice(): void {
    this.workflow.dismissNotice();
  }
}
