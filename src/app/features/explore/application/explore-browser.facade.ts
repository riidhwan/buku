import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { BrowserUrlPolicy } from './browser-url-policy';
import { BROWSER_SESSION_STORE, BrowserSessionStorePort } from './ports/browser-session-store.port';
import {
  BROWSER_VIEWPORT,
  BrowserCapability,
  BrowserViewportEvent,
  BrowserViewportPort,
  BrowserViewportRect,
} from './ports/browser-viewport.port';
import { EXTERNAL_URL_OPENER, ExternalUrlOpenerPort } from './ports/external-url-opener.port';

export type BrowserNoticeKind = 'loadFailed' | 'unsupportedCapability' | 'copied';

export interface BrowserNotice {
  readonly kind: BrowserNoticeKind;
  readonly message: string;
  readonly url: string | null;
}

export interface BrowserOpenResult {
  readonly ok: boolean;
}

const capabilityMessages: Record<BrowserCapability, string> = {
  camera: 'Camera access is not supported in Explore Browser.',
  customScheme: 'This link type is not supported in Explore Browser.',
  download: 'Downloads are not supported in Explore Browser.',
  fileUpload: 'File upload is not supported in Explore Browser.',
  geolocation: 'Location access is not supported in Explore Browser.',
  microphone: 'Microphone access is not supported in Explore Browser.',
  newWindow: 'Pop-up windows are opened in the current Explore Browser session when possible.',
  unknown: 'This page requested something Explore Browser does not support.',
};

@Injectable()
export class ExploreBrowserFacade implements OnDestroy {
  private readonly urlPolicy = inject(BrowserUrlPolicy);
  private readonly sessionStore = inject<BrowserSessionStorePort>(BROWSER_SESSION_STORE);
  private readonly viewport = inject<BrowserViewportPort>(BROWSER_VIEWPORT);
  private readonly externalUrlOpener = inject<ExternalUrlOpenerPort>(EXTERNAL_URL_OPENER);
  private readonly viewportSubscription: Subscription;

  private readonly inputValueSignal = signal('');
  private readonly currentUrlSignal = signal<string | null>(null);
  private readonly lastUrlSignal = signal<string | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly canGoBackSignal = signal(false);
  private readonly canGoForwardSignal = signal(false);
  private readonly validationErrorSignal = signal<string | null>(null);
  private readonly noticeSignal = signal<BrowserNotice | null>(null);

  public readonly inputValue = this.inputValueSignal.asReadonly();
  public readonly currentUrl = this.currentUrlSignal.asReadonly();
  public readonly lastUrl = this.lastUrlSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly canGoBack = this.canGoBackSignal.asReadonly();
  public readonly canGoForward = this.canGoForwardSignal.asReadonly();
  public readonly validationError = this.validationErrorSignal.asReadonly();
  public readonly notice = this.noticeSignal.asReadonly();
  public readonly isSecure = computed(
    () => this.currentUrlSignal()?.startsWith('https://') ?? false,
  );
  public readonly isInsecure = computed(
    () => this.currentUrlSignal()?.startsWith('http://') ?? false,
  );

  public constructor() {
    this.viewportSubscription = this.viewport.events$.subscribe((event) => {
      this.handleViewportEvent(event);
    });
  }

  public ngOnDestroy(): void {
    this.viewportSubscription.unsubscribe();
  }

  public async initialize(): Promise<void> {
    const lastUrl = await this.sessionStore.readLastUrl();
    this.lastUrlSignal.set(lastUrl);
  }

  public updateInputValue(value: string): void {
    this.inputValueSignal.set(value);
    this.validationErrorSignal.set(null);
  }

  public async openInput(): Promise<BrowserOpenResult> {
    return this.openRawValue(this.inputValueSignal());
  }

  public async resumeLastUrl(): Promise<BrowserOpenResult> {
    const lastUrl = this.lastUrlSignal();
    if (lastUrl === null) {
      return { ok: false };
    }

    this.inputValueSignal.set(lastUrl);
    return this.openRawValue(lastUrl);
  }

  public async retryCurrentUrl(): Promise<BrowserOpenResult> {
    const currentUrl = this.currentUrlSignal();
    if (currentUrl === null) {
      return { ok: false };
    }

    await this.viewport.load(currentUrl);
    return { ok: true };
  }

  public async showViewport(rect: BrowserViewportRect): Promise<void> {
    await this.viewport.show(rect);
  }

  public async hideViewport(): Promise<void> {
    await this.viewport.hide();
  }

  public async closeBrowser(): Promise<void> {
    await this.viewport.hide();
  }

  public async stopOrReload(): Promise<void> {
    if (this.loadingSignal()) {
      await this.viewport.stop();
      this.loadingSignal.set(false);
      return;
    }

    await this.viewport.reload();
  }

  public async goBack(): Promise<void> {
    if (this.canGoBackSignal()) {
      await this.viewport.back();
    }
  }

  public async goForward(): Promise<void> {
    if (this.canGoForwardSignal()) {
      await this.viewport.forward();
    }
  }

  public async copyCurrentUrl(): Promise<void> {
    const currentUrl = this.currentUrlSignal();
    if (currentUrl === null) {
      return;
    }

    await this.viewport.copyUrl(currentUrl);
    this.noticeSignal.set({
      kind: 'copied',
      message: 'URL copied.',
      url: currentUrl,
    });
  }

  public async openCurrentUrlExternally(): Promise<void> {
    const currentUrl = this.currentUrlSignal();
    if (currentUrl === null) {
      return;
    }

    await this.externalUrlOpener.open(currentUrl);
  }

  public dismissNotice(): void {
    this.noticeSignal.set(null);
  }

  private async openRawValue(value: string): Promise<BrowserOpenResult> {
    const normalized = this.urlPolicy.normalize(value);

    if (!normalized.ok) {
      this.validationErrorSignal.set(normalized.message);
      return { ok: false };
    }

    this.validationErrorSignal.set(null);
    this.inputValueSignal.set(normalized.url);
    this.currentUrlSignal.set(normalized.url);
    this.loadingSignal.set(true);
    await this.viewport.load(normalized.url);
    return { ok: true };
  }

  private handleViewportEvent(event: BrowserViewportEvent): void {
    switch (event.type) {
      case 'navigation':
        this.currentUrlSignal.set(event.state.url);
        this.inputValueSignal.set(event.state.url);
        this.loadingSignal.set(event.state.loading);
        this.canGoBackSignal.set(event.state.canGoBack);
        this.canGoForwardSignal.set(event.state.canGoForward);
        if (event.committed) {
          this.lastUrlSignal.set(event.state.url);
          void this.sessionStore.writeLastUrl(event.state.url);
        }
        break;
      case 'loadFailed':
        this.loadingSignal.set(false);
        this.noticeSignal.set({
          kind: 'loadFailed',
          message: `Page failed to load: ${event.event.description}`,
          url: event.event.url,
        });
        break;
      case 'capabilityUnsupported':
        this.noticeSignal.set({
          kind: 'unsupportedCapability',
          message: capabilityMessages[event.event.capability],
          url: event.event.url,
        });
        break;
    }
  }
}
