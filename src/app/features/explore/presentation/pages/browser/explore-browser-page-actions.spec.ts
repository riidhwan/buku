import { signal } from '@angular/core';
import {
  ExploreBrowserPageActions,
  type ExploreBrowserPageActionsBrowser,
  type ExploreBrowserPageActionsViewport,
} from './explore-browser-page-actions';

class FakeBrowser implements ExploreBrowserPageActionsBrowser {
  public readonly currentUrl = signal<string | null>('https://example.com/');
  public inputValue = 'https://example.com/';

  public updateInputValue(value: string): void {
    this.inputValue = value;
  }
}

class FakeViewport implements ExploreBrowserPageActionsViewport {
  public scheduleCount = 0;

  public scheduleViewportRectUpdate(): void {
    this.scheduleCount += 1;
  }
}

function createActions(): {
  readonly actions: ExploreBrowserPageActions;
  readonly browser: FakeBrowser;
  readonly viewport: FakeViewport;
} {
  const browser = new FakeBrowser();
  const viewport = new FakeViewport();

  return {
    actions: new ExploreBrowserPageActions(browser, viewport),
    browser,
    viewport,
  };
}

describe('ExploreBrowserPageActions', () => {
  it('opens and closes browser actions while scheduling native viewport updates', () => {
    const { actions, viewport } = createActions();

    actions.openActions();

    expect(actions.isActionsOpen()).toBeTrue();
    expect(actions.actionsOpen()).toBeTrue();
    expect(viewport.scheduleCount).toBe(1);

    actions.closeActions();

    expect(actions.isActionsOpen()).toBeFalse();
    expect(actions.actionsOpen()).toBeFalse();
  });

  it('focuses the address bar without repositioning when browser actions are already closed', () => {
    const { actions, viewport } = createActions();

    actions.focusAddressBar();

    expect(actions.isAddressBarFocused()).toBeTrue();
    expect(viewport.scheduleCount).toBe(0);
  });

  it('closes browser actions and repositions the viewport when the address bar focuses', () => {
    const { actions, viewport } = createActions();
    actions.openActions();
    viewport.scheduleCount = 0;

    actions.focusAddressBar();

    expect(actions.isAddressBarFocused()).toBeTrue();
    expect(actions.isActionsOpen()).toBeFalse();
    expect(viewport.scheduleCount).toBe(1);
  });

  it('restores the loaded URL when the address bar blurs', () => {
    const { actions, browser } = createActions();
    browser.inputValue = 'https://draft.example/';

    actions.blurAddressBar();

    expect(actions.isAddressBarFocused()).toBeFalse();
    expect(browser.inputValue).toBe('https://example.com/');
  });

  it('restores an empty input when a blank tab address bar blurs', () => {
    const { actions, browser } = createActions();
    browser.currentUrl.set(null);
    browser.inputValue = 'https://draft.example/';

    actions.blurAddressBar();

    expect(browser.inputValue).toBe('');
  });

  it('clears the address input without changing menu state', () => {
    const { actions, browser, viewport } = createActions();

    actions.clearAddressBar();

    expect(browser.inputValue).toBe('');
    expect(actions.isActionsOpen()).toBeFalse();
    expect(viewport.scheduleCount).toBe(0);
  });
});
