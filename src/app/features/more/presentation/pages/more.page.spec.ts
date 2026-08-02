import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { MoreFacade } from '../../application/more.facade';
import { MorePage } from './more.page';

class FakeMoreFacade {
  public readonly manualChapterNavigationRules = signal([
    {
      id: 'rules-1',
      host: 'example.com',
      pathPrefix: '/story/',
      enabled: true,
      previousLabel: null,
      nextLabel: 'Next',
      unverified: true,
      lastFailed: false,
    },
  ]);
  public loadCount = 0;
  public enabledCall: { readonly id: string; readonly enabled: boolean } | null = null;
  public deletedId: string | null = null;

  public loadManualChapterNavigationRules(): Promise<void> {
    this.loadCount += 1;
    return Promise.resolve();
  }

  public setManualChapterNavigationRuleEnabled(id: string, enabled: boolean): Promise<void> {
    this.enabledCall = { id, enabled };
    return Promise.resolve();
  }

  public deleteManualChapterNavigationRule(id: string): Promise<void> {
    this.deletedId = id;
    return Promise.resolve();
  }
}

describe('MorePage', () => {
  let fixture: ComponentFixture<MorePage>;
  let facade: FakeMoreFacade;

  beforeEach(async () => {
    facade = new FakeMoreFacade();
    await TestBed.configureTestingModule({
      imports: [MorePage],
      providers: [provideRouter([]), { provide: MoreFacade, useValue: facade }],
    }).compileComponents();

    fixture = TestBed.createComponent(MorePage);
    fixture.detectChanges();
  });

  it('renders the page title', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const title = nativeElement.querySelector('ion-title')?.textContent.trim();

    expect(title).toBe('More');
  });

  it('renders App Update as a menu item', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const item = nativeElement.querySelector('ion-item');

    expect(item?.textContent).toContain('App Update');
    expect(item?.textContent).toContain('Check for a new Buku release.');
  });

  it('loads and manages manual chapter navigation rules', async () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(facade.loadCount).toBe(1);
    expect(nativeElement.textContent).toContain('example.com/story/');
    expect(nativeElement.textContent).toContain('Previous: Not set · Next: Next');
    expect(nativeElement.textContent).toContain('Unverified edit');

    const page = fixture.debugElement.componentInstance as MorePage & {
      toggleRule(id: string, enabled: boolean): Promise<void>;
      deleteRule(id: string): Promise<void>;
    };
    await page.toggleRule('rules-1', true);
    await page.deleteRule('rules-1');

    expect(facade.enabledCall).toEqual({ id: 'rules-1', enabled: false });
    expect(facade.deletedId).toBe('rules-1');
    expect(fixture.debugElement.queryAll(By.css('ion-button')).length).toBeGreaterThan(0);
  });
});
