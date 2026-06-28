import { blankExploreBrowserTabSession } from './explore-browser-session-policy';
import type { BrowserTabSession, ExploreBrowserTab } from './ports/browser-session-store.port';

export type ExploreBrowserTabSelectionResult =
  | {
      readonly status: 'missing';
    }
  | {
      readonly status: 'blank';
      readonly session: BrowserTabSession;
    }
  | {
      readonly status: 'url';
      readonly session: BrowserTabSession;
      readonly url: string;
    };

export type ExploreBrowserTabCloseResult =
  | {
      readonly status: 'missing';
    }
  | {
      readonly status: 'blank';
      readonly session: BrowserTabSession;
    }
  | {
      readonly status: 'closed-inactive';
      readonly session: BrowserTabSession;
    }
  | {
      readonly status: 'selected-neighbor';
      readonly session: BrowserTabSession;
      readonly url: string | null;
    };

export function selectExploreBrowserTab(params: {
  readonly tabs: readonly ExploreBrowserTab[];
  readonly tabId: string;
}): ExploreBrowserTabSelectionResult {
  const tab = params.tabs.find((candidate) => candidate.id === params.tabId);
  if (tab === undefined) {
    return { status: 'missing' };
  }

  const session = { tabs: params.tabs, selectedTabId: tab.id };
  if (tab.url === null) {
    return { status: 'blank', session };
  }

  return { status: 'url', session, url: tab.url };
}

export function closeExploreBrowserTab(params: {
  readonly tabs: readonly ExploreBrowserTab[];
  readonly selectedTabId: string | null;
  readonly tabId: string;
}): ExploreBrowserTabCloseResult {
  const closedIndex = params.tabs.findIndex((tab) => tab.id === params.tabId);
  if (closedIndex === -1) {
    return { status: 'missing' };
  }

  const wasSelected = params.selectedTabId === params.tabId;
  const remainingTabs = params.tabs.filter((tab) => tab.id !== params.tabId);
  if (remainingTabs.length === 0) {
    return { status: 'blank', session: blankExploreBrowserTabSession() };
  }

  if (!wasSelected) {
    return {
      status: 'closed-inactive',
      session: {
        tabs: remainingTabs,
        selectedTabId: params.selectedTabId,
      },
    };
  }

  const nextIndex = Math.max(0, closedIndex - 1);
  const nextTab = remainingTabs[nextIndex];
  /* istanbul ignore if -- guarded by remaining tab length and bounded nextIndex. */
  if (nextTab === undefined) {
    throw new Error('Cannot select a neighbor tab after closing the selected tab.');
  }

  return {
    status: 'selected-neighbor',
    session: {
      tabs: remainingTabs,
      selectedTabId: nextTab.id,
    },
    url: nextTab.url,
  };
}
