import { TestBed } from '@angular/core/testing';
import { ManualChapterNavigationRuleWorkflow } from '../features/explore/application/manual-chapter-navigation-rule-workflow';
import { ManualChapterNavigationRuleSet } from '../features/explore/domain/manual-chapter-navigation-rule';
import { ManualChapterNavigationManagementAdapter } from './manual-chapter-navigation-management.adapter';

class FakeManualChapterNavigationRuleWorkflow {
  public ruleSets: readonly ManualChapterNavigationRuleSet[] = [];
  public enabledCall: { readonly id: string; readonly enabled: boolean } | null = null;
  public deletedId: string | null = null;

  public listRuleSets(): Promise<readonly ManualChapterNavigationRuleSet[]> {
    return Promise.resolve(this.ruleSets);
  }

  public setEnabled(id: string, enabled: boolean): Promise<{ readonly ok: true }> {
    this.enabledCall = { id, enabled };
    return Promise.resolve({ ok: true });
  }

  public deleteRuleSet(id: string): Promise<{ readonly ok: true }> {
    this.deletedId = id;
    return Promise.resolve({ ok: true });
  }
}

describe('ManualChapterNavigationManagementAdapter', () => {
  let workflow: FakeManualChapterNavigationRuleWorkflow;
  let adapter: ManualChapterNavigationManagementAdapter;

  beforeEach(() => {
    workflow = new FakeManualChapterNavigationRuleWorkflow();
    TestBed.configureTestingModule({
      providers: [
        ManualChapterNavigationManagementAdapter,
        { provide: ManualChapterNavigationRuleWorkflow, useValue: workflow },
      ],
    });

    adapter = TestBed.inject(ManualChapterNavigationManagementAdapter);
  });

  it('maps Explore rule sets to More management items', async () => {
    workflow.ruleSets = [
      ruleSet({
        previous: rule('previous', {
          sampleLabel: 'Prev',
          verifiedAt: null,
        }),
        next: rule('next', {
          sampleHref: 'https://example.com/story/2',
          lastFailedAt: '2026-08-03T00:00:00.000Z',
        }),
      }),
      ruleSet({
        id: 'rules-empty',
        previous: rule('previous'),
        next: null,
      }),
    ];

    await expectAsync(adapter.list()).toBeResolvedTo([
      {
        id: 'rules-1',
        host: 'example.com',
        pathPrefix: '/story/',
        enabled: true,
        previousLabel: 'Prev',
        nextLabel: 'https://example.com/story/2',
        unverified: true,
        lastFailed: true,
      },
      {
        id: 'rules-empty',
        host: 'example.com',
        pathPrefix: '/story/',
        enabled: true,
        previousLabel: null,
        nextLabel: null,
        unverified: false,
        lastFailed: false,
      },
    ]);
  });

  it('delegates enablement and deletion to Explore workflow', async () => {
    await adapter.setEnabled('rules-1', false);
    await adapter.delete('rules-1');

    expect(workflow.enabledCall).toEqual({ id: 'rules-1', enabled: false });
    expect(workflow.deletedId).toBe('rules-1');
  });
});

function ruleSet(
  options: Partial<ManualChapterNavigationRuleSet> = {},
): ManualChapterNavigationRuleSet {
  return {
    id: 'rules-1',
    scope: { host: 'example.com', pathPrefix: '/story/' },
    enabled: true,
    previous: null,
    next: null,
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    ...options,
  };
}

function rule(
  direction: 'previous' | 'next',
  options: {
    readonly sampleLabel?: string | null;
    readonly sampleHref?: string | null;
    readonly verifiedAt?: string | null;
    readonly lastFailedAt?: string | null;
  } = {},
) {
  return {
    direction,
    selectorMode: 'link' as const,
    selector: `a.${direction}`,
    disambiguation: null,
    sampleLabel: options.sampleLabel ?? null,
    sampleHref: options.sampleHref ?? null,
    verifiedAt: options.verifiedAt ?? '2026-08-02T00:00:00.000Z',
    lastFailedAt: options.lastFailedAt ?? null,
    failureReason: null,
  };
}
