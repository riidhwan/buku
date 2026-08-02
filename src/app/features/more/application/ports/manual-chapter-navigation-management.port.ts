import { InjectionToken } from '@angular/core';

export interface ManualChapterNavigationRuleManagementItem {
  readonly id: string;
  readonly host: string;
  readonly pathPrefix: string | null;
  readonly enabled: boolean;
  readonly previousLabel: string | null;
  readonly nextLabel: string | null;
  readonly unverified: boolean;
  readonly lastFailed: boolean;
}

export interface ManualChapterNavigationRuleManagementPort {
  list(): Promise<readonly ManualChapterNavigationRuleManagementItem[]>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}

export const MANUAL_CHAPTER_NAVIGATION_MANAGEMENT =
  new InjectionToken<ManualChapterNavigationRuleManagementPort>(
    'MANUAL_CHAPTER_NAVIGATION_MANAGEMENT',
  );
