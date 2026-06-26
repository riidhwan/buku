import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { ExploreBrowserFacade } from '../../application/explore-browser.facade';
import { ExplorePage } from './explore.page';

class FakeExploreBrowserFacade {
  public readonly inputValue = signal('');
  public readonly lastUrl = signal<string | null>(null);
  public readonly validationError = signal<string | null>(null);
  public updatedValue = '';
  public openResult = true;
  public resumeResult = true;
  public initializeCount = 0;
  public openCount = 0;
  public resumeCount = 0;

  public initialize(): Promise<void> {
    this.initializeCount += 1;
    return Promise.resolve();
  }

  public updateInputValue(value: string): void {
    this.updatedValue = value;
    this.inputValue.set(value);
  }

  public openInput(): Promise<{ readonly ok: boolean }> {
    this.openCount += 1;
    return Promise.resolve({ ok: this.openResult });
  }

  public resumeLastUrl(): Promise<{ readonly ok: boolean }> {
    this.resumeCount += 1;
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

  it('renders and resumes the last opened URL row', async () => {
    browser.lastUrl.set('https://example.com/');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const row = queryRequired(nativeElement, '.last-session ion-item');
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(row.textContent).toContain('https://example.com/');
    expect(browser.resumeCount).toBe(1);
    expect(router.navigations).toEqual([['explore', 'browser']]);
  });
});
