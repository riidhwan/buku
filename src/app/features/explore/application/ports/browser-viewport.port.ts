import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
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
  readonly loading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

export interface BrowserLoadFailedEvent {
  readonly url: string;
  readonly description: string;
}

export interface BrowserCapabilityEvent {
  readonly capability: BrowserCapability;
  readonly url: string | null;
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
      readonly type: 'capabilityUnsupported';
      readonly event: BrowserCapabilityEvent;
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

export interface BrowserViewportPort {
  readonly events$: Observable<BrowserViewportEvent>;
  show(rect: BrowserViewportRect): Promise<void>;
  hide(): Promise<void>;
  destroy(): Promise<void>;
  load(url: string): Promise<void>;
  stop(): Promise<void>;
  reload(): Promise<void>;
  back(): Promise<void>;
  forward(): Promise<void>;
  copyUrl(url: string): Promise<void>;
  extractArticle(): Promise<BrowserArticleExtractionResult>;
}

export const BROWSER_VIEWPORT = new InjectionToken<BrowserViewportPort>('BROWSER_VIEWPORT');
