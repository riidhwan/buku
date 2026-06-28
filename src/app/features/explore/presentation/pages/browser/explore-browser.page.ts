import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  bookmarkOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  copyOutline,
  ellipsisVerticalOutline,
  lockClosedOutline,
  openOutline,
  readerOutline,
  refreshOutline,
  stopOutline,
  warningOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import type { ReadingChapterDirection } from '../../../application/explore-browser-reading-mode-policy';
import { BrowserViewportRect } from '../../../application/ports/browser-viewport.port';
import { READING_LIBRARY_SAVE } from '../../../application/ports/reading-library-save.port';
import { ExploreBrowserReaderSaveActions } from './explore-browser-reader-save-actions';

@Component({
  selector: 'app-explore-browser-page',
  templateUrl: './explore-browser.page.html',
  styleUrl: './explore-browser.page.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonNote,
    IonSpinner,
    IonText,
    IonTitle,
    IonToast,
    IonToolbar,
  ],
})
export class ExploreBrowserPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('viewportHost', { static: true })
  private readonly viewportHost!: ElementRef<HTMLElement>;

  protected readonly browser = inject(ExploreBrowserFacade);
  public readonly actionsOpen = signal(false);
  public readonly addressBarFocused = signal(false);
  private readonly librarySave = inject(READING_LIBRARY_SAVE);
  protected readonly readerSave = new ExploreBrowserReaderSaveActions(
    this.browser,
    this.librarySave,
  );
  private readonly router = inject(Router);
  private readonly platform = inject(Platform);
  private readonly publishedTimeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
  private readonly backButtonSubscription: Subscription;
  private viewportUpdateTimer: number | null = null;
  private readonly resizeListener = (): void => {
    void this.updateViewportRect();
  };

  public constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      bookmarkOutline,
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
      copyOutline,
      ellipsisVerticalOutline,
      lockClosedOutline,
      openOutline,
      readerOutline,
      refreshOutline,
      stopOutline,
      warningOutline,
    });
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(
      10,
      (processNextHandler) => {
        void this.handleHardwareBackButton(processNextHandler);
      },
    );
  }

  public ngOnInit(): void {
    void this.browser.initialize();
  }

  public ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeListener);
    void this.updateViewportRect();
  }

  public ionViewDidEnter(): void {
    this.scheduleViewportRectUpdate();
  }

  public ionViewWillLeave(): void {
    this.clearViewportUpdateTimer();
    void this.browser.hideViewport();
  }

  public ngOnDestroy(): void {
    this.backButtonSubscription.unsubscribe();
    window.removeEventListener('resize', this.resizeListener);
    this.clearViewportUpdateTimer();
    void this.browser.hideViewport();
  }

  protected updateUrl(event: CustomEvent<{ readonly value?: string | null }>): void {
    this.browser.updateInputValue(event.detail.value ?? '');
  }

  protected async openUrl(): Promise<void> {
    await this.browser.openInput();
  }

  public focusAddressBar(): void {
    this.addressBarFocused.set(true);
    if (this.actionsOpen()) {
      this.closeActions();
      this.scheduleViewportRectUpdate();
    }
  }

  public blurAddressBar(): void {
    this.addressBarFocused.set(false);
    this.browser.updateInputValue(this.browser.currentUrl() ?? '');
  }

  public clearAddressBar(): void {
    this.browser.updateInputValue('');
  }

  protected async openTabs(): Promise<void> {
    this.closeActions();
    await this.browser.hideViewport();
    await this.router.navigate(['explore', 'browser', 'tabs']);
  }

  protected async openNoticeUrlExternally(): Promise<void> {
    await this.browser.openCurrentUrlExternally();
    this.browser.dismissNotice();
  }

  protected async openReadingMode(): Promise<void> {
    const wasActive = this.browser.readingModeActive();
    const result = await this.browser.openReadingMode();
    this.closeActions();
    if (result.ok && wasActive) {
      this.scheduleViewportRectUpdate();
    }
  }

  protected async openReaderLink(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest('a');
    const href = link?.getAttribute('href') ?? null;
    if (href === null) {
      return;
    }

    event.preventDefault();
    await this.browser.openReadingModeLink(href);
    this.scheduleViewportRectUpdate();
  }

  protected async navigateChapter(direction: ReadingChapterDirection): Promise<void> {
    await this.browser.navigateReadingChapter(direction);
    this.scheduleViewportRectUpdate();
  }

  protected formatPublishedTime(publishedTime: string): string {
    const date = new Date(publishedTime);
    if (Number.isNaN(date.getTime())) {
      return publishedTime;
    }

    return this.publishedTimeFormatter.format(date);
  }

  public openActions(): void {
    this.actionsOpen.update((isOpen) => !isOpen);
    this.scheduleViewportRectUpdate();
  }

  public closeActions(): void {
    this.actionsOpen.set(false);
  }

  private async handleHardwareBackButton(processNextHandler: () => void): Promise<void> {
    if (this.actionsOpen()) {
      this.closeActions();
      this.scheduleViewportRectUpdate();
      return;
    }

    if (this.browser.readingModeActive()) {
      this.browser.closeReadingMode();
      this.scheduleViewportRectUpdate();
      return;
    }

    if (this.browser.canGoBack()) {
      const result = await this.browser.goBack();
      if (result.didNavigate) {
        return;
      }
    }

    processNextHandler();
  }

  private scheduleViewportRectUpdate(): void {
    this.clearViewportUpdateTimer();

    this.viewportUpdateTimer = window.setTimeout(() => {
      this.viewportUpdateTimer = null;
      void this.updateViewportRect();
    });
  }

  private clearViewportUpdateTimer(): void {
    if (this.viewportUpdateTimer !== null) {
      window.clearTimeout(this.viewportUpdateTimer);
      this.viewportUpdateTimer = null;
    }
  }

  private async updateViewportRect(): Promise<void> {
    const rect = this.viewportHost.nativeElement.getBoundingClientRect();
    const viewportRect: BrowserViewportRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    await this.browser.showViewport(viewportRect);
  }
}
