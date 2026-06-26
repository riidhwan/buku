import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MorePage } from './more.page';

describe('MorePage', () => {
  let fixture: ComponentFixture<MorePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MorePage],
    }).compileComponents();

    fixture = TestBed.createComponent(MorePage);
    fixture.detectChanges();
  });

  it('renders the page title', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const title = nativeElement.querySelector('ion-title')?.textContent.trim();

    expect(title).toBe('More');
  });
});
