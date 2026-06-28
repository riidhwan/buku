import {
  canUseNativeBackNavigation,
  commitExploreBrowserNavigation,
  discardLatestBackNavigationAttempt,
  findExploreBrowserTab,
  initialExploreBrowserBackNavigationState,
  lastExploreBrowserUrl,
  recordFallbackBackNavigationAttempt,
  recordNativeBackNavigation,
  rememberExploreBrowserTabLibrarySeriesTitle,
  selectedTabIdForBrowserSession,
} from './explore-browser-session-policy';
import type { ExploreBrowserTab } from './ports/browser-session-store.port';

function browserTab(
  id: string,
  url: string | null,
  backStack: readonly string[] = [],
  pageTitle: string | null = null,
): ExploreBrowserTab {
  return { id, url, pageTitle, backStack, lastLibrarySeriesTitle: null };
}

describe('Explore browser session policy', () => {
  it('selects the persisted tab when it still exists', () => {
    expect(
      selectedTabIdForBrowserSession({
        tabs: [browserTab('tab-1', 'https://one.example/'), browserTab('tab-2', null)],
        selectedTabId: 'tab-2',
      }),
    ).toBe('tab-2');
  });

  it('falls back to the first tab when the selected tab is stale', () => {
    expect(
      selectedTabIdForBrowserSession({
        tabs: [browserTab('tab-1', 'https://one.example/'), browserTab('tab-2', null)],
        selectedTabId: 'missing-tab',
      }),
    ).toBe('tab-1');
  });

  it('finds the most recently saved URL', () => {
    expect(
      lastExploreBrowserUrl([
        browserTab('tab-1', 'https://one.example/'),
        browserTab('tab-2', null),
        browserTab('tab-3', 'https://three.example/'),
      ]),
    ).toBe('https://three.example/');
  });

  it('returns no selected tab when the selected id is missing', () => {
    expect(
      findExploreBrowserTab([browserTab('tab-1', 'https://one.example/')], 'missing-tab'),
    ).toBeNull();
  });

  it('appends the previous committed URL and normalizes page titles', () => {
    const commit = commitExploreBrowserNavigation({
      tabs: [browserTab('tab-1', 'https://one.example/')],
      selectedTabId: 'tab-1',
      url: 'https://two.example/',
      title: '  Two  ',
      backNavigationState: initialExploreBrowserBackNavigationState(),
    });

    expect(commit.tabs).toEqual([
      browserTab('tab-1', 'https://two.example/', ['https://one.example/'], 'Two'),
    ]);
  });

  it('remembers the normalized Library Series title for the selected tab', () => {
    expect(
      rememberExploreBrowserTabLibrarySeriesTitle({
        tabs: [
          browserTab('tab-1', 'https://one.example/'),
          browserTab('tab-2', 'https://two.example/'),
        ],
        selectedTabId: 'tab-2',
        title: '  Existing   Series  ',
      }),
    ).toEqual([
      browserTab('tab-1', 'https://one.example/'),
      {
        ...browserTab('tab-2', 'https://two.example/'),
        lastLibrarySeriesTitle: 'Existing Series',
      },
    ]);
  });

  it('does not remember a Library Series title without a selected tab', () => {
    const tabs = [browserTab('tab-1', 'https://one.example/')];

    expect(
      rememberExploreBrowserTabLibrarySeriesTitle({
        tabs,
        selectedTabId: null,
        title: 'Existing Series',
      }),
    ).toBe(tabs);
  });

  it('clears the remembered Library Series title for blank input', () => {
    const tab = {
      ...browserTab('tab-1', 'https://one.example/'),
      lastLibrarySeriesTitle: 'Existing Series',
    };

    expect(
      rememberExploreBrowserTabLibrarySeriesTitle({
        tabs: [tab],
        selectedTabId: 'tab-1',
        title: '   ',
      }),
    ).toEqual([browserTab('tab-1', 'https://one.example/')]);
  });

  it('collapses duplicate back-stack entries and caps the stack', () => {
    let tabs: readonly ExploreBrowserTab[] = [browserTab('tab-1', 'https://page-0.example/')];
    const backNavigationState = initialExploreBrowserBackNavigationState();

    for (let index = 1; index <= 30; index += 1) {
      tabs = commitExploreBrowserNavigation({
        tabs,
        selectedTabId: 'tab-1',
        url: `https://page-${index.toString()}.example/`,
        title: null,
        backNavigationState,
      }).tabs;
    }

    expect(tabs[0]?.backStack.length).toBe(25);
    expect(tabs[0]?.backStack[0]).toBe('https://page-5.example/');
    expect(tabs[0]?.backStack[24]).toBe('https://page-29.example/');

    const duplicateCommit = commitExploreBrowserNavigation({
      tabs,
      selectedTabId: 'tab-1',
      url: 'https://page-30.example/',
      title: null,
      backNavigationState,
    });

    expect(duplicateCommit.tabs[0]?.backStack).toEqual(tabs[0]?.backStack);
  });

  it('pops one stack entry only after native back navigation commits', () => {
    const pendingState = recordNativeBackNavigation(
      initialExploreBrowserBackNavigationState(),
      true,
    );

    const commit = commitExploreBrowserNavigation({
      tabs: [
        browserTab('tab-1', 'https://three.example/', [
          'https://one.example/',
          'https://two.example/',
        ]),
      ],
      selectedTabId: 'tab-1',
      url: 'https://two.example/',
      title: 'Two',
      backNavigationState: pendingState,
    });

    expect(commit.tabs).toEqual([
      browserTab('tab-1', 'https://two.example/', ['https://one.example/'], 'Two'),
    ]);
    expect(commit.backNavigationState.pendingKinds).toEqual([]);
  });

  it('keeps fallback back navigation on the persisted stack until commit', () => {
    const pendingState = recordFallbackBackNavigationAttempt(
      initialExploreBrowserBackNavigationState(),
    );

    expect(canUseNativeBackNavigation(true, pendingState)).toBeTrue();

    const commit = commitExploreBrowserNavigation({
      tabs: [browserTab('tab-1', 'https://two.example/', ['https://one.example/'])],
      selectedTabId: 'tab-1',
      url: 'https://one.example/',
      title: null,
      backNavigationState: pendingState,
    });

    expect(commit.tabs).toEqual([browserTab('tab-1', 'https://one.example/')]);
    expect(canUseNativeBackNavigation(true, commit.backNavigationState)).toBeFalse();
  });

  it('can discard an uncommitted fallback back attempt', () => {
    const pendingState = recordFallbackBackNavigationAttempt(
      initialExploreBrowserBackNavigationState(),
    );

    expect(discardLatestBackNavigationAttempt(pendingState).pendingKinds).toEqual([]);
  });
});
