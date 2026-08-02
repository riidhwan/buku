export type ManualChapterDirection = 'previous' | 'next';

export type ManualChapterSelectorMode = 'link' | 'container';

export interface ManualChapterNavigationScope {
  readonly host: string;
  readonly pathPrefix: string | null;
}

export interface ManualChapterNavigationDisambiguation {
  readonly href: string;
  readonly label: string | null;
}

export interface ManualChapterNavigationRule {
  readonly direction: ManualChapterDirection;
  readonly selectorMode: ManualChapterSelectorMode;
  readonly selector: string;
  readonly disambiguation: ManualChapterNavigationDisambiguation | null;
  readonly sampleLabel: string | null;
  readonly sampleHref: string | null;
  readonly verifiedAt: string | null;
  readonly lastFailedAt: string | null;
  readonly failureReason: string | null;
}

export interface ManualChapterNavigationRuleSet {
  readonly id: string;
  readonly scope: ManualChapterNavigationScope;
  readonly enabled: boolean;
  readonly previous: ManualChapterNavigationRule | null;
  readonly next: ManualChapterNavigationRule | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ManualChapterNavigationPayloadRule {
  readonly selectorMode: ManualChapterSelectorMode;
  readonly selector: string;
  readonly disambiguation: ManualChapterNavigationDisambiguation | null;
}

export interface ManualChapterNavigationPayload {
  readonly previous?: ManualChapterNavigationPayloadRule;
  readonly next?: ManualChapterNavigationPayloadRule;
}

export function scopeForUrl(url: string, pathPrefix: string | null): ManualChapterNavigationScope {
  const parsed = new URL(url);
  const normalizedPrefix = pathPrefix === null || pathPrefix.trim() === '' ? null : pathPrefix;
  return {
    host: parsed.host.toLowerCase(),
    pathPrefix: normalizedPrefix,
  };
}

export function scopeKey(scope: ManualChapterNavigationScope): string {
  return `${scope.host}${scope.pathPrefix ?? ''}`;
}

export function ruleSetAppliesToUrl(ruleSet: ManualChapterNavigationRuleSet, url: string): boolean {
  if (!ruleSet.enabled) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (_error) {
    return false;
  }

  if (parsed.host.toLowerCase() !== ruleSet.scope.host.toLowerCase()) {
    return false;
  }

  const pathPrefix = ruleSet.scope.pathPrefix;
  return pathPrefix === null || parsed.pathname.startsWith(pathPrefix);
}

export function mostSpecificRuleSetForUrl(
  ruleSets: readonly ManualChapterNavigationRuleSet[],
  url: string,
): ManualChapterNavigationRuleSet | null {
  return (
    ruleSets
      .filter((ruleSet) => ruleSetAppliesToUrl(ruleSet, url))
      .sort((left, right) => specificity(right) - specificity(left))[0] ?? null
  );
}

export function toManualChapterNavigationPayload(
  ruleSet: ManualChapterNavigationRuleSet | null,
): ManualChapterNavigationPayload | undefined {
  if (ruleSet?.enabled !== true) {
    return undefined;
  }

  const payload: {
    previous?: ManualChapterNavigationPayloadRule;
    next?: ManualChapterNavigationPayloadRule;
  } = {};

  if (ruleSet.previous !== null) {
    payload.previous = toPayloadRule(ruleSet.previous);
  }
  if (ruleSet.next !== null) {
    payload.next = toPayloadRule(ruleSet.next);
  }

  return payload.previous === undefined && payload.next === undefined ? undefined : payload;
}

export function manualChapterRuleIsVerified(rule: ManualChapterNavigationRule | null): boolean {
  return rule !== null && rule.verifiedAt !== null && rule.lastFailedAt === null;
}

function toPayloadRule(rule: ManualChapterNavigationRule): ManualChapterNavigationPayloadRule {
  return {
    selectorMode: rule.selectorMode,
    selector: rule.selector,
    disambiguation: rule.disambiguation,
  };
}

function specificity(ruleSet: ManualChapterNavigationRuleSet): number {
  return ruleSet.scope.pathPrefix?.length ?? 0;
}
