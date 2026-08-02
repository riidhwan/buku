import { InjectionToken } from '@angular/core';
import { ManualChapterNavigationRuleSet } from '../../domain/manual-chapter-navigation-rule';

export type ManualChapterNavigationRepositoryResult =
  | {
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason: 'duplicateScope' | 'notFound' | 'persistenceFailed';
    };

export interface ManualChapterNavigationRuleRepositoryPort {
  list(): Promise<readonly ManualChapterNavigationRuleSet[]>;
  save(ruleSet: ManualChapterNavigationRuleSet): Promise<ManualChapterNavigationRepositoryResult>;
  delete(id: string): Promise<ManualChapterNavigationRepositoryResult>;
}

export const MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY =
  new InjectionToken<ManualChapterNavigationRuleRepositoryPort>(
    'MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY',
  );
