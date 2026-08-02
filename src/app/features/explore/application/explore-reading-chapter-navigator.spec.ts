import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ReadingArticleSnapshot } from '../domain/reading-article';
import { BrowserUrlPolicy } from './browser-url-policy';
import { ExploreReadingChapterNavigator } from './explore-reading-chapter-navigator';
import type { ReadingChapterNavigationResult } from './explore-reading-chapter-navigator';
import { ManualChapterNavigationRuleWorkflow } from './manual-chapter-navigation-rule-workflow';
import type { ManualChapterNavigationRuleSet } from '../domain/manual-chapter-navigation-rule';
import {
  BrowserArticleExtractionResult,
  BrowserViewportExtractArticleOptions,
  BROWSER_VIEWPORT,
  BrowserHistoryNavigationResult,
  BrowserViewportSelectorPreview,
  BrowserViewportEvent,
  BrowserViewportPort,
  BrowserViewportRect,
} from './ports/browser-viewport.port';
import {
  MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
  ManualChapterNavigationRuleRepositoryPort,
} from './ports/manual-chapter-navigation-rule-repository.port';

class FakeBrowserViewport implements BrowserViewportPort {
  private readonly eventsSubject = new Subject<BrowserViewportEvent>();
  public readonly events$ = this.eventsSubject.asObservable();
  public readonly loadedUrls: string[] = [];
  public loadError: Error | null = null;
  public extractionResult: BrowserArticleExtractionResult = { status: 'unavailable' };
  public extractionResults: BrowserArticleExtractionResult[] | null = null;
  public extractOptions: BrowserViewportExtractArticleOptions | undefined;
  public extractCount = 0;

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

  public extractArticle(
    options?: BrowserViewportExtractArticleOptions,
  ): Promise<BrowserArticleExtractionResult> {
    this.extractCount += 1;
    this.extractOptions = options;
    const queuedResult = this.extractionResults?.shift();
    return Promise.resolve(queuedResult ?? this.extractionResult);
  }

  public previewManualChapterNavigation(): Promise<BrowserViewportSelectorPreview> {
    return Promise.resolve({ ok: false, reason: 'noMatch', matches: [], automatic: null });
  }
}

class FakeManualChapterNavigationRuleRepository implements ManualChapterNavigationRuleRepositoryPort {
  public ruleSets: readonly ManualChapterNavigationRuleSet[] = [];

  public list(): Promise<readonly ManualChapterNavigationRuleSet[]> {
    return Promise.resolve(this.ruleSets);
  }

  public save(): Promise<{ readonly ok: true }> {
    return Promise.resolve({ ok: true });
  }

  public delete(): Promise<{ readonly ok: true }> {
    return Promise.resolve({ ok: true });
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
        ManualChapterNavigationRuleWorkflow,
        { provide: BROWSER_VIEWPORT, useValue: viewport },
        {
          provide: MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
          useClass: FakeManualChapterNavigationRuleRepository,
        },
      ],
    });

    navigator = TestBed.inject(ExploreReadingChapterNavigator);
  });

  it('loads a resolved chapter link and returns the extracted reader article', async () => {
    const repository = TestBed.inject(
      MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
    ) as FakeManualChapterNavigationRuleRepository;
    repository.ruleSets = [
      {
        id: 'rules-1',
        scope: { host: 'example.com', pathPrefix: '/next' },
        enabled: true,
        previous: null,
        next: {
          direction: 'next',
          selectorMode: 'link',
          selector: 'a.next',
          disambiguation: null,
          sampleLabel: 'Next',
          sampleHref: '/next',
          verifiedAt: '2026-08-02T00:00:00.000Z',
          lastFailedAt: null,
          failureReason: null,
        },
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];
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
    expect(viewport.extractOptions).toEqual({
      manualChapterNavigation: {
        next: {
          selectorMode: 'link',
          selector: 'a.next',
          disambiguation: null,
        },
      },
    });
  });

  it('waits for a later committed navigation after an intermediate redirect', fakeAsync(() => {
    const repository = TestBed.inject(
      MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
    ) as FakeManualChapterNavigationRuleRepository;
    repository.ruleSets = [
      {
        id: 'rules-1',
        scope: { host: 'example.com', pathPrefix: '/chapter-next' },
        enabled: true,
        previous: null,
        next: {
          direction: 'next',
          selectorMode: 'link',
          selector: 'a.next',
          disambiguation: null,
          sampleLabel: 'Next',
          sampleHref: '/chapter-next/1',
          verifiedAt: '2026-08-02T00:00:00.000Z',
          lastFailedAt: null,
          failureReason: null,
        },
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];
    const nextArticle = {
      ...article,
      url: 'https://example.com/chapter/2',
      title: 'Next chapter',
    };
    viewport.extractionResult = {
      status: 'ok',
      article: nextArticle,
    };

    let resolved: ReadingChapterNavigationResult | undefined;
    void navigator
      .navigate(
        {
          ...article,
          nextChapter: {
            href: '/chapter-next/1',
            label: 'Next',
          },
        },
        'next',
      )
      .then((result) => {
        resolved = result;
      });

    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/chapter-next/1',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      },
    });
    viewport.emit({
      type: 'sourceLinkLongPressed',
      event: {
        link: {
          pageUrl: 'https://example.com/chapter-next/1',
          href: 'https://example.com/chapter-next/1',
          text: 'Next',
          attributes: [],
          ancestors: [],
        },
      },
    });

    tick(200);
    expect(resolved).toBeUndefined();

    viewport.emit({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/chapter/2',
        loading: true,
        canGoBack: true,
        canGoForward: false,
      },
    });

    tick(200);
    expect(resolved).toBeUndefined();

    viewport.emit({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/chapter/2',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      },
    });

    tick(249);
    expect(resolved).toBeUndefined();
    tick(1);
    tick(0);

    expect(resolved).toEqual({
      ok: true,
      destination: 'reader',
      article: nextArticle,
    });
    expect(viewport.extractCount).toBe(1);
  }));

  it('retries manual chapter extraction once before falling back to the browser', fakeAsync(() => {
    const repository = TestBed.inject(
      MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
    ) as FakeManualChapterNavigationRuleRepository;
    repository.ruleSets = [
      {
        id: 'rules-1',
        scope: { host: 'example.com', pathPrefix: '/next' },
        enabled: true,
        previous: null,
        next: {
          direction: 'next',
          selectorMode: 'link',
          selector: 'a.next',
          disambiguation: null,
          sampleLabel: 'Next',
          sampleHref: '/next',
          verifiedAt: '2026-08-02T00:00:00.000Z',
          lastFailedAt: null,
          failureReason: null,
        },
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];
    const nextArticle = {
      ...article,
      url: 'https://example.com/next',
      title: 'Next chapter',
    };
    viewport.extractionResults = [
      { status: 'unavailable' },
      { status: 'ok', article: nextArticle },
    ];

    let resolved: ReadingChapterNavigationResult | undefined;
    void navigator.navigate(article, 'next').then((result) => {
      resolved = result;
    });
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

    tick(399);
    expect(resolved).toBeUndefined();
    tick(1);
    tick(0);

    expect(resolved).toEqual({
      ok: true,
      destination: 'reader',
      article: nextArticle,
    });
    expect(viewport.extractCount).toBe(2);
  }));

  it('retries manual chapter extraction when the first result has an invalid article URL', fakeAsync(() => {
    const repository = TestBed.inject(
      MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
    ) as FakeManualChapterNavigationRuleRepository;
    repository.ruleSets = [
      {
        id: 'rules-1',
        scope: { host: 'example.com', pathPrefix: '/next' },
        enabled: true,
        previous: null,
        next: {
          direction: 'next',
          selectorMode: 'link',
          selector: 'a.next',
          disambiguation: null,
          sampleLabel: 'Next',
          sampleHref: '/next',
          verifiedAt: '2026-08-02T00:00:00.000Z',
          lastFailedAt: null,
          failureReason: null,
        },
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];
    const malformedArticle = {
      ...article,
      url: 'not a url',
    };
    const nextArticle = {
      ...article,
      url: 'https://example.com/next',
      title: 'Next chapter',
    };
    viewport.extractionResults = [
      { status: 'ok', article: malformedArticle },
      { status: 'ok', article: nextArticle },
    ];

    let resolved: ReadingChapterNavigationResult | undefined;
    void navigator.navigate(article, 'next').then((result) => {
      resolved = result;
    });
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

    tick(399);
    expect(resolved).toBeUndefined();
    tick(1);
    tick(0);

    expect(resolved).toEqual({
      ok: true,
      destination: 'reader',
      article: nextArticle,
    });
    expect(viewport.extractCount).toBe(2);
  }));

  it('retries manual chapter extraction when the first successful result is stale', fakeAsync(() => {
    const repository = TestBed.inject(
      MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
    ) as FakeManualChapterNavigationRuleRepository;
    repository.ruleSets = [
      {
        id: 'rules-1',
        scope: { host: 'example.com', pathPrefix: '/next' },
        enabled: true,
        previous: null,
        next: {
          direction: 'next',
          selectorMode: 'link',
          selector: 'a.next',
          disambiguation: null,
          sampleLabel: 'Next',
          sampleHref: '/next',
          verifiedAt: '2026-08-02T00:00:00.000Z',
          lastFailedAt: null,
          failureReason: null,
        },
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];
    const staleArticle = {
      ...article,
      url: 'https://example.com/current',
    };
    const nextArticle = {
      ...article,
      url: 'https://example.com/next',
      title: 'Next chapter',
    };
    viewport.extractionResults = [
      { status: 'ok', article: staleArticle },
      { status: 'ok', article: nextArticle },
    ];

    let resolved: ReadingChapterNavigationResult | undefined;
    void navigator.navigate(article, 'next').then((result) => {
      resolved = result;
    });
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

    tick(399);
    expect(resolved).toBeUndefined();
    tick(1);
    tick(0);

    expect(resolved).toEqual({
      ok: true,
      destination: 'reader',
      article: nextArticle,
    });
    expect(viewport.extractCount).toBe(2);
  }));

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
