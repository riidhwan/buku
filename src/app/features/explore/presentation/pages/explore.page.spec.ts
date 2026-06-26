import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExplorePage } from './explore.page';

describe('ExplorePage', () => {
  let fixture: ComponentFixture<ExplorePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExplorePage],
    }).compileComponents();

    fixture = TestBed.createComponent(ExplorePage);
    fixture.detectChanges();
  });

  it('renders the page title', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const title = nativeElement.querySelector('ion-title')?.textContent.trim();

    expect(title).toBe('Explore');
  });
});
