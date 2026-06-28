import type { BrowserUrlPolicy } from './browser-url-policy';
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
import type { ExploreBrowserFacadeState } from './explore-browser.facade-state';
import type { ExploreReadingChapterNavigator } from './explore-reading-chapter-navigator';
import type { BrowserViewportPort } from './ports/browser-viewport.port';

interface ExploreReadingModeActionsParams {
  readonly state: ExploreBrowserFacadeState;
  readonly viewport: BrowserViewportPort;
  readonly urlPolicy: BrowserUrlPolicy;
  readonly chapterNavigator: ExploreReadingChapterNavigator;
  readonly loadNormalizedUrl: (url: string) => Promise<void>;
}

export class ExploreReadingModeActions {
  private readonly state: ExploreBrowserFacadeState;
  private readonly viewport: BrowserViewportPort;
  private readonly urlPolicy: BrowserUrlPolicy;
  private readonly chapterNavigator: ExploreReadingChapterNavigator;
  private readonly loadNormalizedUrl: (url: string) => Promise<void>;

  public constructor(params: ExploreReadingModeActionsParams) {
    this.state = params.state;
    this.viewport = params.viewport;
    this.urlPolicy = params.urlPolicy;
    this.chapterNavigator = params.chapterNavigator;
    this.loadNormalizedUrl = params.loadNormalizedUrl;
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
}
