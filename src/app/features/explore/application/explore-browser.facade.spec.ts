import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BrowserUrlPolicy } from './browser-url-policy';
import { ExploreBrowserFacade } from './explore-browser.facade';
import { ExploreReadingChapterNavigator } from './explore-reading-chapter-navigator';
import { ManualChapterNavigationRuleWorkflow } from './manual-chapter-navigation-rule-workflow';
import {
  BROWSER_SESSION_STORE,
  type BrowserSessionStorePort,
  type BrowserTabSession,
} from './ports/browser-session-store.port';
import {
  BROWSER_VIEWPORT,
  type BrowserHistoryNavigationResult,
  type BrowserViewportSelectorPreview,
  type BrowserViewportEvent,
  type BrowserViewportPort,
  type BrowserViewportRect,
} from './ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER, type ExternalUrlOpenerPort } from './ports/external-url-opener.port';
import {
  MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
  type ManualChapterNavigationRuleRepositoryPort,
} from './ports/manual-chapter-navigation-rule-repository.port';
import type { ManualChapterNavigationRuleSet } from '../domain/manual-chapter-navigation-rule';

class FakeBrowserSessionStore implements BrowserSessionStorePort {
  public session: BrowserTabSession = { tabs: [], selectedTabId: null };

  public readTabSession(): Promise<BrowserTabSession> {
    return Promise.resolve(this.session);
  }

  public readLegacyLastUrl(): Promise<string | null> {
    return Promise.resolve(null);
  }

  public writeTabSession(session: BrowserTabSession): Promise<void> {
    this.session = session;
    return Promise.resolve();
  }
}

class FakeBrowserViewport implements BrowserViewportPort {
  private readonly eventsSubject = new Subject<BrowserViewportEvent>();
  public readonly events$ = this.eventsSubject.asObservable();
  public readonly loadedUrls: string[] = [];
  public previewResult: BrowserViewportSelectorPreview = {
    ok: true,
    matches: [{ href: 'https://example.com/story/2', label: 'Next' }],
    selected: { href: 'https://example.com/story/2', label: 'Next' },
    automatic: null,
  };

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

  public extractArticle(): Promise<{ readonly status: 'unavailable' }> {
    return Promise.resolve({ status: 'unavailable' });
  }

  public previewManualChapterNavigation(): Promise<BrowserViewportSelectorPreview> {
    return Promise.resolve(this.previewResult);
  }
}

class FakeManualChapterNavigationRuleRepository implements ManualChapterNavigationRuleRepositoryPort {
  public list(): Promise<readonly ManualChapterNavigationRuleSet[]> {
    return Promise.resolve([]);
  }

  public save(): Promise<{ readonly ok: true }> {
    return Promise.resolve({ ok: true });
  }

  public delete(): Promise<{ readonly ok: true }> {
    return Promise.resolve({ ok: true });
  }
}

class FakeExternalUrlOpener implements ExternalUrlOpenerPort {
  public open(_url: string): Promise<void> {
    return Promise.resolve();
  }
}

describe('ExploreBrowserFacade', () => {
  let facade: ExploreBrowserFacade;
  let viewport: FakeBrowserViewport;

  beforeEach(() => {
    viewport = new FakeBrowserViewport();

    TestBed.configureTestingModule({
      providers: [
        BrowserUrlPolicy,
        ExploreReadingChapterNavigator,
        ManualChapterNavigationRuleWorkflow,
        ExploreBrowserFacade,
        { provide: BROWSER_SESSION_STORE, useClass: FakeBrowserSessionStore },
        { provide: BROWSER_VIEWPORT, useValue: viewport },
        { provide: EXTERNAL_URL_OPENER, useClass: FakeExternalUrlOpener },
        {
          provide: MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
          useClass: FakeManualChapterNavigationRuleRepository,
        },
      ],
    });

    facade = TestBed.inject(ExploreBrowserFacade);
  });

  it('exposes workflow state backed by injected browser dependencies', async () => {
    facade.updateInputValue('example.com');

    const result = await facade.openInput();

    expect(result.ok).toBeTrue();
    expect(facade.currentUrl()).toBe('https://example.com/');
    expect(viewport.loadedUrls).toEqual(['https://example.com/']);
  });

  it('destroys the workflow viewport subscription', () => {
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

  it('passes through browser commands to the workflow boundary', async () => {
    await facade.initialize();
    facade.updateInputValue('not a url');

    await expectAsync(facade.openInput()).toBeResolvedTo({ ok: false });
    await expectAsync(facade.openInputInNewTab()).toBeResolvedTo({ ok: false });
    await expectAsync(facade.resumeTab('missing-tab')).toBeResolvedTo({ ok: false });
    await expectAsync(facade.resumeLastUrl()).toBeResolvedTo({ ok: false });
    await facade.createBlankTab();
    await facade.selectTab('missing-tab');
    await facade.closeTab('missing-tab');
    await expectAsync(facade.retryCurrentUrl()).toBeResolvedTo({ ok: false });
    await facade.showViewport({ left: 0, top: 0, width: 100, height: 200 });
    await facade.hideViewport();
    await facade.closeBrowser();
    await facade.stopOrReload();
    await expectAsync(facade.goBack()).toBeResolvedTo({ didNavigate: false });
    await facade.goForward();
    await facade.copyCurrentUrl();
    await facade.openCurrentUrlExternally();
    await facade.openSecureNavigationFailureExternally();
    await expectAsync(facade.openReadingMode()).toBeResolvedTo({ ok: false });
    facade.closeReadingMode();
    facade.discardReadingMode();
    await facade.rememberActiveTabLibrarySeriesTitle('Unread');
    await expectAsync(facade.openReadingModeLink('/next')).toBeResolvedTo({ ok: false });
    await expectAsync(facade.navigateReadingChapter('next')).toBeResolvedTo({ ok: false });
    await expectAsync(
      facade.previewManualChapterNavigation({
        direction: 'next',
        selectorMode: 'link',
        selector: 'a.next',
        selectedHref: null,
      }),
    ).toBeResolvedTo(viewport.previewResult);
    facade.dismissNotice();

    expect(facade.activeTab()?.url).toBeNull();
    expect(facade.secureNavigationFailure()).toBeNull();
  });

  it('saves manual chapter navigation rules and dismisses source-link context on success', async () => {
    viewport.emit({
      type: 'sourceLinkLongPressed',
      event: {
        link: {
          pageUrl: 'https://example.com/story/1',
          href: 'https://example.com/story/2',
          text: 'Next',
          attributes: [],
          ancestors: [],
        },
      },
    });

    const result = await facade.saveManualChapterNavigationRule({
      sourceUrl: 'https://example.com/story/1',
      direction: 'next',
      scopePathPrefix: '/story/',
      selectorMode: 'link',
      selector: 'a.next',
      selectedHref: 'https://example.com/story/2',
    });

    expect(result.ok).toBeTrue();
    expect(facade.sourceLinkLongPress()).toBeNull();

    viewport.emit({
      type: 'sourceLinkLongPressed',
      event: {
        link: {
          pageUrl: 'https://example.com/story/1',
          href: 'https://example.com/story/2',
          text: 'Next',
          attributes: [],
          ancestors: [],
        },
      },
    });
    facade.dismissSourceLinkLongPress();

    expect(facade.sourceLinkLongPress()).toBeNull();
  });
});
