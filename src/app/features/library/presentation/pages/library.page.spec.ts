import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryPage } from './library.page';

describe('LibraryPage', () => {
  let fixture: ComponentFixture<LibraryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryPage],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryPage);
    fixture.detectChanges();
  });

  it('renders the page title', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const title = nativeElement.querySelector('ion-title')?.textContent.trim();

    expect(title).toBe('Library');
  });
});
