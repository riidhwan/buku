import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import type { ExploreBrowserTab } from '../../../application/ports/browser-session-store.port';
import {
  READING_LIBRARY_SAVE,
  ReadingLibrarySeriesOption,
} from '../../../application/ports/reading-library-save.port';
import { BrowserViewportRect } from '../../../application/ports/browser-viewport.port';
import { ReadingArticleSnapshot } from '../../../domain/reading-article';
import { ExploreBrowserReaderSaveActions } from './explore-browser-reader-save-actions';
import { ExploreBrowserPage } from './explore-browser.page';

type BackButtonCallback = (processNextHandler: () => void) => Promise<unknown> | undefined;

const articleSnapshot: ReadingArticleSnapshot = {
  url: 'https://example.com/article',
  title: 'Readable article',
  byline: 'A Writer',
  siteName: 'Example',
  excerpt: 'A short summary.',
  publishedTime: '2026-06-26',
  contentHtml: '<p>Readable body.</p><p><a href="/next">Next article</a></p>',
  textContent: 'Readable body. Next article',
  length: 27,
  nextChapter: {
    href: '/next-chapter',
    label: 'Next chapter',
  },
};

class FakeExploreBrowserFacade {
  public readonly inputValue = signal('https://example.com/');
  public readonly validationError = signal<string | null>(null);
  public readonly currentUrl = signal<string | null>('https://example.com/');
  public readonly loading = signal(false);
  public readonly canGoBack = signal(false);
  public readonly canGoForward = signal(false);
  public readonly isSecure = signal(true);
  public readonly readingModeActive = signal(false);
  public readonly readingArticle = signal<ReadingArticleSnapshot | null>(null);
  public readonly chapterNavigationLoading = signal(false);
  public readonly tabs = signal<readonly ExploreBrowserTab[]>([
    {
      id: 'tab-1',
      url: 'https://example.com/',
      pageTitle: 'Example',
      backStack: [],
      lastLibrarySeriesTitle: null as string | null,
    },
  ]);
  public readonly activeTab = signal({
    id: 'tab-1',
    url: 'https://example.com/',
    pageTitle: 'Example',
    backStack: [],
    lastLibrarySeriesTitle: null as string | null,
  });
  public readonly notice = signal<{ readonly message: string; readonly url: string | null } | null>(
    null,
  );
  public shownRect: BrowserViewportRect | null = null;
  public showCount = 0;
  public hidden = 0;
  public openInputs = 0;
  public openedExternally = 0;
  public dismissed = 0;
  public closed = 0;
  public copied = 0;
  public backNavigations = 0;
  public backDidNavigate = true;
  public reloads = 0;
  public readingModeOpens = 0;
  public readingModeResult = true;
  public openedHref: string | null = null;
  public chapterDirection: 'previous' | 'next' | null = null;
  public rememberedSeriesTitle: string | null = null;
  public initializeCount = 0;

  public initialize(): Promise<void> {
    this.initializeCount += 1;
    return Promise.resolve();
  }

  public updateInputValue(value: string): void {
    this.inputValue.set(value);
  }

  public openInput(): Promise<{ readonly ok: boolean }> {
    this.openInputs += 1;
    return Promise.resolve({ ok: true });
  }

  public showViewport(rect: BrowserViewportRect): Promise<void> {
    this.showCount += 1;
    this.shownRect = rect;
    return Promise.resolve();
  }

  public hideViewport(): Promise<void> {
    this.hidden += 1;
    return Promise.resolve();
  }

  public closeBrowser(): Promise<void> {
    this.closed += 1;
    return Promise.resolve();
  }

  public goBack(): Promise<{ readonly didNavigate: boolean }> {
    this.backNavigations += 1;
    return Promise.resolve({ didNavigate: this.backDidNavigate });
  }

  public goForward(): Promise<void> {
    return Promise.resolve();
  }

  public stopOrReload(): Promise<void> {
    this.reloads += 1;
    return Promise.resolve();
  }

  public copyCurrentUrl(): Promise<void> {
    this.copied += 1;
    return Promise.resolve();
  }

  public openCurrentUrlExternally(): Promise<void> {
    this.openedExternally += 1;
    return Promise.resolve();
  }

  public openReadingMode(): Promise<{ readonly ok: boolean }> {
    this.readingModeOpens += 1;
    if (this.readingModeResult) {
      this.readingModeActive.update((isActive) => !isActive);
    }
    return Promise.resolve({ ok: this.readingModeResult });
  }

  public closeReadingMode(): void {
    this.readingModeActive.set(false);
  }

  public openReadingModeLink(href: string): Promise<{ readonly ok: boolean }> {
    this.openedHref = href;
    this.readingModeActive.set(false);
    this.readingArticle.set(null);
    return Promise.resolve({ ok: true });
  }

  public navigateReadingChapter(
    direction: 'previous' | 'next',
  ): Promise<{ readonly ok: true; readonly destination: 'reader' | 'browser' }> {
    this.chapterDirection = direction;
    return Promise.resolve({ ok: true, destination: 'reader' });
  }

  public rememberActiveTabLibrarySeriesTitle(title: string): Promise<void> {
    this.rememberedSeriesTitle = title;
    this.activeTab.update((tab) => ({ ...tab, lastLibrarySeriesTitle: title }));
    return Promise.resolve();
  }

  public dismissNotice(): void {
    this.dismissed += 1;
  }
}

class FakeReadingLibrarySave {
  public readonly savedInputs: unknown[] = [];

  public listSeries(): Promise<readonly ReadingLibrarySeriesOption[]> {
    return Promise.resolve([
      {
        id: 'series-1',
        title: 'Existing Series',
        entryCount: 2,
        lastSavedAt: '2026-06-26T10:00:00.000Z',
      },
    ]);
  }

  public save(input: unknown): Promise<{ readonly status: 'saved' }> {
    this.savedInputs.push(input);
    return Promise.resolve({ status: 'saved' });
  }
}

class FakeRouter {
  public readonly navigations: string[][] = [];

  public navigate(commands: string[]): Promise<boolean> {
    this.navigations.push(commands);
    return Promise.resolve(true);
  }
}

class FakeBackButton {
  private callback: BackButtonCallback | null = null;
  public priority: number | null = null;
  public processNextCalls = 0;
  public unsubscribed = false;

  public subscribeWithPriority(priority: number, callback: BackButtonCallback): Subscription {
    this.priority = priority;
    this.callback = callback;
    return new Subscription(() => {
      this.unsubscribed = true;
      if (this.callback === callback) {
        this.callback = null;
      }
    });
  }

  public async trigger(): Promise<void> {
    await this.callback?.(() => {
      this.processNextCalls += 1;
    });
  }
}

class FakePlatform {
  public readonly backButton = new FakeBackButton();
}

interface ExploreBrowserPageHarness {
  readonly readerSave: ExploreBrowserReaderSaveActions;
  ionViewWillLeave(): void;
  openReadingMode(): Promise<void>;
  openReaderLink(event: Event): Promise<void>;
  navigateChapter(direction: 'previous' | 'next'): Promise<void>;
  formatPublishedTime(publishedTime: string): string;
}

function isIonButtonDisabled(button: Element): boolean {
  return (
    button.hasAttribute('disabled') ||
    ((button as HTMLElement & { readonly disabled?: boolean }).disabled ?? false)
  );
}

function getEndToolbarButtons(nativeElement: HTMLElement): NodeListOf<Element> {
  return nativeElement.querySelectorAll('ion-toolbar ion-buttons[slot="end"] ion-button');
}

function getReadingModeButton(nativeElement: HTMLElement): Element {
  return getEndToolbarButtons(nativeElement).item(0);
}

function getTabsButton(nativeElement: HTMLElement): Element {
  return getEndToolbarButtons(nativeElement).item(1);
}

function getOverflowButton(nativeElement: HTMLElement): Element {
  return getEndToolbarButtons(nativeElement).item(2);
}

function getTabsIcon(button: Element): Element {
  const icon = button.querySelector('.tab-count-icon');
  if (icon === null) {
    throw new Error('Expected the tabs button to render a tab count icon.');
  }

  return icon;
}

function waitForViewportTimer(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve);
  });
}

describe('ExploreBrowserPage', () => {
  let fixture: ComponentFixture<ExploreBrowserPage>;
  let browser: FakeExploreBrowserFacade;
  let router: FakeRouter;
  let platform: FakePlatform;
  let librarySave: FakeReadingLibrarySave;

  beforeEach(async () => {
    browser = new FakeExploreBrowserFacade();
    router = new FakeRouter();
    platform = new FakePlatform();
    librarySave = new FakeReadingLibrarySave();

    await TestBed.configureTestingModule({
      imports: [ExploreBrowserPage],
      providers: [
        { provide: ExploreBrowserFacade, useValue: browser },
        { provide: READING_LIBRARY_SAVE, useValue: librarySave },
        { provide: Router, useValue: router },
        { provide: Platform, useValue: platform },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreBrowserPage);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows the native viewport inside the page content rectangle', () => {
    expect(browser.shownRect).not.toBeNull();
    expect(browser.initializeCount).toBe(1);
  });

  it('lets the application URL policy validate bare domains in the address bar', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('url');
  });

  it('updates URL input state and submits edited URLs', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);
    const form = nativeElement.querySelectorAll('form').item(0);

    input.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: { value: 'https://edited.example/' },
      }),
    );
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(browser.inputValue()).toBe('https://edited.example/');
    expect(browser.openInputs).toBe(1);
  });

  it('opens the dedicated tabs view from the toolbar', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const tabsButton = getTabsButton(nativeElement);

    tabsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.hidden).toBe(1);
    expect(router.navigations).toEqual([['explore', 'browser', 'tabs']]);
  });

  it('keeps the overflow toolbar menu at the right edge', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const buttons = getEndToolbarButtons(nativeElement);

    expect(buttons.item(0).querySelector('ion-icon')?.getAttribute('name')).toBe('reader-outline');
    expect(getTabsIcon(buttons.item(1)).textContent.trim()).toBe('1');
    expect(buttons.item(2).querySelector('ion-icon')?.getAttribute('name')).toBe(
      'ellipsis-vertical-outline',
    );
  });

  it('shows the tab count in the tabs toolbar button', () => {
    browser.tabs.set([
      {
        id: 'tab-1',
        url: 'https://example.com/',
        pageTitle: 'Example',
        backStack: [],
        lastLibrarySeriesTitle: null,
      },
      {
        id: 'tab-2',
        url: null,
        pageTitle: null,
        backStack: [],
        lastLibrarySeriesTitle: null,
      },
    ]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const tabsButton = getTabsButton(nativeElement);

    expect(tabsButton.getAttribute('aria-label')).toBe('Open tabs, 2 tabs');
    expect(getTabsIcon(tabsButton).textContent.trim()).toBe('2');
  });

  it('shows only the clear button while the address input is focused', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    input.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
    fixture.detectChanges();

    const focusedButtons = getEndToolbarButtons(nativeElement);
    expect(focusedButtons.length).toBe(1);
    expect(focusedButtons.item(0).querySelector('ion-icon')?.getAttribute('name')).toBe(
      'close-outline',
    );

    input.dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
    fixture.detectChanges();

    expect(getEndToolbarButtons(nativeElement).length).toBe(3);
  });

  it('clears the address input from the focused toolbar button', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    browser.inputValue.set('https://edited.example/');
    input.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
    fixture.detectChanges();

    getEndToolbarButtons(nativeElement)
      .item(0)
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

    expect(browser.inputValue()).toBe('');
  });

  it('restores the loaded URL when edited address input loses focus without submit', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    browser.currentUrl.set('https://loaded.example/');
    input.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: { value: 'https://draft.example/' },
      }),
    );
    input.dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
    fixture.detectChanges();

    expect(browser.inputValue()).toBe('https://loaded.example/');
  });

  it('restores an empty address when a blank tab address input loses focus', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    browser.currentUrl.set(null);
    input.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: { value: 'https://draft.example/' },
      }),
    );
    input.dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
    fixture.detectChanges();

    expect(browser.inputValue()).toBe('');
  });

  it('closes browser controls when the address input is focused', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();
    expect(nativeElement.querySelector('.browser-controls')).not.toBeNull();
    const initialShowCount = browser.showCount;

    input.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
    fixture.detectChanges();
    await waitForViewportTimer();

    expect(fixture.componentInstance.pageActions.actionsOpen()).toBeFalse();
    expect(nativeElement.querySelector('.browser-controls')).toBeNull();
    expect(browser.showCount).toBeGreaterThan(initialShowCount);
  });

  it('treats empty browser URL input event values as an empty string', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    input.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: {},
      }),
    );

    expect(browser.inputValue()).toBe('');
  });

  it('repositions and hides the native viewport with page lifecycle events', async () => {
    window.dispatchEvent(new Event('resize'));
    await fixture.whenStable();

    fixture.destroy();

    expect(browser.shownRect).not.toBeNull();
    expect(browser.hidden).toBe(1);
  });

  it('subscribes to Android back above route navigation while the browser page exists', () => {
    expect(platform.backButton.priority).toBe(10);

    fixture.destroy();

    expect(platform.backButton.unsubscribed).toBeTrue();
  });

  it('hides browser controls until the overflow button opens them', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.browser-controls')).toBeNull();

    const overflowButton = getOverflowButton(nativeElement);

    overflowButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(nativeElement.querySelector('.browser-controls')).not.toBeNull();
    expect(fixture.componentInstance.pageActions.actionsOpen()).toBeTrue();
  });

  it('repositions the native viewport after opening browser controls', async () => {
    const initialShowCount = browser.showCount;

    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();
    await waitForViewportTimer();

    expect(browser.showCount).toBeGreaterThan(initialShowCount);
  });

  it('closes browser controls before navigating WebView history from Android back', async () => {
    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();
    const initialShowCount = browser.showCount;

    await platform.backButton.trigger();
    fixture.detectChanges();
    await waitForViewportTimer();

    expect(fixture.componentInstance.pageActions.actionsOpen()).toBeFalse();
    expect(browser.backNavigations).toBe(0);
    expect(browser.closed).toBe(0);
    expect(browser.showCount).toBeGreaterThan(initialShowCount);
    expect(platform.backButton.processNextCalls).toBe(0);
  });

  it('blurs the focused address input before navigating WebView history from Android back', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = nativeElement.querySelectorAll('ion-input').item(0);

    browser.currentUrl.set('https://loaded.example/');
    input.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: { value: 'https://draft.example/' },
      }),
    );
    input.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
    fixture.detectChanges();

    await platform.backButton.trigger();
    fixture.detectChanges();

    expect(fixture.componentInstance.pageActions.addressBarFocused()).toBeFalse();
    expect(browser.inputValue()).toBe('https://loaded.example/');
    expect(browser.backNavigations).toBe(0);
    expect(platform.backButton.processNextCalls).toBe(0);
  });

  it('navigates WebView history from Android back when available', async () => {
    browser.canGoBack.set(true);

    await platform.backButton.trigger();

    expect(browser.backNavigations).toBe(1);
    expect(browser.closed).toBe(0);
    expect(router.navigations).toEqual([]);
    expect(platform.backButton.processNextCalls).toBe(0);
  });

  it('passes Android back after leaving the cached browser page', async () => {
    browser.canGoBack.set(true);

    fixture.componentInstance.ionViewWillLeave();
    await platform.backButton.trigger();

    expect(browser.backNavigations).toBe(0);
    expect(platform.backButton.unsubscribed).toBeTrue();
  });

  it('passes Android back to the tab shell when stale history state no longer navigates', async () => {
    browser.canGoBack.set(true);
    browser.backDidNavigate = false;

    await platform.backButton.trigger();

    expect(browser.backNavigations).toBe(1);
    expect(browser.closed).toBe(0);
    expect(router.navigations).toEqual([]);
    expect(platform.backButton.processNextCalls).toBe(1);
  });

  it('passes Android back to the tab shell when WebView history is exhausted', async () => {
    await platform.backButton.trigger();

    expect(browser.backNavigations).toBe(0);
    expect(browser.closed).toBe(0);
    expect(router.navigations).toEqual([]);
    expect(platform.backButton.processNextCalls).toBe(1);
  });

  it('refreshes the native viewport after Ionic finishes entering the browser page', async () => {
    const initialShowCount = browser.showCount;

    fixture.componentInstance.ionViewDidEnter();
    await waitForViewportTimer();

    expect(browser.showCount).toBe(initialShowCount + 1);
  });

  it('hides the native viewport before Ionic leaves the cached browser page', () => {
    const component = fixture.componentInstance as unknown as ExploreBrowserPageHarness;

    component.ionViewWillLeave();

    expect(browser.hidden).toBe(1);
  });

  it('keeps only the latest pending viewport reposition timer', async () => {
    const initialShowCount = browser.showCount;

    fixture.componentInstance.pageActions.openActions();
    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();
    await waitForViewportTimer();

    expect(browser.showCount).toBe(initialShowCount + 1);
  });

  it('disables unavailable toolbar navigation controls after overflow opens', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const overflowButton = getOverflowButton(nativeElement);

    overflowButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = nativeElement.querySelectorAll('.browser-controls ion-button');

    expect(isIonButtonDisabled(buttons.item(0))).toBeTrue();
    expect(isIonButtonDisabled(buttons.item(1))).toBeTrue();
  });

  it('enables reading mode only when a current URL is not loading', () => {
    let nativeElement = fixture.nativeElement as HTMLElement;
    let readingModeButton = getReadingModeButton(nativeElement);
    expect(isIonButtonDisabled(readingModeButton)).toBeFalse();

    browser.loading.set(true);
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;
    readingModeButton = getReadingModeButton(nativeElement);
    expect(isIonButtonDisabled(readingModeButton)).toBeTrue();

    browser.loading.set(false);
    browser.currentUrl.set(null);
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;
    readingModeButton = getReadingModeButton(nativeElement);
    expect(isIonButtonDisabled(readingModeButton)).toBeTrue();
  });

  it('runs browser controls after overflow opens', async () => {
    browser.loading.set(true);
    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const buttons = nativeElement.querySelectorAll('.browser-controls ion-button');

    buttons.item(2).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons.item(3).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons.item(4).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.reloads).toBe(1);
    expect(browser.copied).toBe(1);
    expect(browser.openedExternally).toBe(1);
  });

  it('opens reading mode from the address bar toolbar', async () => {
    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const readingModeButton = getReadingModeButton(nativeElement);

    readingModeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.readingModeOpens).toBe(1);
    expect(fixture.componentInstance.pageActions.actionsOpen()).toBeFalse();
    expect(router.navigations).toEqual([]);
    expect(browser.readingModeActive()).toBeTrue();
  });

  it('refreshes the viewport when the reader icon closes active Reading Mode', async () => {
    browser.readingModeActive.set(true);
    const initialShowCount = browser.showCount;
    const component = fixture.componentInstance as unknown as ExploreBrowserPageHarness;

    await component.openReadingMode();
    await waitForViewportTimer();

    expect(browser.readingModeOpens).toBe(1);
    expect(browser.readingModeActive()).toBeFalse();
    expect(browser.showCount).toBeGreaterThan(initialShowCount);
  });

  it('renders retained article content inside the browser page while Reading Mode is active', async () => {
    browser.readingArticle.set(articleSnapshot);
    browser.readingModeActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.viewport-host')?.hasAttribute('hidden')).toBeTrue();
    expect(nativeElement.querySelector('.reader-article')?.hasAttribute('hidden')).toBeFalse();
    expect(nativeElement.querySelector('h1')?.textContent).toContain('Readable article');
    expect(nativeElement.querySelector('.reader-body')?.textContent).toContain('Readable body.');
  });

  it('shows reader controls only while Reading Mode is active and overflow is closed', async () => {
    browser.readingArticle.set(articleSnapshot);
    browser.readingModeActive.set(true);
    fixture.detectChanges();

    let nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('.reader-controls')).not.toBeNull();
    expect(nativeElement.querySelector('.browser-controls')).toBeNull();

    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();
    await fixture.whenStable();

    nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('.reader-controls')).toBeNull();
    expect(nativeElement.querySelector('.browser-controls')).not.toBeNull();
  });

  it('keeps reader chapter controls in stable slots while the loading indicator appears', () => {
    browser.readingArticle.set(articleSnapshot);
    browser.readingModeActive.set(true);
    fixture.detectChanges();

    let nativeElement = fixture.nativeElement as HTMLElement;
    let slots = Array.from(
      nativeElement.querySelectorAll('.reader-controls [data-reader-control]'),
    );
    expect(slots.map((slot) => slot.getAttribute('data-reader-control'))).toEqual([
      'save',
      'loading',
      'previous',
      'next',
    ]);
    expect(slots[1]?.querySelector('ion-spinner')).toBeNull();
    expect(slots[2]?.getAttribute('aria-label')).toBe('Previous chapter');
    expect(slots[3]?.getAttribute('aria-label')).toBe('Next chapter');

    browser.chapterNavigationLoading.set(true);
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;
    slots = Array.from(nativeElement.querySelectorAll('.reader-controls [data-reader-control]'));
    expect(slots.map((slot) => slot.getAttribute('data-reader-control'))).toEqual([
      'save',
      'loading',
      'previous',
      'next',
    ]);
    expect(slots[1]?.querySelector('ion-spinner[aria-label="Loading chapter"]')).not.toBeNull();
    expect(slots[2]?.getAttribute('aria-label')).toBe('Previous chapter');
    expect(slots[3]?.getAttribute('aria-label')).toBe('Next chapter');
  });

  it('navigates reader chapters and refreshes the viewport afterwards', async () => {
    const component = fixture.componentInstance as unknown as ExploreBrowserPageHarness;
    const initialShowCount = browser.showCount;

    await component.navigateChapter('next');
    await waitForViewportTimer();

    expect(browser.chapterDirection).toBe('next');
    expect(browser.showCount).toBeGreaterThan(initialShowCount);
  });

  it('exits Reading Mode before browser navigation from Android back', async () => {
    browser.readingArticle.set(articleSnapshot);
    browser.readingModeActive.set(true);

    await platform.backButton.trigger();

    expect(browser.readingModeActive()).toBeFalse();
    expect(browser.backNavigations).toBe(0);
    expect(browser.closed).toBe(0);
  });

  it('opens the Add to Library modal from the reader toolbar', async () => {
    browser.readingArticle.set(articleSnapshot);
    browser.readingModeActive.set(true);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const addButton = nativeElement.querySelector('.reader-controls ion-button');
    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as ExploreBrowserPageHarness;
    expect(component.readerSave.saveForm.modalOpen()).toBeTrue();
  });

  it('opens article links and ignores reader events that are not links', async () => {
    browser.readingArticle.set(articleSnapshot);
    browser.readingModeActive.set(true);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    nativeElement.querySelector('.reader-body')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBeNull();

    nativeElement.querySelector('.reader-body a')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBe('/next');
  });

  it('ignores reader events without an element target', async () => {
    const component = fixture.componentInstance as unknown as ExploreBrowserPageHarness;

    await component.openReaderLink(new Event('click'));

    expect(browser.openedHref).toBeNull();
  });

  it('uses raw published time text when the date cannot be parsed', () => {
    const component = fixture.componentInstance as unknown as ExploreBrowserPageHarness;

    expect(component.formatPublishedTime('unknown date')).toBe('unknown date');
  });

  it('stays on the browser when reading mode is unavailable', async () => {
    browser.readingModeResult = false;
    fixture.componentInstance.pageActions.openActions();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const readingModeButton = getReadingModeButton(nativeElement);

    readingModeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.readingModeOpens).toBe(1);
    expect(router.navigations).toEqual([]);
  });

  it('offers notice recovery actions', async () => {
    browser.notice.set({
      message: 'Downloads are not supported in Explore Browser.',
      url: 'https://example.com/file.pdf',
    });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const noticeButtons = nativeElement.querySelectorAll('ion-footer ion-button');
    noticeButtons.item(0).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.openedExternally).toBe(1);
    expect(browser.dismissed).toBe(1);
  });
});
