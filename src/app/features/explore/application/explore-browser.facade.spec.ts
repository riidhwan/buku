import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BrowserUrlPolicy } from './browser-url-policy';
import { ExploreBrowserFacade } from './explore-browser.facade';
import { BROWSER_SESSION_STORE, BrowserSessionStorePort } from './ports/browser-session-store.port';
import {
  BrowserArticleExtractionResult,
  BROWSER_VIEWPORT,
  BrowserViewportEvent,
  BrowserViewportPort,
  BrowserViewportRect,
} from './ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER, ExternalUrlOpenerPort } from './ports/external-url-opener.port';

class FakeBrowserSessionStore implements BrowserSessionStorePort {
  public lastUrl: string | null = null;
  public readonly writes: string[] = [];

  public readLastUrl(): Promise<string | null> {
    return Promise.resolve(this.lastUrl);
  }

  public writeLastUrl(url: string): Promise<void> {
    this.writes.push(url);
    this.lastUrl = url;
    return Promise.resolve();
  }
}

class FakeBrowserViewport implements BrowserViewportPort {
  private readonly eventsSubject = new Subject<BrowserViewportEvent>();
  public readonly events$ = this.eventsSubject.asObservable();
  public readonly loadedUrls: string[] = [];
  public loadError: Error | null = null;
  public copiedUrl: string | null = null;
  public shownRect: BrowserViewportRect | null = null;
  public hideCount = 0;
  public stopCount = 0;
  public reloadCount = 0;
  public backCount = 0;
  public forwardCount = 0;
  public articleExtractionResult: BrowserArticleExtractionResult = {
    status: 'unavailable',
  };
  public articleExtractionPromise: Promise<BrowserArticleExtractionResult> | null = null;
  public extractCount = 0;

  public emit(event: BrowserViewportEvent): void {
    this.eventsSubject.next(event);
  }

  public show(rect: BrowserViewportRect): Promise<void> {
    this.shownRect = rect;
    return Promise.resolve();
  }

  public hide(): Promise<void> {
    this.hideCount += 1;
    return Promise.resolve();
  }

  public destroy(): Promise<void> {
    return Promise.resolve();
  }

  public load(url: string): Promise<void> {
    if (this.loadError !== null) {
      return Promise.reject(this.loadError);
    }

    this.loadedUrls.push(url);
    return Promise.resolve();
  }

  public stop(): Promise<void> {
    this.stopCount += 1;
    return Promise.resolve();
  }

  public reload(): Promise<void> {
    this.reloadCount += 1;
    return Promise.resolve();
  }

  public back(): Promise<void> {
    this.backCount += 1;
    return Promise.resolve();
  }

  public forward(): Promise<void> {
    this.forwardCount += 1;
    return Promise.resolve();
  }

  public copyUrl(url: string): Promise<void> {
    this.copiedUrl = url;
    return Promise.resolve();
  }

  public extractArticle(): Promise<BrowserArticleExtractionResult> {
    this.extractCount += 1;
    return this.articleExtractionPromise ?? Promise.resolve(this.articleExtractionResult);
  }
}

class FakeExternalUrlOpener implements ExternalUrlOpenerPort {
  public openedUrl: string | null = null;

  public open(url: string): Promise<void> {
    this.openedUrl = url;
    return Promise.resolve();
  }
}

const articleSnapshot = {
  url: 'https://example.com/article',
  title: 'Readable article',
  byline: 'A Writer',
  siteName: 'Example',
  excerpt: 'A short summary.',
  publishedTime: '2026-06-26',
  contentHtml: '<p>Readable body.</p>',
  textContent: 'Readable body.',
  length: 14,
};

const articleSnapshotWithChapters = {
  ...articleSnapshot,
  previousChapter: {
    href: '/previous',
    label: 'Previous chapter',
  },
  nextChapter: {
    href: '/next',
    label: 'Next chapter',
  },
};

class Deferred<T> {
  public readonly promise: Promise<T>;
  private resolveValue: (value: T) => void = () => {
    throw new Error('Deferred resolver was not assigned.');
  };

  public constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolveValue = resolve;
    });
  }

  public resolve(value: T): void {
    this.resolveValue(value);
  }
}

describe('ExploreBrowserFacade', () => {
  let facade: ExploreBrowserFacade;
  let store: FakeBrowserSessionStore;
  let viewport: FakeBrowserViewport;
  let opener: FakeExternalUrlOpener;

  beforeEach(() => {
    store = new FakeBrowserSessionStore();
    viewport = new FakeBrowserViewport();
    opener = new FakeExternalUrlOpener();

    TestBed.configureTestingModule({
      providers: [
        BrowserUrlPolicy,
        ExploreBrowserFacade,
        { provide: BROWSER_SESSION_STORE, useValue: store },
        { provide: BROWSER_VIEWPORT, useValue: viewport },
        { provide: EXTERNAL_URL_OPENER, useValue: opener },
      ],
    });

    facade = TestBed.inject(ExploreBrowserFacade);
  });

  it('loads the resumable last URL', async () => {
    store.lastUrl = 'https://example.com/';

    await facade.initialize();

    expect(facade.lastUrl()).toBe('https://example.com/');
  });

  it('reports no secure or insecure state before a URL is loaded', () => {
    expect(facade.isSecure()).toBeFalse();
    expect(facade.isInsecure()).toBeFalse();
  });

  it('opens normalized URLs and clears validation errors', async () => {
    facade.updateInputValue('not a url');
    await facade.openInput();
    facade.updateInputValue('example.com');

    const result = await facade.openInput();

    expect(result.ok).toBeTrue();
    expect(facade.validationError()).toBeNull();
    expect(facade.currentUrl()).toBe('https://example.com/');
    expect(facade.loading()).toBeTrue();
    expect(viewport.loadedUrls).toEqual(['https://example.com/']);
  });

  it('keeps invalid input on the landing page with an inline validation error', async () => {
    facade.updateInputValue('reader search');

    const result = await facade.openInput();

    expect(result.ok).toBeFalse();
    expect(facade.validationError()).toBe('Enter a URL, not search terms.');
    expect(viewport.loadedUrls).toEqual([]);
  });

  it('resumes the last URL', async () => {
    store.lastUrl = 'https://buku.example/';
    await facade.initialize();

    const result = await facade.resumeLastUrl();

    expect(result.ok).toBeTrue();
    expect(facade.inputValue()).toBe('https://buku.example/');
    expect(viewport.loadedUrls).toEqual(['https://buku.example/']);
  });

  it('does not resume when there is no last URL', async () => {
    await facade.initialize();

    const result = await facade.resumeLastUrl();

    expect(result.ok).toBeFalse();
    expect(viewport.loadedUrls).toEqual([]);
  });

  it('updates state and persists committed navigation events', () => {
    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'http://example.com/',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      },
    });

    expect(facade.currentUrl()).toBe('http://example.com/');
    expect(facade.isInsecure()).toBeTrue();
    expect(facade.canGoBack()).toBeTrue();
    expect(store.writes).toEqual(['http://example.com/']);
  });

  it('controls reload, stop, back, and forward through the viewport', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/',
        loading: true,
        canGoBack: true,
        canGoForward: true,
      },
    });

    await facade.stopOrReload();
    await facade.stopOrReload();
    await facade.goBack();
    await facade.goForward();

    expect(viewport.stopCount).toBe(1);
    expect(viewport.reloadCount).toBe(1);
    expect(viewport.backCount).toBe(1);
    expect(viewport.forwardCount).toBe(1);
  });

  it('shows load failure notices and can retry the current URL', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.emit({
      type: 'loadFailed',
      event: {
        url: 'https://example.com/',
        description: 'Network error',
      },
    });

    const result = await facade.retryCurrentUrl();

    expect(result.ok).toBeTrue();
    expect(viewport.loadedUrls).toEqual(['https://example.com/']);
    expect(facade.notice()?.message).toBe('Page failed to load: Network error');
  });

  it('does not retry when there is no current URL', async () => {
    const result = await facade.retryCurrentUrl();

    expect(result.ok).toBeFalse();
  });

  it('shows unsupported capability notices', () => {
    viewport.emit({
      type: 'capabilityUnsupported',
      event: {
        capability: 'download',
        url: 'https://example.com/file.pdf',
      },
    });

    expect(facade.notice()).toEqual({
      kind: 'unsupportedCapability',
      message: 'Downloads are not supported in Explore Browser.',
      url: 'https://example.com/file.pdf',
    });
  });

  it('copies and opens the current URL externally', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });

    await facade.copyCurrentUrl();
    await facade.openCurrentUrlExternally();

    expect(viewport.copiedUrl).toBe('https://example.com/');
    expect(opener.openedUrl).toBe('https://example.com/');
    expect(facade.notice()?.kind).toBe('copied');
  });

  it('ignores copy and external open commands without a current URL', async () => {
    await facade.copyCurrentUrl();
    await facade.openCurrentUrlExternally();

    expect(viewport.copiedUrl).toBeNull();
    expect(opener.openedUrl).toBeNull();
  });

  it('dismisses notices and reports secure state', () => {
    viewport.emit({
      type: 'capabilityUnsupported',
      event: {
        capability: 'unknown',
        url: null,
      },
    });
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });

    expect(facade.isSecure()).toBeTrue();

    facade.dismissNotice();

    expect(facade.notice()).toBeNull();
  });

  it('shows, hides, and closes the native viewport', async () => {
    const rect = { left: 1, top: 2, width: 3, height: 4 };

    await facade.showViewport(rect);
    await facade.hideViewport();
    await facade.closeBrowser();

    expect(viewport.shownRect).toEqual(rect);
    expect(viewport.hideCount).toBe(2);
  });

  it('extracts an article, stores it in memory, and hides the native viewport', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshot,
    };

    const result = await facade.openReadingMode();

    expect(result.ok).toBeTrue();
    expect(facade.readingArticle()).toEqual(articleSnapshot);
    expect(viewport.extractCount).toBe(1);
    expect(viewport.hideCount).toBe(1);
  });

  it('does not try reading mode without a current URL or while loading', async () => {
    expect((await facade.openReadingMode()).ok).toBeFalse();

    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: true,
        canGoBack: false,
        canGoForward: false,
      },
    });

    expect((await facade.openReadingMode()).ok).toBeFalse();
    expect(viewport.extractCount).toBe(0);
  });

  it('shows a notice when reading mode is unavailable', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'unavailable',
    };

    const result = await facade.openReadingMode();

    expect(result.ok).toBeFalse();
    expect(facade.readingArticle()).toBeNull();
    expect(facade.notice()).toEqual({
      kind: 'readingModeUnavailable',
      message: 'Reading Mode is not available for this page.',
      url: 'https://example.com/',
    });
  });

  it('shows a notice when reading mode extraction fails', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'failed',
      message: 'Script failed',
    };

    const result = await facade.openReadingMode();

    expect(result.ok).toBeFalse();
    expect(facade.notice()).toEqual({
      kind: 'readingModeFailed',
      message: 'Reading Mode failed: Script failed',
      url: 'https://example.com/',
    });
  });

  it('closes reading mode without destroying the browser session', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshot,
    };

    await facade.openReadingMode();
    facade.closeReadingMode();

    expect(facade.readingArticle()).toBeNull();
    expect(facade.currentUrl()).toBe('https://example.com/article');
  });

  it('opens reader links through the Explore Browser session', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshot,
    };
    await facade.openReadingMode();

    const result = await facade.openReadingModeLink('/next');

    expect(result.ok).toBeTrue();
    expect(facade.readingArticle()).toBeNull();
    expect(viewport.loadedUrls).toEqual(['https://example.com/next']);
  });

  it('keeps the reader open when reader links use unsupported schemes', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshot,
    };
    await facade.openReadingMode();

    const result = await facade.openReadingModeLink('mailto:reader@example.com');

    expect(result.ok).toBeFalse();
    expect(facade.readingArticle()).toEqual(articleSnapshot);
    expect(facade.notice()).toEqual({
      kind: 'unsupportedCapability',
      message: 'Only HTTP and HTTPS links are supported.',
      url: 'https://example.com/article',
    });
  });

  it('keeps the reader open when reader links cannot be resolved', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshot,
    };
    await facade.openReadingMode();

    const result = await facade.openReadingModeLink('https://[');

    expect(result.ok).toBeFalse();
    expect(facade.readingArticle()).toEqual(articleSnapshot);
    expect(facade.notice()).toEqual({
      kind: 'unsupportedCapability',
      message: 'This link type is not supported in Explore Browser.',
      url: 'https://example.com/article',
    });
  });

  it('ignores reader link navigation without an in-memory article', async () => {
    const result = await facade.openReadingModeLink('https://example.com/next');

    expect(result.ok).toBeFalse();
    expect(viewport.loadedUrls).toEqual([]);
  });

  it('loads and replaces the in-memory article for next chapter navigation', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();

    const nextArticle = {
      ...articleSnapshot,
      url: 'https://example.com/next',
      title: 'Next chapter',
    };
    viewport.articleExtractionResult = {
      status: 'ok',
      article: nextArticle,
    };

    const resultPromise = facade.navigateReadingChapter('next');

    expect(facade.chapterNavigationLoading()).toBeTrue();
    expect(facade.readingArticle()).toEqual(articleSnapshotWithChapters);

    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/next',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      },
    });

    const result = await resultPromise;

    expect(result).toEqual({ ok: true, destination: 'reader' });
    expect(facade.chapterNavigationLoading()).toBeFalse();
    expect(facade.readingArticle()).toEqual(nextArticle);
    expect(viewport.loadedUrls).toEqual(['https://example.com/next']);
    expect(viewport.extractCount).toBe(2);
  });

  it('loads and replaces the in-memory article for previous chapter navigation', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();

    const previousArticle = {
      ...articleSnapshot,
      url: 'https://example.com/previous',
      title: 'Previous chapter',
    };
    viewport.articleExtractionResult = {
      status: 'ok',
      article: previousArticle,
    };

    const resultPromise = facade.navigateReadingChapter('previous');
    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/previous',
        loading: false,
        canGoBack: true,
        canGoForward: true,
      },
    });

    expect(await resultPromise).toEqual({ ok: true, destination: 'reader' });
    expect(facade.readingArticle()).toEqual(previousArticle);
    expect(viewport.loadedUrls).toEqual(['https://example.com/previous']);
  });

  it('keeps Reading Mode open when chapter navigation targets an unsupported URL', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    const article = {
      ...articleSnapshot,
      nextChapter: {
        href: 'mailto:reader@example.com',
        label: 'Next chapter',
      },
    };
    viewport.articleExtractionResult = {
      status: 'ok',
      article,
    };
    await facade.openReadingMode();

    const result = await facade.navigateReadingChapter('next');

    expect(result.ok).toBeFalse();
    expect(facade.readingArticle()).toEqual(article);
    expect(viewport.loadedUrls).toEqual([]);
    expect(facade.notice()).toEqual({
      kind: 'unsupportedCapability',
      message: 'Only HTTP and HTTPS links are supported.',
      url: 'https://example.com/article',
    });
  });

  it('keeps Reading Mode open when a chapter href cannot be resolved', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    const article = {
      ...articleSnapshot,
      nextChapter: {
        href: 'https://[',
        label: 'Next chapter',
      },
    };
    viewport.articleExtractionResult = {
      status: 'ok',
      article,
    };
    await facade.openReadingMode();

    const result = await facade.navigateReadingChapter('next');

    expect(result.ok).toBeFalse();
    expect(facade.readingArticle()).toEqual(article);
    expect(facade.notice()).toEqual({
      kind: 'unsupportedCapability',
      message: 'This link type is not supported in Explore Browser.',
      url: 'https://example.com/article',
    });
  });

  it('falls back to the Explore Browser when chapter loading fails', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();

    const resultPromise = facade.navigateReadingChapter('next');
    viewport.emit({
      type: 'loadFailed',
      event: {
        url: 'https://example.com/next',
        description: 'Network error',
      },
    });

    expect(await resultPromise).toEqual({ ok: true, destination: 'browser' });
    expect(facade.readingArticle()).toBeNull();
    expect(facade.notice()).toEqual({
      kind: 'loadFailed',
      message: 'Page failed to load: Network error',
      url: 'https://example.com/next',
    });
  });

  it('falls back to the Explore Browser when chapter load is rejected', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();
    viewport.loadError = new Error('Bridge rejected');

    const result = await facade.navigateReadingChapter('next');

    expect(result).toEqual({ ok: true, destination: 'browser' });
    expect(facade.readingArticle()).toBeNull();
    expect(facade.notice()).toEqual({
      kind: 'loadFailed',
      message: 'Page failed to load: Bridge rejected',
      url: 'https://example.com/next',
    });
  });

  it('falls back to the Explore Browser when target chapter extraction is unavailable', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();
    viewport.articleExtractionResult = {
      status: 'unavailable',
    };

    const resultPromise = facade.navigateReadingChapter('next');
    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/next',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      },
    });

    expect(await resultPromise).toEqual({ ok: true, destination: 'browser' });
    expect(facade.readingArticle()).toBeNull();
    expect(facade.notice()).toEqual({
      kind: 'readingModeUnavailable',
      message: 'Reading Mode is not available for this page.',
      url: 'https://example.com/next',
    });
  });

  it('falls back to the Explore Browser when target chapter extraction fails', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();
    viewport.articleExtractionResult = {
      status: 'failed',
      message: 'Script failed',
    };

    const resultPromise = facade.navigateReadingChapter('next');
    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/next',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      },
    });

    expect(await resultPromise).toEqual({ ok: true, destination: 'browser' });
    expect(facade.readingArticle()).toBeNull();
    expect(facade.notice()).toEqual({
      kind: 'readingModeFailed',
      message: 'Reading Mode failed: Script failed',
      url: 'https://example.com/next',
    });
  });

  it('disables concurrent chapter navigation while a chapter is loading', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();
    const extraction = new Deferred<BrowserArticleExtractionResult>();
    viewport.articleExtractionPromise = extraction.promise;

    const resultPromise = facade.navigateReadingChapter('next');
    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/next',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      },
    });
    await Promise.resolve();

    const blockedResult = await facade.navigateReadingChapter('previous');
    extraction.resolve({
      status: 'ok',
      article: articleSnapshot,
    });
    await resultPromise;

    expect(blockedResult.ok).toBeFalse();
    expect(viewport.loadedUrls).toEqual(['https://example.com/next']);
  });

  it('ignores chapter navigation when the direction is unavailable', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: {
        ...articleSnapshot,
        nextChapter: {
          href: '/next',
          label: 'Next chapter',
        },
      },
    };
    await facade.openReadingMode();

    const result = await facade.navigateReadingChapter('previous');

    expect(result.ok).toBeFalse();
    expect(viewport.loadedUrls).toEqual([]);
  });

  it('ignores chapter navigation while the browser is already loading', async () => {
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });
    viewport.articleExtractionResult = {
      status: 'ok',
      article: articleSnapshotWithChapters,
    };
    await facade.openReadingMode();
    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/article',
        loading: true,
        canGoBack: false,
        canGoForward: false,
      },
    });

    const result = await facade.navigateReadingChapter('next');

    expect(result.ok).toBeFalse();
    expect(viewport.loadedUrls).toEqual([]);
  });

  it('unsubscribes from viewport events when destroyed', () => {
    facade.ngOnDestroy();

    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://after-destroy.example/',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });

    expect(facade.currentUrl()).toBeNull();
  });
});
