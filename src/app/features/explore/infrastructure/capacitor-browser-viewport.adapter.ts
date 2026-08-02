import { inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
  BrowserArticleExtractionResult,
  BrowserCapability,
  BrowserHistoryNavigationResult,
  BrowserViewportExtractArticleOptions,
  BrowserViewportEvent,
  BrowserViewportPort,
  BrowserViewportRect,
  BrowserSecureNavigationFailureReason,
  BrowserViewportSelectorPreview,
  ManualChapterNavigationPreviewInput,
} from '../application/ports/browser-viewport.port';
import {
  EXPLORE_BROWSER_PLUGIN,
  NativeArticleExtractionResult,
  NativeBrowserCapabilityEvent,
  NativeBrowserSourceLinkLongPressEvent,
} from './capacitor-explore-browser';

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

const secureNavigationFailureReasons = new Set<BrowserSecureNavigationFailureReason>([
  'certificate',
  'downgradeLoop',
  'insecureForm',
  'offline',
  'secureUnavailable',
  'tooManyUpgrades',
]);

@Injectable()
export class CapacitorBrowserViewportAdapter implements BrowserViewportPort {
  private readonly eventsSubject = new Subject<BrowserViewportEvent>();
  private readonly plugin = inject(EXPLORE_BROWSER_PLUGIN);
  private readabilityScriptPromise: Promise<string> | null = null;
  private chapterNavigationScriptPromise: Promise<string> | null = null;
  private articleExtractionScriptPromise: Promise<string> | null = null;

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

  public async back(): Promise<BrowserHistoryNavigationResult> {
    return this.plugin.back();
  }

  public async forward(): Promise<void> {
    await this.plugin.forward();
  }

  public async copyUrl(url: string): Promise<void> {
    await this.plugin.copyUrl({ url });
  }

  public async extractArticle(
    options: BrowserViewportExtractArticleOptions = {},
  ): Promise<BrowserArticleExtractionResult> {
    try {
      const [readabilityScript, chapterNavigationScript, articleExtractionScript] =
        await Promise.all([
          this.loadReadabilityScript(),
          this.loadChapterNavigationScript(),
          this.loadArticleExtractionScript(),
        ]);
      return this.toArticleExtractionResult(
        await this.plugin.extractArticle({
          script: this.toInjectedArticleExtractionScript(
            readabilityScript,
            chapterNavigationScript,
            articleExtractionScript,
            options.manualChapterNavigation,
          ),
        }),
      );
    } catch (error) {
      return {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Article extraction failed.',
      };
    }
  }

  public async previewManualChapterNavigation(
    input: ManualChapterNavigationPreviewInput,
  ): Promise<BrowserViewportSelectorPreview> {
    try {
      const chapterNavigationScript = await this.loadChapterNavigationScript();
      return await this.plugin.previewManualChapterNavigation({
        script: this.toInjectedManualChapterNavigationPreviewScript(chapterNavigationScript, input),
      });
    } catch (_error) {
      return { ok: false, reason: 'browserUnavailable', matches: [], automatic: null };
    }
  }

  private async registerListeners(): Promise<void> {
    await this.plugin.addListener('navigationState', (event) => {
      this.eventsSubject.next({
        type: 'navigation',
        state: {
          url: event.url,
          title: typeof event.title === 'string' ? event.title : null,
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

    await this.plugin.addListener('secureNavigationFailed', (event) => {
      const reason = secureNavigationFailureReasons.has(
        event.reason as BrowserSecureNavigationFailureReason,
      )
        ? (event.reason as BrowserSecureNavigationFailureReason)
        : 'secureUnavailable';
      this.eventsSubject.next({
        type: 'secureNavigationFailed',
        event: {
          reason,
          url: event.url,
          originalHttpUrl: event.originalHttpUrl,
        },
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

    await this.plugin.addListener('sourceLinkLongPressed', (event) => {
      this.eventsSubject.next({
        type: 'sourceLinkLongPressed',
        event: {
          link: this.toSourceLinkContext(event),
        },
      });
    });
  }

  private toBrowserCapability(event: NativeBrowserCapabilityEvent): BrowserCapability {
    return browserCapabilities.has(event.capability as BrowserCapability)
      ? (event.capability as BrowserCapability)
      : 'unknown';
  }

  private loadReadabilityScript(): Promise<string> {
    this.readabilityScriptPromise ??= this.loadScriptAsset(
      'assets/readability/Readability.js',
      'Readability runner could not be loaded.',
    );

    return this.readabilityScriptPromise;
  }

  private loadChapterNavigationScript(): Promise<string> {
    this.chapterNavigationScriptPromise ??= this.loadScriptAsset(
      'assets/explore/chapter-navigation.js',
      'Chapter navigation runner could not be loaded.',
    );

    return this.chapterNavigationScriptPromise;
  }

  private loadArticleExtractionScript(): Promise<string> {
    this.articleExtractionScriptPromise ??= this.loadScriptAsset(
      'assets/explore/article-extraction.js',
      'Article extraction runner could not be loaded.',
    );

    return this.articleExtractionScriptPromise;
  }

  private loadScriptAsset(url: string, failureMessage: string): Promise<string> {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(failureMessage);
      }

      return response.text();
    });
  }

  private toInjectedArticleExtractionScript(
    readabilityScript: string,
    chapterNavigationScript: string,
    articleExtractionScript: string,
    manualChapterNavigation:
      BrowserViewportExtractArticleOptions['manualChapterNavigation'] | undefined,
  ): string {
    const manualRulesJson = JSON.stringify(manualChapterNavigation ?? null);
    return `(function(){try{
${readabilityScript}
${chapterNavigationScript}
${articleExtractionScript}
return JSON.stringify(window.BukuExplore.extractArticle({manualChapterNavigation:${manualRulesJson}}));
}catch(error){
return JSON.stringify({status:'failed',message:error&&error.message?error.message:'Article extraction failed.'});
}})();`;
  }

  private toInjectedManualChapterNavigationPreviewScript(
    chapterNavigationScript: string,
    input: ManualChapterNavigationPreviewInput,
  ): string {
    const inputJson = JSON.stringify(input);
    return `(function(){try{
${chapterNavigationScript}
return JSON.stringify(window.BukuExplore.previewManualChapterNavigation(${inputJson}));
}catch(error){
return JSON.stringify({ok:false,reason:'browserUnavailable',matches:[],automatic:null});
}})();`;
  }

  private toArticleExtractionResult(
    result: NativeArticleExtractionResult,
  ): BrowserArticleExtractionResult {
    switch (result.status) {
      case 'ok':
        return {
          status: 'ok',
          article: result.article,
        };
      case 'unavailable':
        return {
          status: 'unavailable',
        };
      case 'failed':
        return {
          status: 'failed',
          message: result.message,
        };
    }
  }

  private toSourceLinkContext(event: NativeBrowserSourceLinkLongPressEvent) {
    return {
      pageUrl: event.pageUrl,
      href: event.href,
      text: event.text,
      attributes: event.attributes,
      ancestors: event.ancestors,
    };
  }
}
