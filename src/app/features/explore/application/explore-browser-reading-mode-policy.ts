import { ReadingArticleSnapshot, ReadingChapterLink } from '../domain/reading-article';
import type { BrowserUrlPolicy } from './browser-url-policy';
import type {
  BrowserArticleExtractionResult,
  BrowserCapability,
} from './ports/browser-viewport.port';

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

export function browserNoticeForUnsupportedCapability(
  capability: BrowserCapability,
  url: string | null,
): BrowserNotice {
  return {
    kind: 'unsupportedCapability',
    message: capabilityMessages[capability],
    url,
  };
}

export function browserNoticeForLoadFailure(message: string, url: string | null): BrowserNotice {
  return {
    kind: 'loadFailed',
    message: `Page failed to load: ${message}`,
    url,
  };
}

export function browserNoticeForReadingModeResult(
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
