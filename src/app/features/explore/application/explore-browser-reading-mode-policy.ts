import { ReadingArticleSnapshot, ReadingChapterLink } from '../domain/reading-article';
import {
  browserNoticeForUnsupportedCapability,
  type BrowserNotice,
} from './explore-browser-notice-policy';
import type { BrowserUrlPolicy } from './browser-url-policy';

export type ReadingChapterDirection = 'previous' | 'next';

export type ReadingModeTargetUrlResult =
  | {
      readonly ok: true;
      readonly url: string;
    }
  | {
      readonly ok: false;
      readonly notice: BrowserNotice;
    };

export function readingChapterLinkForDirection(
  article: ReadingArticleSnapshot,
  direction: ReadingChapterDirection,
): ReadingChapterLink | undefined {
  return direction === 'previous' ? article.previousChapter : article.nextChapter;
}

export function resolveReadingModeTargetUrl(
  href: string,
  baseUrl: string,
  urlPolicy: BrowserUrlPolicy,
): ReadingModeTargetUrlResult {
  let targetUrl: string;
  try {
    targetUrl = new URL(href, baseUrl).toString();
  } catch (_error) {
    return {
      ok: false,
      notice: browserNoticeForUnsupportedCapability('customScheme', baseUrl),
    };
  }

  const normalized = urlPolicy.normalize(targetUrl);
  if (!normalized.ok) {
    return {
      ok: false,
      notice: {
        kind: 'unsupportedCapability',
        message: normalized.message,
        url: baseUrl,
      },
    };
  }

  return {
    ok: true,
    url: normalized.url,
  };
}
