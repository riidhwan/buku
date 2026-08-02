import { inject, Injectable } from '@angular/core';
import {
  ManualChapterDirection,
  ManualChapterNavigationPayload,
  ManualChapterNavigationRule,
  ManualChapterNavigationRuleSet,
  ManualChapterSelectorMode,
  mostSpecificRuleSetForUrl,
  scopeForUrl,
  toManualChapterNavigationPayload,
} from '../domain/manual-chapter-navigation-rule';
import {
  BrowserSourceLinkContext,
  BrowserViewportPort,
  BrowserViewportSelectorPreview,
  BROWSER_VIEWPORT,
  ManualChapterNavigationPreviewInput,
} from './ports/browser-viewport.port';
import {
  MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
  ManualChapterNavigationRepositoryResult,
  ManualChapterNavigationRuleRepositoryPort,
} from './ports/manual-chapter-navigation-rule-repository.port';

export interface ManualChapterRuleDraft {
  readonly sourceUrl: string;
  readonly direction: ManualChapterDirection;
  readonly scopePathPrefix: string | null;
  readonly selectorMode: ManualChapterSelectorMode;
  readonly selector: string;
  readonly selectedHref: string | null;
}

export type SaveManualChapterRuleResult =
  | {
      readonly ok: true;
      readonly ruleSet: ManualChapterNavigationRuleSet;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'duplicateScope'
        | 'invalidSelector'
        | 'mismatchedSelection'
        | 'noMatch'
        | 'persistenceFailed';
    };

type ValidatedManualChapterPreview =
  | {
      readonly ok: true;
      readonly preview: Extract<BrowserViewportSelectorPreview, { readonly ok: true }>;
      readonly selectedMatch: NonNullable<
        Extract<BrowserViewportSelectorPreview, { readonly ok: true }>['selected']
      >;
    }
  | Exclude<SaveManualChapterRuleResult, { readonly ok: true }>;

@Injectable()
export class ManualChapterNavigationRuleWorkflow {
  private readonly repository = inject<ManualChapterNavigationRuleRepositoryPort>(
    MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY,
  );
  private readonly viewport = inject<BrowserViewportPort>(BROWSER_VIEWPORT, { optional: true });

  public listRuleSets(): Promise<readonly ManualChapterNavigationRuleSet[]> {
    return this.repository.list();
  }

  public async selectedPayloadForUrl(
    url: string,
  ): Promise<ManualChapterNavigationPayload | undefined> {
    const selected = mostSpecificRuleSetForUrl(await this.repository.list(), url);
    return toManualChapterNavigationPayload(selected);
  }

  public async previewCurrentPage(
    input: ManualChapterNavigationPreviewInput,
  ): Promise<BrowserViewportSelectorPreview> {
    if (this.viewport === null) {
      return { ok: false, reason: 'browserUnavailable', matches: [], automatic: null };
    }

    return this.viewport.previewManualChapterNavigation(input);
  }

  public async saveFromLivePreview(
    draft: ManualChapterRuleDraft,
    sourceLink: BrowserSourceLinkContext | null,
  ): Promise<SaveManualChapterRuleResult> {
    const validated = await this.validatedLivePreview(draft, sourceLink);
    if (!validated.ok) {
      return validated;
    }

    const now = new Date().toISOString();
    const scope = scopeForUrl(draft.sourceUrl, draft.scopePathPrefix);
    const existing = (await this.repository.list()).find(
      (ruleSet) =>
        ruleSet.scope.host === scope.host && ruleSet.scope.pathPrefix === scope.pathPrefix,
    );
    const ruleSet = toRuleSet(draft, validated, existing, now);
    const saved = await this.repository.save(ruleSet);
    return saved.ok ? { ok: true, ruleSet } : { ok: false, reason: toSaveFailureReason(saved) };
  }

  private async validatedLivePreview(
    draft: ManualChapterRuleDraft,
    sourceLink: BrowserSourceLinkContext | null,
  ): Promise<ValidatedManualChapterPreview> {
    const preview = await this.previewCurrentPage(toPreviewInput(draft));
    if (!preview.ok) {
      return toPreviewFailure(preview);
    }

    const selectedMatch = selectedMatchFromPreview(preview);
    if (selectedMatch === null) {
      return { ok: false, reason: 'noMatch' };
    }

    if (!selectedMatchMatchesExpectedHref(selectedMatch.href, draft, sourceLink)) {
      return { ok: false, reason: 'mismatchedSelection' };
    }

    return { ok: true, preview, selectedMatch };
  }

  public async updateRuleSet(
    ruleSet: ManualChapterNavigationRuleSet,
  ): Promise<ManualChapterNavigationRepositoryResult> {
    return this.repository.save({ ...ruleSet, updatedAt: new Date().toISOString() });
  }

  public async setEnabled(
    id: string,
    enabled: boolean,
  ): Promise<ManualChapterNavigationRepositoryResult> {
    const ruleSet = (await this.repository.list()).find((candidate) => candidate.id === id);
    if (ruleSet === undefined) {
      return { ok: false, reason: 'notFound' };
    }

    return this.updateRuleSet({ ...ruleSet, enabled });
  }

  public deleteRuleSet(id: string): Promise<ManualChapterNavigationRepositoryResult> {
    return this.repository.delete(id);
  }
}

function toSaveFailureReason(
  result: Exclude<ManualChapterNavigationRepositoryResult, { readonly ok: true }>,
): Exclude<SaveManualChapterRuleResult, { readonly ok: true }>['reason'] {
  return result.reason === 'duplicateScope' ? 'duplicateScope' : 'persistenceFailed';
}

function createRuleSetId(): string {
  return globalThis.crypto.randomUUID();
}

function selectedMatchFromPreview(
  preview: Extract<BrowserViewportSelectorPreview, { readonly ok: true }>,
): NonNullable<Extract<BrowserViewportSelectorPreview, { readonly ok: true }>['selected']> | null {
  return preview.selected ?? preview.matches[0] ?? null;
}

function selectedMatchMatchesExpectedHref(
  selectedHref: string,
  draft: ManualChapterRuleDraft,
  sourceLink: BrowserSourceLinkContext | null,
): boolean {
  const expectedHref = draft.selectedHref ?? sourceLink?.href ?? null;
  if (expectedHref === null) {
    return true;
  }

  return hrefsMatch(selectedHref, expectedHref, draft.sourceUrl);
}

function hrefsMatch(left: string, right: string, baseUrl: string): boolean {
  try {
    return new URL(left, baseUrl).toString() === new URL(right, baseUrl).toString();
  } catch (_error) {
    return left === right;
  }
}

function toPreviewInput(draft: ManualChapterRuleDraft): ManualChapterNavigationPreviewInput {
  return {
    direction: draft.direction,
    selectorMode: draft.selectorMode,
    selector: draft.selector,
    selectedHref: draft.selectedHref,
  };
}

function toPreviewFailure(
  preview: Exclude<BrowserViewportSelectorPreview, { readonly ok: true }>,
): Exclude<SaveManualChapterRuleResult, { readonly ok: true }> {
  return {
    ok: false,
    reason: preview.reason === 'invalidSelector' ? 'invalidSelector' : 'noMatch',
  };
}

function toRuleSet(
  draft: ManualChapterRuleDraft,
  validated: Extract<ValidatedManualChapterPreview, { readonly ok: true }>,
  existing: ManualChapterNavigationRuleSet | undefined,
  now: string,
): ManualChapterNavigationRuleSet {
  const rule = toRule(draft, validated, now);
  return {
    id: existing?.id ?? createRuleSetId(),
    scope: scopeForUrl(draft.sourceUrl, draft.scopePathPrefix),
    enabled: existing?.enabled ?? true,
    previous: previousRuleForDraft(draft, rule, existing),
    next: nextRuleForDraft(draft, rule, existing),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function previousRuleForDraft(
  draft: ManualChapterRuleDraft,
  rule: ManualChapterNavigationRule,
  existing: ManualChapterNavigationRuleSet | undefined,
): ManualChapterNavigationRule | null {
  return draft.direction === 'previous' ? rule : (existing?.previous ?? null);
}

function nextRuleForDraft(
  draft: ManualChapterRuleDraft,
  rule: ManualChapterNavigationRule,
  existing: ManualChapterNavigationRuleSet | undefined,
): ManualChapterNavigationRule | null {
  return draft.direction === 'next' ? rule : (existing?.next ?? null);
}

function toRule(
  draft: ManualChapterRuleDraft,
  validated: Extract<ValidatedManualChapterPreview, { readonly ok: true }>,
  now: string,
): ManualChapterNavigationRule {
  return {
    direction: draft.direction,
    selectorMode: draft.selectorMode,
    selector: draft.selector,
    disambiguation: null,
    sampleLabel: validated.selectedMatch.label,
    sampleHref: validated.selectedMatch.href,
    verifiedAt: now,
    lastFailedAt: null,
    failureReason: null,
  };
}
