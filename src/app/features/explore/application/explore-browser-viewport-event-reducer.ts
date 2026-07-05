import {
  browserNoticeForLoadFailure,
  browserNoticeForUnsupportedCapability,
  type BrowserNotice,
} from './explore-browser-notice-policy';
import type { BrowserViewportEvent } from './ports/browser-viewport.port';

export interface BrowserViewportNavigationCommit {
  readonly url: string;
  readonly title: string | null;
}

export interface BrowserViewportEventReduction {
  readonly inputValue?: string;
  readonly currentUrl?: string;
  readonly loading?: boolean;
  readonly nativeCanGoBack?: boolean;
  readonly canGoForward?: boolean;
  readonly notice?: BrowserNotice;
  readonly committedNavigation?: BrowserViewportNavigationCommit;
}

export function reduceBrowserViewportEvent(
  event: BrowserViewportEvent,
): BrowserViewportEventReduction {
  switch (event.type) {
    case 'navigation':
      return {
        inputValue: event.state.url,
        currentUrl: event.state.url,
        loading: event.state.loading,
        nativeCanGoBack: event.state.canGoBack,
        canGoForward: event.state.canGoForward,
        ...(event.committed
          ? {
              committedNavigation: {
                url: event.state.url,
                title: event.state.title ?? null,
              },
            }
          : {}),
      };
    case 'loadFailed':
      return {
        loading: false,
        notice: browserNoticeForLoadFailure(event.event.description, event.event.url),
      };
    case 'capabilityUnsupported':
      return {
        notice: browserNoticeForUnsupportedCapability(event.event.capability, event.event.url),
      };
  }
}
