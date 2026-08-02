import { Injectable, inject } from '@angular/core';
import {
  manualChapterRuleIsVerified,
  ManualChapterNavigationRule,
} from '../features/explore/domain/manual-chapter-navigation-rule';
import { ManualChapterNavigationRuleWorkflow } from '../features/explore/application/manual-chapter-navigation-rule-workflow';
import {
  ManualChapterNavigationRuleManagementItem,
  ManualChapterNavigationRuleManagementPort,
} from '../features/more/application/ports/manual-chapter-navigation-management.port';

@Injectable()
export class ManualChapterNavigationManagementAdapter implements ManualChapterNavigationRuleManagementPort {
  private readonly workflow = inject(ManualChapterNavigationRuleWorkflow);

  public async list(): Promise<readonly ManualChapterNavigationRuleManagementItem[]> {
    return (await this.workflow.listRuleSets()).map(toManagementItem);
  }

  public async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.workflow.setEnabled(id, enabled);
  }

  public async delete(id: string): Promise<void> {
    await this.workflow.deleteRuleSet(id);
  }
}

function toManagementItem(ruleSet: {
  readonly id: string;
  readonly scope: { readonly host: string; readonly pathPrefix: string | null };
  readonly enabled: boolean;
  readonly previous: ManualChapterNavigationRule | null;
  readonly next: ManualChapterNavigationRule | null;
}): ManualChapterNavigationRuleManagementItem {
  return {
    id: ruleSet.id,
    host: ruleSet.scope.host,
    pathPrefix: ruleSet.scope.pathPrefix,
    enabled: ruleSet.enabled,
    previousLabel: labelForRule(ruleSet.previous),
    nextLabel: labelForRule(ruleSet.next),
    unverified: ruleIsUnverified(ruleSet.previous) || ruleIsUnverified(ruleSet.next),
    lastFailed: ruleHasFailed(ruleSet.previous) || ruleHasFailed(ruleSet.next),
  };
}

function ruleIsUnverified(rule: ManualChapterNavigationRule | null): boolean {
  return rule !== null && !manualChapterRuleIsVerified(rule);
}

function ruleHasFailed(rule: ManualChapterNavigationRule | null): boolean {
  return rule?.lastFailedAt !== null && rule?.lastFailedAt !== undefined;
}

function labelForRule(rule: ManualChapterNavigationRule | null): string | null {
  return rule?.sampleLabel ?? rule?.sampleHref ?? null;
}
