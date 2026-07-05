import { ExploreBrowserWorkflowState } from './explore-browser-workflow-state';
import type { ExploreBrowserTab } from './ports/browser-session-store.port';

function browserTab(
  id: string,
  url: string | null,
  backStack: readonly string[] = [],
): ExploreBrowserTab {
  return { id, url, pageTitle: null, backStack, lastLibrarySeriesTitle: null };
}

describe('ExploreBrowserWorkflowState', () => {
  it('derives the active tab, recent tabs, and last URL from tab state', () => {
    const state = new ExploreBrowserWorkflowState();
    const tabs = [
      browserTab('blank-tab', null),
      browserTab('first-tab', 'https://first.example/'),
      browserTab('second-tab', 'https://second.example/'),
    ];

    state.tabsSignal.set(tabs);
    state.selectedTabIdSignal.set('first-tab');

    expect(state.activeTab()).toEqual(browserTab('first-tab', 'https://first.example/'));
    expect(state.recentTabs()).toEqual([
      browserTab('first-tab', 'https://first.example/'),
      browserTab('second-tab', 'https://second.example/'),
    ]);
    expect(state.lastUrl()).toBe('https://second.example/');
  });

  it('reports back availability from the active tab stack before native history', () => {
    const state = new ExploreBrowserWorkflowState();

    state.tabsSignal.set([
      browserTab('tab-1', 'https://current.example/', ['https://old.example/']),
    ]);
    state.selectedTabIdSignal.set('tab-1');

    expect(state.activeBackStack()).toEqual(['https://old.example/']);
    expect(state.canGoBack()).toBeTrue();
  });

  it('derives URL security state from the current URL', () => {
    const state = new ExploreBrowserWorkflowState();

    state.currentUrlSignal.set('https://secure.example/');

    expect(state.isSecure()).toBeTrue();
    expect(state.isInsecure()).toBeFalse();

    state.currentUrlSignal.set('http://insecure.example/');

    expect(state.isSecure()).toBeFalse();
    expect(state.isInsecure()).toBeTrue();
  });
});
