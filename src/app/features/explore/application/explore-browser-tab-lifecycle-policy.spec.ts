import {
  closeExploreBrowserTab,
  selectExploreBrowserTab,
} from './explore-browser-tab-lifecycle-policy';
import type { ExploreBrowserTab } from './ports/browser-session-store.port';

function browserTab(
  id: string,
  url: string | null,
  backStack: readonly string[] = [],
  pageTitle: string | null = null,
): ExploreBrowserTab {
  return { id, url, pageTitle, backStack, lastLibrarySeriesTitle: null };
}

describe('Explore browser tab lifecycle policy', () => {
  it('selects URL and blank tabs with explicit session state', () => {
    const tabs = [browserTab('tab-1', 'https://one.example/'), browserTab('tab-2', null)];

    expect(selectExploreBrowserTab({ tabs, tabId: 'tab-1' })).toEqual({
      status: 'url',
      session: { tabs, selectedTabId: 'tab-1' },
      url: 'https://one.example/',
    });
    expect(selectExploreBrowserTab({ tabs, tabId: 'tab-2' })).toEqual({
      status: 'blank',
      session: { tabs, selectedTabId: 'tab-2' },
    });
    expect(selectExploreBrowserTab({ tabs, tabId: 'missing-tab' })).toEqual({
      status: 'missing',
    });
  });

  it('closes inactive tabs without changing selection', () => {
    const tabs = [
      browserTab('tab-1', 'https://one.example/'),
      browserTab('tab-2', 'https://two.example/'),
    ];

    expect(
      closeExploreBrowserTab({
        tabs,
        selectedTabId: 'tab-1',
        tabId: 'tab-2',
      }),
    ).toEqual({
      status: 'closed-inactive',
      session: {
        tabs: [browserTab('tab-1', 'https://one.example/')],
        selectedTabId: 'tab-1',
      },
    });
  });

  it('selects the left neighbor after closing the selected tab', () => {
    const tabs = [
      browserTab('tab-1', 'https://one.example/'),
      browserTab('tab-2', 'https://two.example/'),
      browserTab('tab-3', null),
    ];

    expect(
      closeExploreBrowserTab({
        tabs,
        selectedTabId: 'tab-2',
        tabId: 'tab-2',
      }),
    ).toEqual({
      status: 'selected-neighbor',
      session: {
        tabs: [browserTab('tab-1', 'https://one.example/'), browserTab('tab-3', null)],
        selectedTabId: 'tab-1',
      },
      url: 'https://one.example/',
    });
  });

  it('selects a blank neighbor when the closed tab has no left neighbor', () => {
    const tabs = [browserTab('tab-1', 'https://one.example/'), browserTab('tab-2', null)];

    expect(
      closeExploreBrowserTab({
        tabs,
        selectedTabId: 'tab-1',
        tabId: 'tab-1',
      }),
    ).toEqual({
      status: 'selected-neighbor',
      session: {
        tabs: [browserTab('tab-2', null)],
        selectedTabId: 'tab-2',
      },
      url: null,
    });
  });

  it('replaces the final closed tab with a blank tab session', () => {
    const result = closeExploreBrowserTab({
      tabs: [browserTab('tab-1', 'https://one.example/')],
      selectedTabId: 'tab-1',
      tabId: 'tab-1',
    });

    expect(result.status).toBe('blank');
    if (result.status !== 'blank') {
      return;
    }
    expect(result.session.tabs).toEqual([jasmine.objectContaining({ url: null })]);
    expect(result.session.selectedTabId).toBe(result.session.tabs[0]?.id ?? null);
  });

  it('ignores missing tab close requests', () => {
    expect(
      closeExploreBrowserTab({
        tabs: [browserTab('tab-1', 'https://one.example/')],
        selectedTabId: 'tab-1',
        tabId: 'missing-tab',
      }),
    ).toEqual({ status: 'missing' });
  });
});
