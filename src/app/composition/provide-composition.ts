import { Provider } from '@angular/core';
import { ManualChapterNavigationRuleWorkflow } from '../features/explore/application/manual-chapter-navigation-rule-workflow';
import { MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY } from '../features/explore/application/ports/manual-chapter-navigation-rule-repository.port';
import { SqliteManualChapterNavigationRuleRepositoryAdapter } from '../features/explore/infrastructure/sqlite-manual-chapter-navigation-rule-repository.adapter';
import { MANUAL_CHAPTER_NAVIGATION_MANAGEMENT } from '../features/more/application/ports/manual-chapter-navigation-management.port';
import { ManualChapterNavigationManagementAdapter } from './manual-chapter-navigation-management.adapter';

export function provideComposition(): Provider[] {
  return [
    ManualChapterNavigationRuleWorkflow,
    SqliteManualChapterNavigationRuleRepositoryAdapter,
    ManualChapterNavigationManagementAdapter,
    {
      provide: MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
      useExisting: SqliteManualChapterNavigationRuleRepositoryAdapter,
    },
    {
      provide: MANUAL_CHAPTER_NAVIGATION_MANAGEMENT,
      useExisting: ManualChapterNavigationManagementAdapter,
    },
  ];
}
