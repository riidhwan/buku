import { computed, signal } from '@angular/core';
import type { ReadingArticleSnapshot } from '../domain/reading-article';
import {
  canUseNativeBackNavigation,
  initialExploreBrowserBackNavigationState,
  type ExploreBrowserBackNavigationState,
} from './explore-browser-back-navigation-policy';
import {
  findExploreBrowserTab,
  lastExploreBrowserUrl,
  recentExploreBrowserTabs,
} from './explore-browser-session-policy';
import type { BrowserNotice } from './explore-browser-notice-policy';
import type { ExploreBrowserSecureNavigationFailure } from './explore-browser-secure-navigation-failure';
import type { ExploreBrowserTab } from './ports/browser-session-store.port';

export class ExploreBrowserWorkflowState {
  public readonly inputValueSignal = signal('');
  public readonly currentUrlSignal = signal<string | null>(null);
  public readonly tabsSignal = signal<readonly ExploreBrowserTab[]>([]);
  public readonly selectedTabIdSignal = signal<string | null>(null);
  public readonly loadingSignal = signal(false);
  public readonly nativeCanGoBackSignal = signal(false);
  public readonly canGoForwardSignal = signal(false);
  public readonly validationErrorSignal = signal<string | null>(null);
  public readonly noticeSignal = signal<BrowserNotice | null>(null);
  public readonly secureNavigationFailureSignal =
    signal<ExploreBrowserSecureNavigationFailure | null>(null);
  public readonly readingModeActiveSignal = signal(false);
  public readonly readingArticleSignal = signal<ReadingArticleSnapshot | null>(null);
  public readonly chapterNavigationLoadingSignal = signal(false);
  public backNavigationState: ExploreBrowserBackNavigationState =
    initialExploreBrowserBackNavigationState();

  public readonly inputValue = this.inputValueSignal.asReadonly();
  public readonly currentUrl = this.currentUrlSignal.asReadonly();
  public readonly tabs = this.tabsSignal.asReadonly();
  public readonly activeTab = computed(() => this.findActiveTab());
  public readonly recentTabs = computed(() => recentExploreBrowserTabs(this.tabsSignal()));
  public readonly lastUrl = computed(() => lastExploreBrowserUrl(this.tabsSignal()));
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly canGoBack = computed(
    () =>
      this.secureNavigationFailureSignal() !== null ||
      this.activeBackStack().length > 0 ||
      canUseNativeBackNavigation(this.nativeCanGoBackSignal(), this.backNavigationState),
  );
  public readonly canGoForward = this.canGoForwardSignal.asReadonly();
  public readonly validationError = this.validationErrorSignal.asReadonly();
  public readonly notice = this.noticeSignal.asReadonly();
  public readonly secureNavigationFailure = this.secureNavigationFailureSignal.asReadonly();
  public readonly readingModeActive = this.readingModeActiveSignal.asReadonly();
  public readonly readingArticle = this.readingArticleSignal.asReadonly();
  public readonly chapterNavigationLoading = this.chapterNavigationLoadingSignal.asReadonly();
  public readonly isSecure = computed(
    () => this.currentUrlSignal()?.startsWith('https://') ?? false,
  );
  public readonly isInsecure = computed(
    () => this.currentUrlSignal()?.startsWith('http://') ?? false,
  );

  public findActiveTab(): ExploreBrowserTab | null {
    return findExploreBrowserTab(this.tabsSignal(), this.selectedTabIdSignal());
  }

  public activeBackStack(): readonly string[] {
    return this.findActiveTab()?.backStack ?? [];
  }
}
