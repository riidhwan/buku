import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  inject,
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
  IonProgressBar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
  Platform,
} from '@ionic/angular/standalone';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import type { ReadingChapterDirection } from '../../../application/explore-browser-reading-mode-policy';
import { READING_LIBRARY_SAVE } from '../../../application/ports/reading-library-save.port';
import { ExploreBrowserPageActions } from './explore-browser-page-actions';
import { registerExploreBrowserPageIcons } from './explore-browser-page-icons';
import { ExploreBrowserPageShell } from './explore-browser-page-shell';
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
    IonProgressBar,
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
  @ViewChild('addressInput')
  private readonly addressInput!: IonInput;

  protected readonly browser = inject(ExploreBrowserFacade);
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
  public readonly pageActions = new ExploreBrowserPageActions(this.browser, {
    scheduleViewportRectUpdate: () => {
      this.pageShell.scheduleViewportRectUpdate();
    },
  });
  private readonly pageShell = new ExploreBrowserPageShell(
    this.browser,
    {
      isAddressBarFocused: () => this.pageActions.isAddressBarFocused(),
      blurAddressBar: () => {
        this.pageActions.blurAddressBar();
      },
      getAddressInput: () => this.addressInput,
      isActionsOpen: () => this.pageActions.isActionsOpen(),
      closeActions: () => {
        this.pageActions.closeActions();
      },
      getViewportElement: () => this.viewportHost.nativeElement,
    },
    this.platform,
  );

  public constructor() {
    registerExploreBrowserPageIcons();
  }

  public ngOnInit(): void {
    void this.browser.initialize();
  }

  public ngAfterViewInit(): void {
    this.pageShell.afterViewInit();
  }

  public ionViewDidEnter(): void {
    this.pageShell.ionViewDidEnter();
  }

  public ionViewWillLeave(): void {
    this.pageShell.ionViewWillLeave();
  }

  public ngOnDestroy(): void {
    this.pageShell.destroy();
  }

  protected updateUrl(event: CustomEvent<{ readonly value?: string | null }>): void {
    this.browser.updateInputValue(event.detail.value ?? '');
  }

  protected async openUrl(): Promise<void> {
    const result = await this.browser.openInput();
    if (result.ok) {
      await this.pageShell.blurAddressBar();
    }
  }

  protected async openTabs(): Promise<void> {
    this.pageActions.closeActions();
    await this.browser.hideViewport();
    await this.router.navigate(['explore', 'browser', 'tabs']);
  }

  protected async openNoticeUrlExternally(): Promise<void> {
    await this.browser.openCurrentUrlExternally();
    this.browser.dismissNotice();
  }

  protected async goBack(): Promise<void> {
    const result = await this.browser.goBack();
    if (result.didNavigate) {
      this.pageShell.scheduleViewportRectUpdate();
    }
  }

  protected async reloadOrRetry(): Promise<void> {
    if (this.browser.secureNavigationFailure() !== null) {
      await this.browser.retryCurrentUrl();
    } else {
      await this.browser.stopOrReload();
    }
    this.pageShell.scheduleViewportRectUpdate();
  }

  protected async openSecureNavigationFailureExternally(): Promise<void> {
    await this.browser.openSecureNavigationFailureExternally();
  }

  protected async openReadingMode(): Promise<void> {
    const wasActive = this.browser.readingModeActive();
    const result = await this.browser.openReadingMode();
    this.pageActions.closeActions();
    if (result.ok && wasActive) {
      this.pageShell.scheduleViewportRectUpdate();
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
    this.pageShell.scheduleViewportRectUpdate();
  }

  protected async navigateChapter(direction: ReadingChapterDirection): Promise<void> {
    await this.browser.navigateReadingChapter(direction);
    this.pageShell.scheduleViewportRectUpdate();
  }

  protected formatPublishedTime(publishedTime: string): string {
    const date = new Date(publishedTime);
    if (Number.isNaN(date.getTime())) {
      return publishedTime;
    }

    return this.publishedTimeFormatter.format(date);
  }
}
