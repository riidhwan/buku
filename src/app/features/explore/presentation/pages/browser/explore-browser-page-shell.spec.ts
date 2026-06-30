import { signal } from '@angular/core';
import type { IonInput, Platform } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import type { BrowserViewportRect } from '../../../application/ports/browser-viewport.port';
import {
  ExploreBrowserPageShell,
  type ExploreBrowserPageShellBrowser,
  type ExploreBrowserPageShellHost,
} from './explore-browser-page-shell';

type BackButtonCallback = (processNextHandler: () => void) => Promise<unknown> | undefined;

class FakeBrowser implements ExploreBrowserPageShellBrowser {
  public readonly readingModeActive = signal(false);
  public readonly canGoBack = signal(false);
  public shownRects: BrowserViewportRect[] = [];
  public hideCount = 0;
  public closeReadingModeCount = 0;
  public backNavigationCount = 0;
  public backDidNavigate = true;

  public showViewport(rect: BrowserViewportRect): Promise<void> {
    this.shownRects.push(rect);
    return Promise.resolve();
  }

  public hideViewport(): Promise<void> {
    this.hideCount += 1;
    return Promise.resolve();
  }

  public closeReadingMode(): void {
    this.closeReadingModeCount += 1;
    this.readingModeActive.set(false);
  }

  public goBack(): Promise<{ readonly didNavigate: boolean }> {
    this.backNavigationCount += 1;
    return Promise.resolve({ didNavigate: this.backDidNavigate });
  }
}

class FakeBackButton {
  private callback: BackButtonCallback | null = null;
  public processNextCount = 0;
  public priority: number | null = null;
  public unsubscribeCount = 0;

  public subscribeWithPriority(priority: number, callback: BackButtonCallback): Subscription {
    this.priority = priority;
    this.callback = callback;
    return new Subscription(() => {
      this.unsubscribeCount += 1;
      if (this.callback === callback) {
        this.callback = null;
      }
    });
  }

  public async trigger(): Promise<void> {
    await this.callback?.(() => {
      this.processNextCount += 1;
    });
  }
}

class FakeHost implements ExploreBrowserPageShellHost {
  public addressBarFocused = false;
  public actionsOpen = false;
  public blurAddressBarCount = 0;
  public closeActionsCount = 0;
  public inputBlurCount = 0;
  private readonly viewportElement = document.createElement('section');

  public constructor() {
    spyOn(this.viewportElement, 'getBoundingClientRect').and.returnValue(
      DOMRect.fromRect({ x: 1, y: 2, width: 300, height: 400 }),
    );
  }

  public isAddressBarFocused(): boolean {
    return this.addressBarFocused;
  }

  public blurAddressBar(): void {
    this.blurAddressBarCount += 1;
    this.addressBarFocused = false;
  }

  public getAddressInput(): IonInput {
    return {
      getInputElement: () =>
        Promise.resolve({
          blur: () => {
            this.inputBlurCount += 1;
          },
        } as HTMLInputElement),
    } as unknown as IonInput;
  }

  public isActionsOpen(): boolean {
    return this.actionsOpen;
  }

  public closeActions(): void {
    this.closeActionsCount += 1;
    this.actionsOpen = false;
  }

  public getViewportElement(): HTMLElement {
    return this.viewportElement;
  }
}

function createShell(): {
  readonly browser: FakeBrowser;
  readonly host: FakeHost;
  readonly backButton: FakeBackButton;
  readonly shell: ExploreBrowserPageShell;
} {
  const browser = new FakeBrowser();
  const host = new FakeHost();
  const backButton = new FakeBackButton();
  const platform = { backButton } as unknown as Platform;

  return {
    browser,
    host,
    backButton,
    shell: new ExploreBrowserPageShell(browser, host, platform),
  };
}

async function waitForViewportTimer(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve);
  });
}

describe('ExploreBrowserPageShell', () => {
  it('registers Android back handling and shows the native viewport after view init', async () => {
    const { browser, backButton, shell } = createShell();

    shell.afterViewInit();
    await waitForViewportTimer();

    expect(backButton.priority).toBe(10);
    expect(browser.shownRects).toEqual([{ left: 1, top: 2, width: 300, height: 400 }]);
  });

  it('updates the native viewport when the page layout changes', async () => {
    const { browser, shell } = createShell();

    shell.afterViewInit();
    browser.shownRects = [];

    shell.scheduleViewportRectUpdate();
    shell.scheduleViewportRectUpdate();
    await waitForViewportTimer();

    expect(browser.shownRects).toEqual([{ left: 1, top: 2, width: 300, height: 400 }]);
  });

  it('tears down native viewport ownership when the page leaves and is destroyed', () => {
    const { browser, backButton, shell } = createShell();

    shell.afterViewInit();
    shell.ionViewWillLeave();
    shell.destroy();

    expect(backButton.unsubscribeCount).toBe(1);
    expect(browser.hideCount).toBe(2);
  });

  it('blurs focused address input before handling browser history', async () => {
    const { browser, host, backButton, shell } = createShell();
    host.addressBarFocused = true;
    browser.canGoBack.set(true);
    shell.afterViewInit();

    await backButton.trigger();

    expect(host.blurAddressBarCount).toBe(1);
    expect(host.inputBlurCount).toBe(1);
    expect(browser.backNavigationCount).toBe(0);
    expect(backButton.processNextCount).toBe(0);
  });

  it('closes open browser actions before handling browser history', async () => {
    const { browser, host, backButton, shell } = createShell();
    host.actionsOpen = true;
    browser.canGoBack.set(true);
    shell.afterViewInit();

    await backButton.trigger();
    await waitForViewportTimer();

    expect(host.closeActionsCount).toBe(1);
    expect(browser.backNavigationCount).toBe(0);
    expect(browser.shownRects.length).toBe(2);
    expect(backButton.processNextCount).toBe(0);
  });

  it('closes Reading Mode before handling browser history', async () => {
    const { browser, backButton, shell } = createShell();
    browser.readingModeActive.set(true);
    browser.canGoBack.set(true);
    shell.afterViewInit();

    await backButton.trigger();

    expect(browser.closeReadingModeCount).toBe(1);
    expect(browser.backNavigationCount).toBe(0);
    expect(backButton.processNextCount).toBe(0);
  });

  it('passes Android back onward when browser history cannot navigate', async () => {
    const { browser, backButton, shell } = createShell();
    browser.canGoBack.set(true);
    browser.backDidNavigate = false;
    shell.afterViewInit();

    await backButton.trigger();

    expect(browser.backNavigationCount).toBe(1);
    expect(backButton.processNextCount).toBe(1);
  });
});
