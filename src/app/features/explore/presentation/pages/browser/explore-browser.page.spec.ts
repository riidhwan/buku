import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import { BrowserViewportRect } from '../../../application/ports/browser-viewport.port';
import { ExploreBrowserPage } from './explore-browser.page';

type BackButtonCallback = (processNextHandler: () => void) => Promise<unknown> | undefined;

class FakeExploreBrowserFacade {
  public readonly inputValue = signal('https://example.com/');
  public readonly validationError = signal<string | null>(null);
  public readonly currentUrl = signal<string | null>('https://example.com/');
  public readonly loading = signal(false);
  public readonly canGoBack = signal(false);
  public readonly canGoForward = signal(false);
  public readonly isSecure = signal(true);
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
    return Promise.resolve({ ok: this.readingModeResult });
  }

  public dismissNotice(): void {
    this.dismissed += 1;
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

function isIonButtonDisabled(button: Element): boolean {
  return (
    button.hasAttribute('disabled') ||
    ((button as HTMLElement & { readonly disabled?: boolean }).disabled ?? false)
  );
}

function getEndToolbarButtons(nativeElement: HTMLElement): NodeListOf<Element> {
  return nativeElement.querySelectorAll('ion-toolbar ion-buttons[slot="end"] ion-button');
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

  beforeEach(async () => {
    browser = new FakeExploreBrowserFacade();
    router = new FakeRouter();
    platform = new FakePlatform();

    await TestBed.configureTestingModule({
      imports: [ExploreBrowserPage],
      providers: [
        { provide: ExploreBrowserFacade, useValue: browser },
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
    const tabsButton = getEndToolbarButtons(nativeElement).item(2);

    tabsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.hidden).toBe(1);
    expect(router.navigations).toEqual([['explore', 'browser', 'tabs']]);
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

    const overflowButton = getEndToolbarButtons(nativeElement).item(1);

    overflowButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(nativeElement.querySelector('.browser-controls')).not.toBeNull();
    expect(fixture.componentInstance.actionsOpen()).toBeTrue();
  });

  it('repositions the native viewport after opening browser controls', async () => {
    const initialShowCount = browser.showCount;

    fixture.componentInstance.openActions();
    fixture.detectChanges();
    await waitForViewportTimer();

    expect(browser.showCount).toBeGreaterThan(initialShowCount);
  });

  it('closes browser controls before navigating WebView history from Android back', async () => {
    fixture.componentInstance.openActions();
    fixture.detectChanges();
    const initialShowCount = browser.showCount;

    await platform.backButton.trigger();
    fixture.detectChanges();
    await waitForViewportTimer();

    expect(fixture.componentInstance.actionsOpen()).toBeFalse();
    expect(browser.backNavigations).toBe(0);
    expect(browser.closed).toBe(0);
    expect(browser.showCount).toBeGreaterThan(initialShowCount);
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

  it('closes from Android back when stale history state no longer navigates', async () => {
    browser.canGoBack.set(true);
    browser.backDidNavigate = false;

    await platform.backButton.trigger();

    expect(browser.backNavigations).toBe(1);
    expect(browser.closed).toBe(1);
    expect(router.navigations).toEqual([['explore']]);
    expect(platform.backButton.processNextCalls).toBe(0);
  });

  it('closes back to Explore from Android back when WebView history is exhausted', async () => {
    await platform.backButton.trigger();

    expect(browser.backNavigations).toBe(0);
    expect(browser.closed).toBe(1);
    expect(router.navigations).toEqual([['explore']]);
    expect(platform.backButton.processNextCalls).toBe(0);
  });

  it('refreshes the native viewport after Ionic finishes entering the browser page', async () => {
    const initialShowCount = browser.showCount;

    fixture.componentInstance.ionViewDidEnter();
    await waitForViewportTimer();

    expect(browser.showCount).toBe(initialShowCount + 1);
  });

  it('keeps only the latest pending viewport reposition timer', async () => {
    const initialShowCount = browser.showCount;

    fixture.componentInstance.openActions();
    fixture.componentInstance.openActions();
    fixture.detectChanges();
    await waitForViewportTimer();

    expect(browser.showCount).toBe(initialShowCount + 1);
  });

  it('disables unavailable toolbar navigation controls after overflow opens', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const overflowButton = getEndToolbarButtons(nativeElement).item(1);

    overflowButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = nativeElement.querySelectorAll('.browser-controls ion-button');

    expect(isIonButtonDisabled(buttons.item(0))).toBeTrue();
    expect(isIonButtonDisabled(buttons.item(1))).toBeTrue();
  });

  it('enables reading mode only when a current URL is not loading', () => {
    let nativeElement = fixture.nativeElement as HTMLElement;
    let readingModeButton = getEndToolbarButtons(nativeElement).item(0);
    expect(isIonButtonDisabled(readingModeButton)).toBeFalse();

    browser.loading.set(true);
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;
    readingModeButton = getEndToolbarButtons(nativeElement).item(0);
    expect(isIonButtonDisabled(readingModeButton)).toBeTrue();

    browser.loading.set(false);
    browser.currentUrl.set(null);
    fixture.detectChanges();

    nativeElement = fixture.nativeElement as HTMLElement;
    readingModeButton = getEndToolbarButtons(nativeElement).item(0);
    expect(isIonButtonDisabled(readingModeButton)).toBeTrue();
  });

  it('runs browser controls after overflow opens', async () => {
    browser.loading.set(true);
    fixture.componentInstance.openActions();
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
    fixture.componentInstance.openActions();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const readingModeButton = getEndToolbarButtons(nativeElement).item(0);

    readingModeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.readingModeOpens).toBe(1);
    expect(fixture.componentInstance.actionsOpen()).toBeFalse();
    expect(router.navigations).toEqual([['explore', 'reader']]);
  });

  it('stays on the browser when reading mode is unavailable', async () => {
    browser.readingModeResult = false;
    fixture.componentInstance.openActions();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const readingModeButton = getEndToolbarButtons(nativeElement).item(0);

    readingModeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.readingModeOpens).toBe(1);
    expect(router.navigations).toEqual([]);
  });

  it('closes back to Explore', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const closeButton = nativeElement.querySelectorAll('ion-header ion-button').item(0);

    closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.closed).toBe(1);
    expect(router.navigations).toEqual([['explore']]);
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
