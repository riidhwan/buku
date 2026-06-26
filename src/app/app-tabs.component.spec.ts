import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppTabsComponent } from './app-tabs.component';

describe('AppTabsComponent', () => {
  let fixture: ComponentFixture<AppTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTabsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppTabsComponent);
    fixture.detectChanges();
  });

  it('renders the primary navigation tabs', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const tabLabels = Array.from(nativeElement.querySelectorAll('ion-label'), (element) =>
      element.textContent.trim(),
    );

    expect(tabLabels).toEqual(['Library', 'Explore', 'More']);
  });
});
