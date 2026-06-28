import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { ExploreBrowserFacade } from '../../application/explore-browser.facade';
import { ExplorePage } from './explore.page';

class FakeExploreBrowserFacade {
  public readonly inputValue = signal('');
  public readonly recentTabs = signal<
    readonly {
      readonly id: string;
      readonly url: string | null;
      readonly pageTitle: string | null;
    }[]
  >([]);
  public readonly validationError = signal<string | null>(null);
  public updatedValue = '';
  public openResult = true;
  public resumeResult = true;
  public initializeCount = 0;
  public openCount = 0;
  public resumeCount = 0;
  public resumedTabId: string | null = null;

  public initialize(): Promise<void> {
    this.initializeCount += 1;
    return Promise.resolve();
  }

  public updateInputValue(value: string): void {
    this.updatedValue = value;
    this.inputValue.set(value);
  }

  public openInputInNewTab(): Promise<{ readonly ok: boolean }> {
    this.openCount += 1;
    return Promise.resolve({ ok: this.openResult });
  }

  public resumeTab(tabId: string): Promise<{ readonly ok: boolean }> {
    this.resumeCount += 1;
    this.resumedTabId = tabId;
    return Promise.resolve({ ok: this.resumeResult });
  }
}

class FakeRouter {
  public readonly navigations: string[][] = [];

  public navigate(commands: string[]): Promise<boolean> {
    this.navigations.push(commands);
    return Promise.resolve(true);
  }
}

function queryRequired(root: ParentNode, selector: string): Element {
  const element = root.querySelector(selector);
  if (element === null) {
    throw new Error(`Missing element: ${selector}`);
  }

  return element;
}

describe('ExplorePage', () => {
  let fixture: ComponentFixture<ExplorePage>;
  let browser: FakeExploreBrowserFacade;
  let router: FakeRouter;

  beforeEach(async () => {
    browser = new FakeExploreBrowserFacade();
    router = new FakeRouter();

    await TestBed.configureTestingModule({
      imports: [ExplorePage],
      providers: [
        { provide: ExploreBrowserFacade, useValue: browser },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExplorePage);
    fixture.detectChanges();
  });

  it('renders the page title', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const title = nativeElement.querySelector('ion-title')?.textContent.trim();

    expect(title).toBe('Explore');
    expect(browser.initializeCount).toBe(1);
  });

  it('shows inline URL validation', () => {
    browser.validationError.set('Enter a URL, not search terms.');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = queryRequired(nativeElement, 'ion-input');

    expect(input.classList.contains('ion-invalid')).toBeTrue();
  });

  it('lets the application URL policy validate bare domains', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = queryRequired(nativeElement, 'ion-input');

    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('url');
  });

  it('updates URL input state from Ionic input events', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = queryRequired(nativeElement, 'ion-input');

    input.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: { value: 'example.com' },
      }),
    );

    expect(browser.updatedValue).toBe('example.com');
  });

  it('treats empty Ionic input event values as an empty string', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const input = queryRequired(nativeElement, 'ion-input');

    input.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: {},
      }),
    );

    expect(browser.updatedValue).toBe('');
  });

  it('opens a valid URL in the browser route', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const form = queryRequired(nativeElement, 'form');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(browser.openCount).toBe(1);
    expect(router.navigations).toEqual([['explore', 'browser']]);
  });

  it('does not navigate when URL validation fails', async () => {
    browser.openResult = false;
    const nativeElement = fixture.nativeElement as HTMLElement;
    const form = queryRequired(nativeElement, 'form');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(router.navigations).toEqual([]);
  });

  it('renders and resumes recent tab rows', async () => {
    browser.recentTabs.set([
      { id: 'tab-1', url: 'https://example.com/path', pageTitle: 'Example Path' },
    ]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const row = queryRequired(nativeElement, '.recent-tabs ion-item');
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(row.textContent).toContain('Example Path');
    expect(row.textContent).toContain('https://example.com/');
    expect(browser.resumeCount).toBe(1);
    expect(browser.resumedTabId).toBe('tab-1');
    expect(router.navigations).toEqual([['explore', 'browser']]);
  });

  it('renders URL labels for root and blank tab rows', () => {
    browser.recentTabs.set([
      { id: 'tab-1', url: 'https://example.com/', pageTitle: null },
      { id: 'tab-2', url: null, pageTitle: null },
    ]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const rows = nativeElement.querySelectorAll('.recent-tabs ion-item');

    expect(rows.item(0).querySelector('h2')?.textContent).toBe('example.com');
    expect(rows.item(1).textContent).toContain('Blank tab');
  });

  it('renders URL path labels before a page title is available', () => {
    browser.recentTabs.set([{ id: 'tab-1', url: 'https://example.com/path', pageTitle: null }]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const row = queryRequired(nativeElement, '.recent-tabs ion-item');

    expect(row.querySelector('h2')?.textContent).toBe('example.com/path');
  });
});
