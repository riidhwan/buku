import {
  canUseNativeBackNavigation,
  discardLatestBackNavigationAttempt,
  initialExploreBrowserBackNavigationState,
  recordFallbackBackNavigationAttempt,
  recordNativeBackNavigation,
} from './explore-browser-back-navigation-policy';

describe('Explore browser back navigation policy', () => {
  it('allows native back navigation while no fallback back has committed', () => {
    const pendingState = recordFallbackBackNavigationAttempt(
      initialExploreBrowserBackNavigationState(),
    );

    expect(canUseNativeBackNavigation(true, pendingState)).toBeTrue();
  });

  it('records native back navigation only when the viewport navigated', () => {
    const initialState = initialExploreBrowserBackNavigationState();

    expect(recordNativeBackNavigation(initialState, false)).toBe(initialState);
    expect(recordNativeBackNavigation(initialState, true).pendingKinds).toEqual(['native']);
  });

  it('can discard an uncommitted fallback back attempt', () => {
    const pendingState = recordFallbackBackNavigationAttempt(
      initialExploreBrowserBackNavigationState(),
    );

    expect(discardLatestBackNavigationAttempt(pendingState).pendingKinds).toEqual([]);
  });
});
