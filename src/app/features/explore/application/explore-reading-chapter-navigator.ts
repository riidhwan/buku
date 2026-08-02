import { inject, Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReadingArticleSnapshot } from '../domain/reading-article';
import { BrowserUrlPolicy } from './browser-url-policy';
import {
  browserNoticeForLoadFailure,
  browserNoticeForReadingModeResult,
  type BrowserNotice,
} from './explore-browser-notice-policy';
import {
  readingChapterLinkForDirection,
  resolveReadingModeTargetUrl,
  type ReadingChapterDirection,
} from './explore-browser-reading-mode-policy';
import { ManualChapterNavigationRuleWorkflow } from './manual-chapter-navigation-rule-workflow';
import { BROWSER_VIEWPORT, type BrowserViewportPort } from './ports/browser-viewport.port';
import type { BrowserViewportExtractArticleOptions } from './ports/browser-viewport.port';

type BrowserArticleExtractionResult = Awaited<ReturnType<BrowserViewportPort['extractArticle']>>;
type BrowserArticleExtractionSuccess = Extract<BrowserArticleExtractionResult, { status: 'ok' }>;

const MANUAL_CHAPTER_NAVIGATION_RETRY_DELAY_MS = 150;
const MANUAL_CHAPTER_NAVIGATION_SETTLE_DELAY_MS = 250;

export type ReadingChapterNavigationResult =
  | {
      readonly ok: true;
      readonly destination: 'reader';
      readonly article: ReadingArticleSnapshot;
    }
  | {
      readonly ok: true;
      readonly destination: 'browser';
      readonly notice: BrowserNotice | null;
    }
  | {
      readonly ok: false;
      readonly notice: BrowserNotice | null;
    };

@Injectable()
export class ExploreReadingChapterNavigator {
  private readonly urlPolicy = inject(BrowserUrlPolicy);
  private readonly viewport = inject<BrowserViewportPort>(BROWSER_VIEWPORT);
  private readonly manualChapterNavigation = inject(ManualChapterNavigationRuleWorkflow);

  public async navigate(
    article: ReadingArticleSnapshot,
    direction: ReadingChapterDirection,
  ): Promise<ReadingChapterNavigationResult> {
    const chapter = readingChapterLinkForDirection(article, direction);
    if (chapter === undefined) {
      return { ok: false, notice: null };
    }

    const targetUrl = resolveReadingModeTargetUrl(chapter.href, article.url, this.urlPolicy);
    if (!targetUrl.ok) {
      return { ok: false, notice: targetUrl.notice };
    }

    try {
      const navigationResultPromise = this.waitForChapterNavigation();
      await this.viewport.load(targetUrl.url);
      const navigationResult = await navigationResultPromise;
      if (navigationResult.status === 'failed') {
        return { ok: true, destination: 'browser', notice: null };
      }

      return await this.articleFromCurrentPage(navigationResult.url);
    } catch (error) {
      return {
        ok: true,
        destination: 'browser',
        notice: browserNoticeForLoadFailure(this.loadFailureMessage(error), targetUrl.url),
      };
    }
  }

  private waitForChapterNavigation(): Promise<
    { readonly status: 'loaded'; readonly url: string } | { readonly status: 'failed' }
  > {
    return new Promise<
      { readonly status: 'loaded'; readonly url: string } | { readonly status: 'failed' }
    >((resolve) => {
      let subscription: Subscription | null = null;
      let settleTimeout: ReturnType<typeof globalThis.setTimeout> | null = null;

      const finish = (
        result: { readonly status: 'loaded'; readonly url: string } | { readonly status: 'failed' },
      ): void => {
        if (settleTimeout !== null) {
          globalThis.clearTimeout(settleTimeout);
          settleTimeout = null;
        }
        subscription?.unsubscribe();
        resolve(result);
      };

      subscription = this.viewport.events$.subscribe((event) => {
        if (event.type === 'loadFailed') {
          finish({ status: 'failed' });
          return;
        }

        if (event.type !== 'navigation') {
          return;
        }

        if (settleTimeout !== null) {
          globalThis.clearTimeout(settleTimeout);
          settleTimeout = null;
        }

        if (!event.committed || event.state.loading) {
          return;
        }

        const committedUrl = event.state.url;
        settleTimeout = globalThis.setTimeout(() => {
          finish({ status: 'loaded', url: committedUrl });
        }, MANUAL_CHAPTER_NAVIGATION_SETTLE_DELAY_MS);
      });
    });
  }

  private async articleFromCurrentPage(
    fallbackUrl: string,
  ): Promise<ReadingChapterNavigationResult> {
    const manualChapterNavigation =
      await this.manualChapterNavigation.selectedPayloadForUrl(fallbackUrl);
    const result = await this.extractArticleAfterNavigation(fallbackUrl, manualChapterNavigation);
    switch (result.status) {
      case 'ok':
        return { ok: true, destination: 'reader', article: result.article };
      case 'unavailable':
      case 'failed':
        return {
          ok: true,
          destination: 'browser',
          notice: browserNoticeForReadingModeResult(result, fallbackUrl),
        };
    }
  }

  private async extractArticleAfterNavigation(
    targetUrl: string,
    manualChapterNavigation: BrowserViewportExtractArticleOptions['manualChapterNavigation'],
  ) {
    const options = toExtractArticleOptions(manualChapterNavigation);
    const initialResult = await this.viewport.extractArticle(options);
    if (
      manualChapterNavigation === undefined ||
      !shouldRetryManualChapterExtraction(initialResult, targetUrl)
    ) {
      return initialResult;
    }

    await delay(MANUAL_CHAPTER_NAVIGATION_RETRY_DELAY_MS);
    return this.viewport.extractArticle(options);
  }

  private loadFailureMessage(error: unknown): string {
    /* istanbul ignore if */
    if (!(error instanceof Error)) {
      return 'Unknown error';
    }

    return error.message;
  }
}

function shouldRetryManualChapterExtraction(
  result: BrowserArticleExtractionResult,
  targetUrl: string,
): boolean {
  return result.status !== 'ok' || isStaleArticleExtractionResult(result, targetUrl);
}

function isStaleArticleExtractionResult(
  result: BrowserArticleExtractionSuccess,
  targetUrl: string,
): boolean {
  return !sameResolvedUrl(result.article.url, targetUrl);
}

function sameResolvedUrl(left: string, right: string): boolean {
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    leftUrl.hash = '';
    rightUrl.hash = '';
    return leftUrl.href === rightUrl.href;
  } catch (_error) {
    return left === right;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

function toExtractArticleOptions(
  manualChapterNavigation: BrowserViewportExtractArticleOptions['manualChapterNavigation'],
): BrowserViewportExtractArticleOptions {
  return manualChapterNavigation === undefined ? {} : { manualChapterNavigation };
}
