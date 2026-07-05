import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ReadingArticleSnapshot } from '../domain/reading-article';
import { BrowserUrlPolicy } from './browser-url-policy';
import { ExploreReadingChapterNavigator } from './explore-reading-chapter-navigator';
import {
  BrowserArticleExtractionResult,
  BROWSER_VIEWPORT,
  BrowserHistoryNavigationResult,
  BrowserViewportEvent,
  BrowserViewportPort,
  BrowserViewportRect,
} from './ports/browser-viewport.port';

class FakeBrowserViewport implements BrowserViewportPort {
  private readonly eventsSubject = new Subject<BrowserViewportEvent>();
  public readonly events$ = this.eventsSubject.asObservable();
  public readonly loadedUrls: string[] = [];
  public loadError: Error | null = null;
  public extractionResult: BrowserArticleExtractionResult = { status: 'unavailable' };

  public emit(event: BrowserViewportEvent): void {
    this.eventsSubject.next(event);
  }

  public show(_rect: BrowserViewportRect): Promise<void> {
    return Promise.resolve();
  }

  public hide(): Promise<void> {
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
    return Promise.resolve();
  }

  public reload(): Promise<void> {
    return Promise.resolve();
  }

  public back(): Promise<BrowserHistoryNavigationResult> {
    return Promise.resolve({ didNavigate: false });
  }

  public forward(): Promise<void> {
    return Promise.resolve();
  }

  public copyUrl(_url: string): Promise<void> {
    return Promise.resolve();
  }

  public extractArticle(): Promise<BrowserArticleExtractionResult> {
    return Promise.resolve(this.extractionResult);
  }
}

const article: ReadingArticleSnapshot = {
  url: 'https://example.com/current',
  title: 'Current chapter',
  byline: null,
  siteName: 'Example',
  excerpt: null,
  publishedTime: null,
  contentHtml: '<p>Current</p>',
  textContent: 'Current',
  length: 7,
  previousChapter: {
    href: '/previous',
    label: 'Previous',
  },
  nextChapter: {
    href: '/next',
    label: 'Next',
  },
};

describe('ExploreReadingChapterNavigator', () => {
  let navigator: ExploreReadingChapterNavigator;
  let viewport: FakeBrowserViewport;

  beforeEach(() => {
    viewport = new FakeBrowserViewport();

    TestBed.configureTestingModule({
      providers: [
        BrowserUrlPolicy,
        ExploreReadingChapterNavigator,
        { provide: BROWSER_VIEWPORT, useValue: viewport },
      ],
    });

    navigator = TestBed.inject(ExploreReadingChapterNavigator);
  });

  it('loads a resolved chapter link and returns the extracted reader article', async () => {
    const nextArticle = {
      ...article,
      url: 'https://example.com/next',
      title: 'Next chapter',
    };
    viewport.extractionResult = {
      status: 'ok',
      article: nextArticle,
    };

    const resultPromise = navigator.navigate(article, 'next');
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

    await expectAsync(resultPromise).toBeResolvedTo({
      ok: true,
      destination: 'reader',
      article: nextArticle,
    });
    expect(viewport.loadedUrls).toEqual(['https://example.com/next']);
  });

  it('returns a browser destination when chapter extraction is unavailable', async () => {
    const resultPromise = navigator.navigate(article, 'previous');
    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/previous',
        loading: false,
        canGoBack: false,
        canGoForward: true,
      },
    });

    await expectAsync(resultPromise).toBeResolvedTo({
      ok: true,
      destination: 'browser',
      notice: {
        kind: 'readingModeUnavailable',
        message: 'Reading Mode is not available for this page.',
        url: 'https://example.com/previous',
      },
    });
  });

  it('rejects missing and unsupported chapter targets before loading', async () => {
    const { previousChapter: _previousChapter, ...articleWithoutPreviousChapter } = article;

    await expectAsync(navigator.navigate(articleWithoutPreviousChapter, 'previous')).toBeResolvedTo(
      { ok: false, notice: null },
    );

    await expectAsync(
      navigator.navigate(
        {
          ...article,
          nextChapter: {
            href: 'mailto:reader@example.com',
            label: 'Email',
          },
        },
        'next',
      ),
    ).toBeResolvedTo({
      ok: false,
      notice: {
        kind: 'unsupportedCapability',
        message: 'Only HTTP and HTTPS links are supported.',
        url: 'https://example.com/current',
      },
    });
    expect(viewport.loadedUrls).toEqual([]);
  });

  it('returns a browser destination with a notice when loading rejects', async () => {
    viewport.loadError = new Error('Bridge rejected');

    await expectAsync(navigator.navigate(article, 'next')).toBeResolvedTo({
      ok: true,
      destination: 'browser',
      notice: {
        kind: 'loadFailed',
        message: 'Page failed to load: Bridge rejected',
        url: 'https://example.com/next',
      },
    });
  });
});
