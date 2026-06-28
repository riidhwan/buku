import { TestBed } from '@angular/core/testing';
import { BrowserViewportEvent } from '../application/ports/browser-viewport.port';
import {
  EXPLORE_BROWSER_PLUGIN,
  NativeArticleExtractionResult,
  ExploreBrowserPlugin,
  NativeBrowserCapabilityEvent,
  NativeBrowserHistoryNavigationResult,
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
  public script: string | null = null;
  public backResult: NativeBrowserHistoryNavigationResult = { didNavigate: true };
  public articleExtractionResult: NativeArticleExtractionResult = {
    status: 'unavailable',
  };

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

  public back(): Promise<NativeBrowserHistoryNavigationResult> {
    this.calls.push('back');
    return Promise.resolve(this.backResult);
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

  public extractArticle(options: {
    readonly script: string;
  }): Promise<NativeArticleExtractionResult> {
    this.calls.push('extractArticle');
    this.script = options.script;
    return Promise.resolve(this.articleExtractionResult);
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
  let scriptAssets: Map<string, string>;

  beforeEach(async () => {
    plugin = new FakeExploreBrowserPlugin();
    scriptAssets = new Map([
      ['assets/readability/Readability.js', 'readability script'],
      ['assets/explore/chapter-navigation.js', 'chapter navigation script'],
      ['assets/explore/article-extraction.js', 'article extraction script'],
    ]);
    spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
      const url =
        input instanceof Request ? input.url : input instanceof URL ? input.toString() : input;
      const script = scriptAssets.get(url);
      return Promise.resolve(
        script === undefined ? new Response('', { status: 404 }) : new Response(script),
      );
    });
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
    const backResult = await adapter.back();
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
    expect(backResult).toEqual({ didNavigate: true });
  });

  it('preserves native browser back no-op results', async () => {
    plugin.backResult = { didNavigate: false };

    const result = await adapter.back();

    expect(result).toEqual({ didNavigate: false });
  });

  it('loads Readability and maps successful article extraction', async () => {
    plugin.articleExtractionResult = {
      status: 'ok',
      article: {
        url: 'https://example.com/article',
        title: 'Readable article',
        byline: 'A Writer',
        siteName: 'Example',
        excerpt: 'A short summary.',
        publishedTime: '2026-06-26',
        contentHtml: '<p>Readable body.</p>',
        textContent: 'Readable body.',
        length: 14,
        previousChapter: {
          href: '/previous',
          label: 'Previous chapter',
        },
        nextChapter: {
          href: '/next',
          label: 'Next chapter',
        },
      },
    };

    const result = await adapter.extractArticle();

    expect(window.fetch).toHaveBeenCalledTimes(3);
    expect(window.fetch).toHaveBeenCalledWith('assets/readability/Readability.js');
    expect(window.fetch).toHaveBeenCalledWith('assets/explore/chapter-navigation.js');
    expect(window.fetch).toHaveBeenCalledWith('assets/explore/article-extraction.js');
    expect(plugin.script).toContain('readability script');
    expect(plugin.script).toContain('chapter navigation script');
    expect(plugin.script).toContain('article extraction script');
    expect(plugin.script).toContain('window.BukuExplore.extractArticle()');
    expect(result).toEqual(plugin.articleExtractionResult);
  });

  it('maps successful article extraction when native chapter links are absent', async () => {
    plugin.articleExtractionResult = {
      status: 'ok',
      article: {
        url: 'https://example.com/article',
        title: 'Readable article',
        byline: null,
        siteName: null,
        excerpt: null,
        publishedTime: null,
        contentHtml: '<p>Readable body.</p>',
        textContent: 'Readable body.',
        length: 14,
      },
    };

    const result = await adapter.extractArticle();

    expect(result).toEqual(plugin.articleExtractionResult);
  });

  it('maps unavailable and failed article extraction results', async () => {
    plugin.articleExtractionResult = {
      status: 'unavailable',
    };

    expect(await adapter.extractArticle()).toEqual({
      status: 'unavailable',
    });

    plugin.articleExtractionResult = {
      status: 'failed',
      message: 'Script failed',
    };

    expect(await adapter.extractArticle()).toEqual({
      status: 'failed',
      message: 'Script failed',
    });
    expect(window.fetch).toHaveBeenCalledTimes(3);
  });

  it('maps Readability asset loading failures to failed extraction', async () => {
    scriptAssets.delete('assets/readability/Readability.js');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CapacitorBrowserViewportAdapter,
        { provide: EXPLORE_BROWSER_PLUGIN, useValue: plugin },
      ],
    });
    adapter = TestBed.inject(CapacitorBrowserViewportAdapter);

    await Promise.resolve();

    expect(await adapter.extractArticle()).toEqual({
      status: 'failed',
      message: 'Readability runner could not be loaded.',
    });
  });

  it('maps Explore script asset loading failures to failed extraction', async () => {
    scriptAssets.delete('assets/explore/chapter-navigation.js');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CapacitorBrowserViewportAdapter,
        { provide: EXPLORE_BROWSER_PLUGIN, useValue: plugin },
      ],
    });
    adapter = TestBed.inject(CapacitorBrowserViewportAdapter);

    await Promise.resolve();

    expect(await adapter.extractArticle()).toEqual({
      status: 'failed',
      message: 'Chapter navigation runner could not be loaded.',
    });
  });

  it('maps non-error extraction failures to a generic failed extraction', async () => {
    (window.fetch as jasmine.Spy).and.rejectWith('Fetch failed');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CapacitorBrowserViewportAdapter,
        { provide: EXPLORE_BROWSER_PLUGIN, useValue: plugin },
      ],
    });
    adapter = TestBed.inject(CapacitorBrowserViewportAdapter);

    await Promise.resolve();

    expect(await adapter.extractArticle()).toEqual({
      status: 'failed',
      message: 'Article extraction failed.',
    });
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
