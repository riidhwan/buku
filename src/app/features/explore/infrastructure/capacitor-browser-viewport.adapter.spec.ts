import { TestBed } from '@angular/core/testing';
import { BrowserViewportEvent } from '../application/ports/browser-viewport.port';
import {
  EXPLORE_BROWSER_PLUGIN,
  ExploreBrowserPlugin,
  NativeBrowserCapabilityEvent,
  NativeBrowserLoadFailedEvent,
  NativeBrowserNavigationState,
  NativeBrowserViewportRect,
} from './capacitor-explore-browser';
import { CapacitorBrowserViewportAdapter } from './capacitor-browser-viewport.adapter';

interface ListenerMap {
  navigationState?: (event: NativeBrowserNavigationState & { readonly committed: boolean }) => void;
  loadFailed?: (event: NativeBrowserLoadFailedEvent) => void;
  capabilityUnsupported?: (event: NativeBrowserCapabilityEvent) => void;
}

class FakeExploreBrowserPlugin implements ExploreBrowserPlugin {
  public readonly listeners: ListenerMap = {};
  public readonly calls: string[] = [];
  public shownRect: NativeBrowserViewportRect | null = null;
  public loadedUrl: string | null = null;
  public copiedUrl: string | null = null;

  public show(options: { readonly rect: NativeBrowserViewportRect }): Promise<void> {
    this.calls.push('show');
    this.shownRect = options.rect;
    return Promise.resolve();
  }

  public hide(): Promise<void> {
    this.calls.push('hide');
    return Promise.resolve();
  }

  public destroy(): Promise<void> {
    this.calls.push('destroy');
    return Promise.resolve();
  }

  public load(options: { readonly url: string }): Promise<void> {
    this.calls.push('load');
    this.loadedUrl = options.url;
    return Promise.resolve();
  }

  public stop(): Promise<void> {
    this.calls.push('stop');
    return Promise.resolve();
  }

  public reload(): Promise<void> {
    this.calls.push('reload');
    return Promise.resolve();
  }

  public back(): Promise<void> {
    this.calls.push('back');
    return Promise.resolve();
  }

  public forward(): Promise<void> {
    this.calls.push('forward');
    return Promise.resolve();
  }

  public copyUrl(options: { readonly url: string }): Promise<void> {
    this.calls.push('copyUrl');
    this.copiedUrl = options.url;
    return Promise.resolve();
  }

  public openExternal(options: { readonly url: string }): Promise<void> {
    this.calls.push(`openExternal:${options.url}`);
    return Promise.resolve();
  }

  public addListener(
    eventName: 'navigationState',
    listenerFunc: (event: NativeBrowserNavigationState & { readonly committed: boolean }) => void,
  ): Promise<{ remove(): Promise<void> }>;
  public addListener(
    eventName: 'loadFailed',
    listenerFunc: (event: NativeBrowserLoadFailedEvent) => void,
  ): Promise<{ remove(): Promise<void> }>;
  public addListener(
    eventName: 'capabilityUnsupported',
    listenerFunc: (event: NativeBrowserCapabilityEvent) => void,
  ): Promise<{ remove(): Promise<void> }>;
  public addListener(
    eventName: keyof ListenerMap,
    listenerFunc:
      | ((event: NativeBrowserNavigationState & { readonly committed: boolean }) => void)
      | ((event: NativeBrowserLoadFailedEvent) => void)
      | ((event: NativeBrowserCapabilityEvent) => void),
  ): Promise<{ remove(): Promise<void> }> {
    if (eventName === 'navigationState') {
      this.listeners.navigationState = listenerFunc as (
        event: NativeBrowserNavigationState & { readonly committed: boolean },
      ) => void;
    } else if (eventName === 'loadFailed') {
      this.listeners.loadFailed = listenerFunc as (event: NativeBrowserLoadFailedEvent) => void;
    } else {
      this.listeners.capabilityUnsupported = listenerFunc as (
        event: NativeBrowserCapabilityEvent,
      ) => void;
    }

    return Promise.resolve({
      remove: () => Promise.resolve(),
    });
  }
}

describe('CapacitorBrowserViewportAdapter', () => {
  let adapter: CapacitorBrowserViewportAdapter;
  let plugin: FakeExploreBrowserPlugin;
  let events: BrowserViewportEvent[];

  beforeEach(async () => {
    plugin = new FakeExploreBrowserPlugin();
    TestBed.configureTestingModule({
      providers: [
        CapacitorBrowserViewportAdapter,
        { provide: EXPLORE_BROWSER_PLUGIN, useValue: plugin },
      ],
    });

    adapter = TestBed.inject(CapacitorBrowserViewportAdapter);
    events = [];
    adapter.events$.subscribe((event) => {
      events.push(event);
    });
    await Promise.resolve();
  });

  it('forwards viewport commands to the native plugin', async () => {
    const rect = { left: 1, top: 2, width: 3, height: 4 };

    await adapter.show(rect);
    await adapter.load('https://example.com/');
    await adapter.stop();
    await adapter.reload();
    await adapter.back();
    await adapter.forward();
    await adapter.copyUrl('https://example.com/');
    await adapter.hide();
    await adapter.destroy();

    expect(plugin.calls).toEqual([
      'show',
      'load',
      'stop',
      'reload',
      'back',
      'forward',
      'copyUrl',
      'hide',
      'destroy',
    ]);
    expect(plugin.shownRect).toEqual(rect);
    expect(plugin.loadedUrl).toBe('https://example.com/');
    expect(plugin.copiedUrl).toBe('https://example.com/');
  });

  it('maps native events to application viewport events', () => {
    plugin.listeners.navigationState?.({
      url: 'https://example.com/',
      loading: false,
      canGoBack: true,
      canGoForward: false,
      committed: true,
    });
    plugin.listeners.loadFailed?.({
      url: 'https://example.com/',
      description: 'Failed',
    });
    plugin.listeners.capabilityUnsupported?.({
      capability: 'fileUpload',
      url: 'https://example.com/',
    });
    plugin.listeners.capabilityUnsupported?.({
      capability: 'nativeShare',
      url: null,
    });

    expect(events).toEqual([
      {
        type: 'navigation',
        committed: true,
        state: {
          url: 'https://example.com/',
          loading: false,
          canGoBack: true,
          canGoForward: false,
        },
      },
      {
        type: 'loadFailed',
        event: {
          url: 'https://example.com/',
          description: 'Failed',
        },
      },
      {
        type: 'capabilityUnsupported',
        event: {
          capability: 'fileUpload',
          url: 'https://example.com/',
        },
      },
      {
        type: 'capabilityUnsupported',
        event: {
          capability: 'unknown',
          url: null,
        },
      },
    ]);
  });
});
