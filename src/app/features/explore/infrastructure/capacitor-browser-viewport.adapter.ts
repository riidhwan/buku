import { inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
  BrowserCapability,
  BrowserViewportEvent,
  BrowserViewportPort,
  BrowserViewportRect,
} from '../application/ports/browser-viewport.port';
import { EXPLORE_BROWSER_PLUGIN, NativeBrowserCapabilityEvent } from './capacitor-explore-browser';

const browserCapabilities = new Set<BrowserCapability>([
  'camera',
  'customScheme',
  'download',
  'fileUpload',
  'geolocation',
  'microphone',
  'newWindow',
  'unknown',
]);

@Injectable()
export class CapacitorBrowserViewportAdapter implements BrowserViewportPort {
  private readonly eventsSubject = new Subject<BrowserViewportEvent>();
  private readonly plugin = inject(EXPLORE_BROWSER_PLUGIN);

  public readonly events$ = this.eventsSubject.asObservable();

  public constructor() {
    void this.registerListeners();
  }

  public async show(rect: BrowserViewportRect): Promise<void> {
    await this.plugin.show({ rect });
  }

  public async hide(): Promise<void> {
    await this.plugin.hide();
  }

  public async destroy(): Promise<void> {
    await this.plugin.destroy();
  }

  public async load(url: string): Promise<void> {
    await this.plugin.load({ url });
  }

  public async stop(): Promise<void> {
    await this.plugin.stop();
  }

  public async reload(): Promise<void> {
    await this.plugin.reload();
  }

  public async back(): Promise<void> {
    await this.plugin.back();
  }

  public async forward(): Promise<void> {
    await this.plugin.forward();
  }

  public async copyUrl(url: string): Promise<void> {
    await this.plugin.copyUrl({ url });
  }

  private async registerListeners(): Promise<void> {
    await this.plugin.addListener('navigationState', (event) => {
      this.eventsSubject.next({
        type: 'navigation',
        state: {
          url: event.url,
          loading: event.loading,
          canGoBack: event.canGoBack,
          canGoForward: event.canGoForward,
        },
        committed: event.committed,
      });
    });

    await this.plugin.addListener('loadFailed', (event) => {
      this.eventsSubject.next({
        type: 'loadFailed',
        event,
      });
    });

    await this.plugin.addListener('capabilityUnsupported', (event) => {
      this.eventsSubject.next({
        type: 'capabilityUnsupported',
        event: {
          capability: this.toBrowserCapability(event),
          url: event.url,
        },
      });
    });
  }

  private toBrowserCapability(event: NativeBrowserCapabilityEvent): BrowserCapability {
    return browserCapabilities.has(event.capability as BrowserCapability)
      ? (event.capability as BrowserCapability)
      : 'unknown';
  }
}
