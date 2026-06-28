export type PendingBackNavigationKind = 'native' | 'fallback';

export interface ExploreBrowserBackNavigationState {
  readonly pendingKinds: readonly PendingBackNavigationKind[];
  readonly fallbackBackCreatedNativeHistory: boolean;
}

export function initialExploreBrowserBackNavigationState(): ExploreBrowserBackNavigationState {
  return {
    pendingKinds: [],
    fallbackBackCreatedNativeHistory: false,
  };
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

export function consumeCommittedBackNavigation(state: ExploreBrowserBackNavigationState): {
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

function appendPendingBackNavigation(
  state: ExploreBrowserBackNavigationState,
  kind: PendingBackNavigationKind,
): ExploreBrowserBackNavigationState {
  return {
    ...state,
    pendingKinds: [...state.pendingKinds, kind],
  };
}
