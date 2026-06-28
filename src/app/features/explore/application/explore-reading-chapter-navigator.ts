import { inject, Injectable } from '@angular/core';
import { filter, firstValueFrom, take } from 'rxjs';
import { ReadingArticleSnapshot } from '../domain/reading-article';
import { BrowserUrlPolicy } from './browser-url-policy';
import {
  browserNoticeForLoadFailure,
  browserNoticeForReadingModeResult,
  readingChapterLinkForDirection,
  resolveReadingModeTargetUrl,
  type BrowserNotice,
  type ReadingChapterDirection,
} from './explore-browser-reading-mode-policy';
import { BROWSER_VIEWPORT, type BrowserViewportPort } from './ports/browser-viewport.port';

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
      if (navigationResult === 'failed') {
        return { ok: true, destination: 'browser', notice: null };
      }

      return await this.articleFromCurrentPage(targetUrl.url);
    } catch (error) {
      return {
        ok: true,
        destination: 'browser',
        notice: browserNoticeForLoadFailure(this.loadFailureMessage(error), targetUrl.url),
      };
    }
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

  private async articleFromCurrentPage(
    fallbackUrl: string,
  ): Promise<ReadingChapterNavigationResult> {
    const result = await this.viewport.extractArticle();
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

  private loadFailureMessage(error: unknown): string {
    /* istanbul ignore if */
    if (!(error instanceof Error)) {
      return 'Unknown error';
    }

    return error.message;
  }
}
