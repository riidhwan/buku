import { signal, type Signal } from '@angular/core';

export interface ExploreBrowserPageActionsBrowser {
  readonly currentUrl: Signal<string | null>;
  updateInputValue(value: string): void;
}

export interface ExploreBrowserPageActionsViewport {
  scheduleViewportRectUpdate(): void;
}

export class ExploreBrowserPageActions {
  public readonly actionsOpen = signal(false);
  public readonly addressBarFocused = signal(false);

  public constructor(
    private readonly browser: ExploreBrowserPageActionsBrowser,
    private readonly viewport: ExploreBrowserPageActionsViewport,
  ) {}

  public isAddressBarFocused(): boolean {
    return this.addressBarFocused();
  }

  public isActionsOpen(): boolean {
    return this.actionsOpen();
  }

  public focusAddressBar(): void {
    this.addressBarFocused.set(true);
    if (this.actionsOpen()) {
      this.closeActions();
      this.viewport.scheduleViewportRectUpdate();
    }
  }

  public blurAddressBar(): void {
    this.addressBarFocused.set(false);
    this.browser.updateInputValue(this.browser.currentUrl() ?? '');
  }

  public clearAddressBar(): void {
    this.browser.updateInputValue('');
  }

  public openActions(): void {
    this.actionsOpen.update((isOpen) => !isOpen);
    this.viewport.scheduleViewportRectUpdate();
  }

  public closeActions(): void {
    this.actionsOpen.set(false);
  }
}
