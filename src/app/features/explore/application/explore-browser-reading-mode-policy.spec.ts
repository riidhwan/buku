import { BrowserUrlPolicy } from './browser-url-policy';
import {
  browserNoticeForReadingModeResult,
  browserNoticeForUnsupportedCapability,
} from './explore-browser-notice-policy';
import {
  readingChapterLinkForDirection,
  resolveReadingModeTargetUrl,
} from './explore-browser-reading-mode-policy';

const article = {
  url: 'https://example.com/article',
  title: 'Readable article',
  byline: 'A Writer',
  siteName: 'Example',
  excerpt: 'A short summary.',
  publishedTime: '2026-06-26',
  contentHtml: '<p>Readable body.</p>',
  textContent: 'Readable body.',
  length: 14,
  previousChapter: {
    href: '/previous',
    label: 'Previous chapter',
  },
  nextChapter: {
    href: '/next',
    label: 'Next chapter',
  },
};

describe('Explore browser Reading Mode policy', () => {
  const urlPolicy = new BrowserUrlPolicy();

  it('maps unsupported browser capabilities to notices', () => {
    expect(
      browserNoticeForUnsupportedCapability('download', 'https://example.com/file.pdf'),
    ).toEqual({
      kind: 'unsupportedCapability',
      message: 'Downloads are not supported in Explore Browser.',
      url: 'https://example.com/file.pdf',
    });
  });

  it('maps Reading Mode extraction outcomes to notices', () => {
    expect(
      browserNoticeForReadingModeResult({ status: 'unavailable' }, 'https://example.com/'),
    ).toEqual({
      kind: 'readingModeUnavailable',
      message: 'Reading Mode is not available for this page.',
      url: 'https://example.com/',
    });

    expect(
      browserNoticeForReadingModeResult(
        { status: 'failed', message: 'Script failed' },
        'https://example.com/',
      ),
    ).toEqual({
      kind: 'readingModeFailed',
      message: 'Reading Mode failed: Script failed',
      url: 'https://example.com/',
    });
  });

  it('resolves Reading Mode links against the article URL', () => {
    expect(resolveReadingModeTargetUrl('/next', article.url, urlPolicy)).toEqual({
      ok: true,
      url: 'https://example.com/next',
    });
  });

  it('rejects unsupported Reading Mode link schemes without leaving the article context', () => {
    expect(
      resolveReadingModeTargetUrl('mailto:reader@example.com', article.url, urlPolicy),
    ).toEqual({
      ok: false,
      notice: {
        kind: 'unsupportedCapability',
        message: 'Only HTTP and HTTPS links are supported.',
        url: 'https://example.com/article',
      },
    });
  });

  it('rejects Reading Mode links that cannot be resolved', () => {
    expect(resolveReadingModeTargetUrl('https://[', article.url, urlPolicy)).toEqual({
      ok: false,
      notice: {
        kind: 'unsupportedCapability',
        message: 'This link type is not supported in Explore Browser.',
        url: 'https://example.com/article',
      },
    });
  });

  it('selects chapter links by direction', () => {
    expect(readingChapterLinkForDirection(article, 'previous')).toEqual(article.previousChapter);
    expect(readingChapterLinkForDirection(article, 'next')).toEqual(article.nextChapter);
  });
});
