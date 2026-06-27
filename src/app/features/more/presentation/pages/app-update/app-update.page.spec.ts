import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AppUpdateViewState, MoreFacade } from '../../../application/more.facade';
import { AppUpdatePage } from './app-update.page';

class FakeMoreFacade {
  public readonly appUpdate = signal<AppUpdateViewState>({ status: 'idle' });
  public readonly appUpdateBusy = signal(false);
  public checkCount = 0;
  public installCount = 0;

  public checkForAppUpdate(): Promise<void> {
    this.checkCount += 1;
    return Promise.resolve();
  }

  public installAppUpdate(): Promise<void> {
    this.installCount += 1;
    return Promise.resolve();
  }
}

describe('AppUpdatePage', () => {
  let fixture: ComponentFixture<AppUpdatePage>;
  let facade: FakeMoreFacade;

  beforeEach(async () => {
    facade = new FakeMoreFacade();

    await TestBed.configureTestingModule({
      imports: [AppUpdatePage],
      providers: [{ provide: MoreFacade, useValue: facade }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppUpdatePage);
    fixture.detectChanges();
  });

  it('renders the App Update title without checking automatically', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('ion-title')?.textContent.trim()).toBe('App Update');
    expect(nativeElement.textContent).toContain('Keep Buku up to date');
    expect(facade.checkCount).toBe(0);
  });

  it('starts a manual update check from the action button', () => {
    const button = findButton('Check for update');

    button.click();

    expect(facade.checkCount).toBe(1);
  });

  it('renders an install action for an available update', () => {
    facade.appUpdate.set({
      status: 'update-available',
      installedVersion: '0.1.0',
      release: releaseState(),
    });
    fixture.detectChanges();

    expect(text()).toContain('Available 0.1.1');
    findButton('Install update').click();

    expect(facade.installCount).toBe(1);
  });

  it('keeps install available after an install permission failure', () => {
    facade.appUpdate.set({
      status: 'failure',
      reason: 'install-permission-required',
      installedVersion: '0.1.0',
      release: releaseState(),
    });
    fixture.detectChanges();

    expect(text()).toContain('Allow installs from Buku');
    expect(findButton('Install update')).toBeTruthy();
  });

  it('renders fallback failure copy for unknown failure reasons', () => {
    facade.appUpdate.set({
      status: 'failure',
      reason: 'unexpected' as 'network-unavailable',
      installedVersion: null,
      release: null,
    });
    fixture.detectChanges();

    expect(text()).toContain('The update check failed. Try again.');
  });

  function findButton(label: string): HTMLElement {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(nativeElement.querySelectorAll('ion-button'));
    const button = buttons.find((candidate) => candidate.textContent.includes(label));
    if (button === undefined) {
      throw new Error(`Missing button: ${label}`);
    }

    return button;
  }

  function text(): string {
    const nativeElement = fixture.nativeElement as HTMLElement;
    return nativeElement.textContent;
  }
});

function releaseState() {
  return {
    version: { raw: '0.1.1', semver: { major: 0, minor: 1, patch: 1 } },
    title: 'Buku 0.1.1',
    notes: 'Release notes',
    htmlUrl: 'https://github.example/releases/tag/0.1.1',
    apk: {
      name: 'buku-0.1.1.apk',
      downloadUrl: 'https://download.example/buku-0.1.1.apk',
    },
  };
}
