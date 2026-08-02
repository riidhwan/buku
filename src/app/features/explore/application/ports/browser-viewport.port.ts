import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ManualChapterNavigationPayload,
  ManualChapterSelectorMode,
  ManualChapterDirection,
} from '../../domain/manual-chapter-navigation-rule';
import { ReadingArticleSnapshot } from '../../domain/reading-article';

export type BrowserCapability =
  | 'camera'
  | 'customScheme'
  | 'download'
  | 'fileUpload'
  | 'geolocation'
  | 'microphone'
  | 'newWindow'
  | 'unknown';

export interface BrowserViewportRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface BrowserNavigationState {
  readonly url: string;
  readonly title?: string | null;
  readonly loading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

export interface BrowserHistoryNavigationResult {
  readonly didNavigate: boolean;
}

export interface BrowserLoadFailedEvent {
  readonly url: string;
  readonly description: string;
}

export type BrowserSecureNavigationFailureReason =
  | 'certificate'
  | 'downgradeLoop'
  | 'insecureForm'
  | 'offline'
  | 'secureUnavailable'
  | 'tooManyUpgrades';

export interface BrowserSecureNavigationFailureEvent {
  readonly reason: BrowserSecureNavigationFailureReason;
  readonly url: string;
  readonly originalHttpUrl: string | null;
}

export interface BrowserCapabilityEvent {
  readonly capability: BrowserCapability;
  readonly url: string | null;
}

export interface BrowserSourceLinkAttribute {
  readonly name: string;
  readonly value: string;
}

export interface BrowserSourceLinkAncestor {
  readonly tagName: string;
  readonly id: string | null;
  readonly className: string | null;
  readonly role: string | null;
  readonly ariaLabel: string | null;
}

export interface BrowserSourceLinkContext {
  readonly pageUrl: string;
  readonly href: string;
  readonly text: string | null;
  readonly attributes: readonly BrowserSourceLinkAttribute[];
  readonly ancestors: readonly BrowserSourceLinkAncestor[];
}

export interface BrowserSourceLinkLongPressEvent {
  readonly link: BrowserSourceLinkContext;
}

export type BrowserViewportEvent =
  | {
      readonly type: 'navigation';
      readonly state: BrowserNavigationState;
      readonly committed: boolean;
    }
  | {
      readonly type: 'loadFailed';
      readonly event: BrowserLoadFailedEvent;
    }
  | {
      readonly type: 'secureNavigationFailed';
      readonly event: BrowserSecureNavigationFailureEvent;
    }
  | {
      readonly type: 'capabilityUnsupported';
      readonly event: BrowserCapabilityEvent;
    }
  | {
      readonly type: 'sourceLinkLongPressed';
      readonly event: BrowserSourceLinkLongPressEvent;
    };

export type BrowserArticleExtractionResult =
  | {
      readonly status: 'ok';
      readonly article: ReadingArticleSnapshot;
    }
  | {
      readonly status: 'unavailable';
    }
  | {
      readonly status: 'failed';
      readonly message: string;
    };

export interface BrowserViewportExtractArticleOptions {
  readonly manualChapterNavigation?: ManualChapterNavigationPayload;
}

export interface ManualChapterNavigationPreviewInput {
  readonly direction: ManualChapterDirection;
  readonly selectorMode: ManualChapterSelectorMode;
  readonly selector: string;
  readonly selectedHref: string | null;
}

export interface BrowserViewportSelectorPreviewMatch {
  readonly href: string;
  readonly label: string | null;
}

export type BrowserViewportSelectorPreview =
  | {
      readonly ok: true;
      readonly matches: readonly BrowserViewportSelectorPreviewMatch[];
      readonly selected: BrowserViewportSelectorPreviewMatch | null;
      readonly automatic: BrowserViewportSelectorPreviewMatch | null;
    }
  | {
      readonly ok: false;
      readonly reason:
        'browserUnavailable' | 'invalidSelector' | 'selectorTooLong' | 'tooManyMatches' | 'noMatch';
      readonly matches: readonly BrowserViewportSelectorPreviewMatch[];
      readonly automatic: BrowserViewportSelectorPreviewMatch | null;
    };

export interface BrowserViewportPort {
  readonly events$: Observable<BrowserViewportEvent>;
  show(rect: BrowserViewportRect): Promise<void>;
  hide(): Promise<void>;
  destroy(): Promise<void>;
  load(url: string): Promise<void>;
  stop(): Promise<void>;
  reload(): Promise<void>;
  back(): Promise<BrowserHistoryNavigationResult>;
  forward(): Promise<void>;
  copyUrl(url: string): Promise<void>;
  extractArticle(
    options?: BrowserViewportExtractArticleOptions,
  ): Promise<BrowserArticleExtractionResult>;
  previewManualChapterNavigation(
    input: ManualChapterNavigationPreviewInput,
  ): Promise<BrowserViewportSelectorPreview>;
}

export const BROWSER_VIEWPORT = new InjectionToken<BrowserViewportPort>('BROWSER_VIEWPORT');
