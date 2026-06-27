import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MorePage } from './more.page';

describe('MorePage', () => {
  let fixture: ComponentFixture<MorePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MorePage],
      providers: [provideRouter([])],
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
});
