import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import { ExploreBrowserTabsBrowser, ExploreBrowserTabsPage } from './explore-browser-tabs.page';

class FakeExploreBrowserTabsBrowser implements ExploreBrowserTabsBrowser {
  public readonly tabs = signal<
    readonly {
      readonly id: string;
      readonly url: string | null;
      readonly pageTitle: string | null;
    }[]
  >([
    { id: 'tab-1', url: 'https://example.com/', pageTitle: null },
    { id: 'tab-2', url: 'https://buku.example/articles', pageTitle: 'Buku Articles' },
    { id: 'tab-3', url: null, pageTitle: null },
  ]);
  public readonly activeTab = computed(
    () => this.tabs().find((tab) => tab.id === this.activeTabId) ?? null,
  );
  public activeTabId = 'tab-2';
  public blankTabs = 0;
  public selectedTabId: string | null = null;
  public closedTabId: string | null = null;

  public createBlankTab(): Promise<void> {
    this.blankTabs += 1;
    this.activeTabId = 'tab-blank';
    this.tabs.set([...this.tabs(), { id: 'tab-blank', url: null, pageTitle: null }]);
    return Promise.resolve();
  }

  public selectTab(tabId: string): Promise<void> {
    this.selectedTabId = tabId;
    this.activeTabId = tabId;
    return Promise.resolve();
  }

  public closeTab(tabId: string): Promise<void> {
    this.closedTabId = tabId;
    this.tabs.set(this.tabs().filter((tab) => tab.id !== tabId));
    return Promise.resolve();
  }
}

class FakeRouter {
  public readonly navigations: string[][] = [];

  public navigate(commands: string[]): Promise<boolean> {
    this.navigations.push(commands);
    return Promise.resolve(true);
  }
}

describe('ExploreBrowserTabsPage', () => {
  let fixture: ComponentFixture<ExploreBrowserTabsPage>;
  let browser: FakeExploreBrowserTabsBrowser;
  let router: FakeRouter;

  beforeEach(async () => {
    browser = new FakeExploreBrowserTabsBrowser();
    router = new FakeRouter();

    await TestBed.configureTestingModule({
      imports: [ExploreBrowserTabsPage],
      providers: [
        { provide: ExploreBrowserFacade, useValue: browser },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreBrowserTabsPage);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders tabs as a vertical list with URL-derived labels', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const rows = nativeElement.querySelectorAll('.tab-list ion-item');

    expect(rows.length).toBe(3);
    expect(rows.item(0).textContent).toContain('example.com');
    expect(rows.item(1).textContent).toContain('Buku Articles');
    expect(rows.item(2).textContent).toContain('Blank tab');
    expect(rows.item(1).classList.contains('tab-list-active')).toBeTrue();
  });

  it('renders URL path labels before a page title is available', () => {
    browser.tabs.set([{ id: 'tab-1', url: 'https://example.com/path', pageTitle: null }]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const row = nativeElement.querySelector('.tab-list ion-item');

    expect(row?.querySelector('h2')?.textContent).toBe('example.com/path');
  });

  it('creates a blank tab and returns to the browser view', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const newTabButton = nativeElement.querySelector('ion-buttons[slot="end"] ion-button');

    newTabButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.blankTabs).toBe(1);
    expect(router.navigations).toEqual([['explore']]);
  });

  it('selects a tab and returns to the browser view', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const row = nativeElement.querySelectorAll('.tab-list ion-item').item(0);

    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.selectedTabId).toBe('tab-1');
    expect(router.navigations).toEqual([['explore']]);
  });

  it('closes a tab without also selecting it', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const closeButton = nativeElement.querySelectorAll('.tab-list ion-button').item(1);

    closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.closedTabId).toBe('tab-2');
    expect(browser.selectedTabId).toBeNull();
    expect(router.navigations).toEqual([]);
  });

  it('closes back to the browser view', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const closeButton = nativeElement.querySelector('ion-buttons[slot="start"] ion-button');

    closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(router.navigations).toEqual([['explore']]);
  });
});
