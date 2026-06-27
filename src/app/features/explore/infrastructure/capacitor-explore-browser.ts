/* istanbul ignore file */
import { InjectionToken } from '@angular/core';
import { registerPlugin } from '@capacitor/core';

interface PluginListenerHandle {
  remove(): Promise<void>;
}

export interface NativeBrowserViewportRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface NativeBrowserNavigationState {
  readonly url: string;
  readonly loading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

export interface NativeBrowserLoadFailedEvent {
  readonly url: string;
  readonly description: string;
}

export interface NativeBrowserCapabilityEvent {
  readonly capability: string;
  readonly url: string | null;
}

export interface NativeReadingChapterLink {
  readonly href: string;
  readonly label: string | null;
}

export interface NativeReadingArticleSnapshot {
  readonly url: string;
  readonly title: string;
  readonly byline: string | null;
  readonly siteName: string | null;
  readonly excerpt: string | null;
  readonly publishedTime: string | null;
  readonly contentHtml: string;
  readonly textContent: string;
  readonly length: number;
  readonly previousChapter?: NativeReadingChapterLink;
  readonly nextChapter?: NativeReadingChapterLink;
}

export type NativeArticleExtractionResult =
  | {
      readonly status: 'ok';
      readonly article: NativeReadingArticleSnapshot;
    }
  | {
      readonly status: 'unavailable';
    }
  | {
      readonly status: 'failed';
      readonly message: string;
    };

export interface ExploreBrowserPlugin {
  show(options: { readonly rect: NativeBrowserViewportRect }): Promise<void>;
  hide(): Promise<void>;
  destroy(): Promise<void>;
  load(options: { readonly url: string }): Promise<void>;
  stop(): Promise<void>;
  reload(): Promise<void>;
  back(): Promise<void>;
  forward(): Promise<void>;
  copyUrl(options: { readonly url: string }): Promise<void>;
  openExternal(options: { readonly url: string }): Promise<void>;
  extractArticle(options: { readonly script: string }): Promise<NativeArticleExtractionResult>;
  addListener(
    eventName: 'navigationState',
    listenerFunc: (event: NativeBrowserNavigationState & { readonly committed: boolean }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'loadFailed',
    listenerFunc: (event: NativeBrowserLoadFailedEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'capabilityUnsupported',
    listenerFunc: (event: NativeBrowserCapabilityEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const CapacitorExploreBrowser = registerPlugin<ExploreBrowserPlugin>('ExploreBrowser');

export const EXPLORE_BROWSER_PLUGIN = new InjectionToken<ExploreBrowserPlugin>(
  'EXPLORE_BROWSER_PLUGIN',
  {
    factory: () => ({
      show: (options) => CapacitorExploreBrowser.show(options),
      hide: () => CapacitorExploreBrowser.hide(),
      destroy: () => CapacitorExploreBrowser.destroy(),
      load: (options) => CapacitorExploreBrowser.load(options),
      stop: () => CapacitorExploreBrowser.stop(),
      reload: () => CapacitorExploreBrowser.reload(),
      back: () => CapacitorExploreBrowser.back(),
      forward: () => CapacitorExploreBrowser.forward(),
      copyUrl: (options) => CapacitorExploreBrowser.copyUrl(options),
      openExternal: (options) => CapacitorExploreBrowser.openExternal(options),
      extractArticle: (options) => CapacitorExploreBrowser.extractArticle(options),
      addListener: CapacitorExploreBrowser.addListener.bind(CapacitorExploreBrowser),
    }),
  },
);
