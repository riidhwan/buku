import { BrowserTabSession, ExploreBrowserTab } from './ports/browser-session-store.port';

export type PendingBackNavigationKind = 'native' | 'fallback';

export interface ExploreBrowserBackNavigationState {
  readonly pendingKinds: readonly PendingBackNavigationKind[];
  readonly fallbackBackCreatedNativeHistory: boolean;
}

export interface ExploreBrowserNavigationCommit {
  readonly tabs: readonly ExploreBrowserTab[];
  readonly backNavigationState: ExploreBrowserBackNavigationState;
}

const maxBackStackEntries = 25;

export function initialExploreBrowserBackNavigationState(): ExploreBrowserBackNavigationState {
  return {
    pendingKinds: [],
    fallbackBackCreatedNativeHistory: false,
  };
}

export function resetExploreBrowserBackNavigationState(): ExploreBrowserBackNavigationState {
  return initialExploreBrowserBackNavigationState();
}

export function canUseNativeBackNavigation(
  nativeCanGoBack: boolean,
  state: ExploreBrowserBackNavigationState,
): boolean {
  return nativeCanGoBack && !state.fallbackBackCreatedNativeHistory;
}

export function recordNativeBackNavigation(
  state: ExploreBrowserBackNavigationState,
  didNavigate: boolean,
): ExploreBrowserBackNavigationState {
  return didNavigate ? appendPendingBackNavigation(state, 'native') : state;
}

export function recordFallbackBackNavigationAttempt(
  state: ExploreBrowserBackNavigationState,
): ExploreBrowserBackNavigationState {
  return appendPendingBackNavigation(state, 'fallback');
}

export function discardLatestBackNavigationAttempt(
  state: ExploreBrowserBackNavigationState,
): ExploreBrowserBackNavigationState {
  return {
    ...state,
    pendingKinds: state.pendingKinds.slice(0, -1),
  };
}

export function createExploreBrowserTab(url: string | null): ExploreBrowserTab {
  return {
    id: `explore-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    url,
    pageTitle: null,
    backStack: [],
  };
}

export function blankExploreBrowserTabSession(): BrowserTabSession {
  const tab = createExploreBrowserTab(null);
  return {
    tabs: [tab],
    selectedTabId: tab.id,
  };
}

export function selectedTabIdForBrowserSession(session: BrowserTabSession): string {
  const selectedTabId = session.selectedTabId;
  if (selectedTabId !== null && session.tabs.some((tab) => tab.id === selectedTabId)) {
    return selectedTabId;
  }

  const firstTab = session.tabs[0];
  /* istanbul ignore if -- callers only select from non-empty sessions. */
  if (firstTab === undefined) {
    throw new Error('Cannot select a tab from an empty session.');
  }

  return firstTab.id;
}

export function findExploreBrowserTab(
  tabs: readonly ExploreBrowserTab[],
  selectedTabId: string | null,
): ExploreBrowserTab | null {
  if (selectedTabId === null) {
    return null;
  }

  return tabs.find((candidate) => candidate.id === selectedTabId) ?? null;
}

export function recentExploreBrowserTabs(
  tabs: readonly ExploreBrowserTab[],
): readonly ExploreBrowserTab[] {
  return tabs.filter((tab) => tab.url !== null);
}

export function lastExploreBrowserUrl(tabs: readonly ExploreBrowserTab[]): string | null {
  const recentTabs = recentExploreBrowserTabs(tabs);
  return recentTabs[recentTabs.length - 1]?.url ?? null;
}

export function commitExploreBrowserNavigation(params: {
  readonly tabs: readonly ExploreBrowserTab[];
  readonly selectedTabId: string | null;
  readonly url: string;
  readonly title: string | null;
  readonly backNavigationState: ExploreBrowserBackNavigationState;
}): ExploreBrowserNavigationCommit {
  const { selectedTabId } = params;
  if (selectedTabId === null) {
    return {
      tabs: params.tabs,
      backNavigationState: params.backNavigationState,
    };
  }

  const consumedBackNavigation = consumeCommittedBackNavigation(params.backNavigationState);
  if (consumedBackNavigation.kind !== null) {
    return {
      tabs: updateSelectedTab(params.tabs, selectedTabId, (tab) => ({
        ...tab,
        url: params.url,
        pageTitle: normalizePageTitle(params.title),
        backStack: tab.backStack.slice(0, -1),
      })),
      backNavigationState: consumedBackNavigation.state,
    };
  }

  const previousUrl = findExploreBrowserTab(params.tabs, selectedTabId)?.url ?? null;
  return {
    tabs: updateSelectedTab(params.tabs, selectedTabId, (tab) => ({
      ...tab,
      url: params.url,
      pageTitle: normalizePageTitle(params.title),
      backStack: stackWithPreviousUrl(tab.backStack, previousUrl, params.url),
    })),
    backNavigationState: params.backNavigationState,
  };
}

export function normalizePageTitle(title: string | null): string | null {
  const normalized = title?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function appendPendingBackNavigation(
  state: ExploreBrowserBackNavigationState,
  kind: PendingBackNavigationKind,
): ExploreBrowserBackNavigationState {
  return {
    ...state,
    pendingKinds: [...state.pendingKinds, kind],
  };
}

function consumeCommittedBackNavigation(state: ExploreBrowserBackNavigationState): {
  readonly kind: PendingBackNavigationKind | null;
  readonly state: ExploreBrowserBackNavigationState;
} {
  const [kind, ...remainingKinds] = state.pendingKinds;
  if (kind === undefined) {
    return { kind: null, state };
  }

  return {
    kind,
    state: {
      pendingKinds: remainingKinds,
      fallbackBackCreatedNativeHistory:
        state.fallbackBackCreatedNativeHistory || kind === 'fallback',
    },
  };
}

function updateSelectedTab(
  tabs: readonly ExploreBrowserTab[],
  selectedTabId: string,
  update: (tab: ExploreBrowserTab) => ExploreBrowserTab,
): readonly ExploreBrowserTab[] {
  return tabs.map((tab) => (tab.id === selectedTabId ? update(tab) : tab));
}

function stackWithPreviousUrl(
  backStack: readonly string[],
  previousUrl: string | null,
  committedUrl: string,
): readonly string[] {
  if (previousUrl === null || previousUrl === committedUrl) {
    return backStack;
  }

  const lastEntry = backStack[backStack.length - 1];
  if (lastEntry === previousUrl) {
    return backStack;
  }

  return [...backStack, previousUrl].slice(-maxBackStackEntries);
}
