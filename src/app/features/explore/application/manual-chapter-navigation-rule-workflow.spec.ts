import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import {
  BrowserViewportEvent,
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
import { ManualChapterNavigationRuleSet } from '../domain/manual-chapter-navigation-rule';
import {
  ManualChapterNavigationRuleWorkflow,
  ManualChapterRuleDraft,
} from './manual-chapter-navigation-rule-workflow';

class FakeManualChapterNavigationRuleRepository implements ManualChapterNavigationRuleRepositoryPort {
  public ruleSets: ManualChapterNavigationRuleSet[] = [];
  public saveResult: ManualChapterNavigationRepositoryResult = { ok: true };
  public deleteResult: ManualChapterNavigationRepositoryResult = { ok: true };
  public saved: ManualChapterNavigationRuleSet | null = null;
  public deletedId: string | null = null;

  public list(): Promise<readonly ManualChapterNavigationRuleSet[]> {
    return Promise.resolve(this.ruleSets);
  }

  public save(
    ruleSet: ManualChapterNavigationRuleSet,
  ): Promise<ManualChapterNavigationRepositoryResult> {
    this.saved = ruleSet;
    return Promise.resolve(this.saveResult);
  }

  public delete(id: string): Promise<ManualChapterNavigationRepositoryResult> {
    this.deletedId = id;
    return Promise.resolve(this.deleteResult);
  }
}

class FakeBrowserViewport implements BrowserViewportPort {
  public readonly events$ = new Subject<BrowserViewportEvent>();
  public previewResult: BrowserViewportSelectorPreview = {
    ok: true,
    matches: [{ href: 'https://example.com/story/2', label: 'Next' }],
    selected: { href: 'https://example.com/story/2', label: 'Next' },
    automatic: null,
  };
  public previewInput: ManualChapterNavigationPreviewInput | null = null;

  public show(): Promise<void> {
    return Promise.resolve();
  }

  public hide(): Promise<void> {
    return Promise.resolve();
  }

  public destroy(): Promise<void> {
    return Promise.resolve();
  }

  public load(): Promise<void> {
    return Promise.resolve();
  }

  public stop(): Promise<void> {
    return Promise.resolve();
  }

  public reload(): Promise<void> {
    return Promise.resolve();
  }

  public back(): Promise<{ readonly didNavigate: boolean }> {
    return Promise.resolve({ didNavigate: false });
  }

  public forward(): Promise<void> {
    return Promise.resolve();
  }

  public copyUrl(): Promise<void> {
    return Promise.resolve();
  }

  public extractArticle(): Promise<{ readonly status: 'unavailable' }> {
    return Promise.resolve({ status: 'unavailable' });
  }

  public previewManualChapterNavigation(
    input: ManualChapterNavigationPreviewInput,
  ): Promise<BrowserViewportSelectorPreview> {
    this.previewInput = input;
    return Promise.resolve(this.previewResult);
  }
}

describe('ManualChapterNavigationRuleWorkflow', () => {
  let repository: FakeManualChapterNavigationRuleRepository;
  let viewport: FakeBrowserViewport;
  let workflow: ManualChapterNavigationRuleWorkflow;

  beforeEach(() => {
    repository = new FakeManualChapterNavigationRuleRepository();
    viewport = new FakeBrowserViewport();
    spyOn(globalThis.crypto, 'randomUUID').and.returnValue('00000000-0000-4000-8000-000000000001');

    TestBed.configureTestingModule({
      providers: [
        ManualChapterNavigationRuleWorkflow,
        { provide: MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY, useValue: repository },
        { provide: BROWSER_VIEWPORT, useValue: viewport },
      ],
    });

    workflow = TestBed.inject(ManualChapterNavigationRuleWorkflow);
  });

  it('lists rule sets and returns the most specific payload for a URL', async () => {
    repository.ruleSets = [
      ruleSet('host', {
        scope: { host: 'example.com', pathPrefix: null },
        next: rule('next', 'a.host-next'),
      }),
      ruleSet('story', {
        scope: { host: 'example.com', pathPrefix: '/story/' },
        previous: rule('previous', 'a.story-prev'),
      }),
    ];

    await expectAsync(workflow.listRuleSets()).toBeResolvedTo(repository.ruleSets);
    await expectAsync(
      workflow.selectedPayloadForUrl('https://example.com/story/chapter-2'),
    ).toBeResolvedTo({
      previous: {
        selectorMode: 'link',
        selector: 'a.story-prev',
        disambiguation: null,
      },
    });
  });

  it('reports unavailable preview when no browser viewport is provided', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ManualChapterNavigationRuleWorkflow,
        { provide: MANUAL_CHAPTER_NAVIGATION_RULE_REPOSITORY, useValue: repository },
      ],
    });

    await expectAsync(
      TestBed.inject(ManualChapterNavigationRuleWorkflow).previewCurrentPage({
        direction: 'next',
        selectorMode: 'link',
        selector: 'a.next',
        selectedHref: null,
      }),
    ).toBeResolvedTo({
      ok: false,
      reason: 'browserUnavailable',
      matches: [],
      automatic: null,
    });
  });

  it('saves a verified rule from the live preview for the selected link', async () => {
    const result = await workflow.saveFromLivePreview(draft(), {
      pageUrl: 'https://example.com/story/1',
      href: 'https://example.com/story/2',
      text: 'Next',
      attributes: [],
      ancestors: [],
    });

    expect(result.ok).toBeTrue();
    expect(repository.saved).toEqual(
      jasmine.objectContaining({
        id: '00000000-0000-4000-8000-000000000001',
        scope: { host: 'example.com', pathPrefix: '/story/' },
        enabled: true,
        next: jasmine.objectContaining({
          selector: 'a.next',
          sampleHref: 'https://example.com/story/2',
          sampleLabel: 'Next',
          disambiguation: null,
          lastFailedAt: null,
        }),
        previous: null,
      }),
    );
  });

  it('stores no disambiguation when the preview has multiple matches', async () => {
    viewport.previewResult = {
      ok: true,
      matches: [
        { href: 'https://example.com/story/2', label: 'Next' },
        { href: 'https://example.com/story/3', label: 'Later' },
      ],
      selected: { href: 'https://example.com/story/2', label: 'Next' },
      automatic: null,
    };

    await workflow.saveFromLivePreview(draft(), null);

    expect(repository.saved?.next?.disambiguation).toBeNull();
  });

  it('accepts a relative first preview match for an absolute long-pressed source link', async () => {
    viewport.previewResult = {
      ok: true,
      matches: [
        { href: '/story/2', label: 'Top next' },
        { href: '/story/2', label: 'Bottom next' },
      ],
      selected: { href: '/story/2', label: 'Top next' },
      automatic: null,
    };

    await expectAsync(
      workflow.saveFromLivePreview(draft(), {
        pageUrl: 'https://example.com/story/1',
        href: 'https://example.com/story/2',
        text: 'Bottom next',
        attributes: [],
        ancestors: [],
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ ok: true }));

    expect(repository.saved?.next?.sampleHref).toBe('/story/2');
  });

  it('falls back to raw href comparison when preview href normalization fails', async () => {
    viewport.previewResult = {
      ok: true,
      matches: [{ href: 'http://[', label: 'Next' }],
      selected: { href: 'http://[', label: 'Next' },
      automatic: null,
    };

    await expectAsync(
      workflow.saveFromLivePreview(
        { ...draft(), selectedHref: 'http://[' },
        {
          pageUrl: 'https://example.com/story/1',
          href: 'http://[',
          text: 'Next',
          attributes: [],
          ancestors: [],
        },
      ),
    ).toBeResolvedTo(jasmine.objectContaining({ ok: true }));
  });

  it('keeps an existing scope and preserves the opposite direction when saving', async () => {
    repository.ruleSets = [
      ruleSet('existing', {
        previous: rule('previous', 'a.prev'),
        enabled: false,
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
    ];

    await workflow.saveFromLivePreview(draft(), null);

    expect(repository.saved?.id).toBe('existing');
    expect(repository.saved?.enabled).toBeFalse();
    expect(repository.saved?.previous?.selector).toBe('a.prev');
    expect(repository.saved?.next?.selector).toBe('a.next');
    expect(repository.saved?.createdAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('rejects failed previews and selected-link mismatches', async () => {
    viewport.previewResult = {
      ok: false,
      reason: 'invalidSelector',
      matches: [],
      automatic: null,
    };
    await expectAsync(workflow.saveFromLivePreview(draft(), null)).toBeResolvedTo({
      ok: false,
      reason: 'invalidSelector',
    });

    viewport.previewResult = {
      ok: true,
      matches: [{ href: 'https://example.com/story/3', label: 'Later' }],
      selected: null,
      automatic: null,
    };
    await expectAsync(
      workflow.saveFromLivePreview(draft(), {
        pageUrl: 'https://example.com/story/1',
        href: 'https://example.com/story/2',
        text: 'Next',
        attributes: [],
        ancestors: [],
      }),
    ).toBeResolvedTo({ ok: false, reason: 'mismatchedSelection' });

    viewport.previewResult = {
      ok: true,
      matches: [],
      selected: null,
      automatic: null,
    };
    await expectAsync(workflow.saveFromLivePreview(draft(), null)).toBeResolvedTo({
      ok: false,
      reason: 'noMatch',
    });

    viewport.previewResult = {
      ok: false,
      reason: 'tooManyMatches',
      matches: [],
      automatic: null,
    };
    await expectAsync(workflow.saveFromLivePreview(draft(), null)).toBeResolvedTo({
      ok: false,
      reason: 'noMatch',
    });
  });

  it('maps repository failures and exposes update, enable, disable, and delete operations', async () => {
    repository.saveResult = { ok: false, reason: 'duplicateScope' };
    await expectAsync(workflow.saveFromLivePreview(draft(), null)).toBeResolvedTo({
      ok: false,
      reason: 'duplicateScope',
    });

    repository.saveResult = { ok: false, reason: 'persistenceFailed' };
    await expectAsync(workflow.saveFromLivePreview(draft(), null)).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
    await expectAsync(workflow.updateRuleSet(ruleSet('existing'))).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });

    repository.ruleSets = [ruleSet('existing')];
    repository.saveResult = { ok: true };
    await expectAsync(workflow.setEnabled('existing', false)).toBeResolvedTo({ ok: true });
    expect(repository.saved?.enabled).toBeFalse();
    await expectAsync(workflow.setEnabled('missing', true)).toBeResolvedTo({
      ok: false,
      reason: 'notFound',
    });
    await expectAsync(workflow.deleteRuleSet('existing')).toBeResolvedTo({ ok: true });
    expect(repository.deletedId).toBe('existing');
  });

  it('supports previous-rule drafts and optional selected/source href validation', async () => {
    viewport.previewResult = {
      ok: true,
      matches: [{ href: 'https://example.com/story/0', label: 'Previous' }],
      selected: { href: 'https://example.com/story/0', label: 'Previous' },
      automatic: null,
    };

    await expectAsync(
      workflow.saveFromLivePreview(
        draft({
          direction: 'previous',
          selector: 'a.prev',
          selectedHref: null,
        }),
        {
          pageUrl: 'https://example.com/story/1',
          href: 'https://example.com/story/0',
          text: 'Previous',
          attributes: [],
          ancestors: [],
        },
      ),
    ).toBeResolvedTo(jasmine.objectContaining({ ok: true }));
    expect(repository.saved?.previous?.selector).toBe('a.prev');
    expect(repository.saved?.next).toBeNull();

    repository.ruleSets = [
      ruleSet('existing', {
        next: rule('next', 'a.next-existing'),
      }),
    ];
    await workflow.saveFromLivePreview(
      draft({
        direction: 'previous',
        selector: 'a.prev',
        selectedHref: null,
      }),
      null,
    );

    expect(repository.saved?.previous?.selector).toBe('a.prev');
    expect(repository.saved?.next?.selector).toBe('a.next-existing');
  });

  it('treats a malformed single-match preview as no match', async () => {
    const sparseMatches = new Array(1) as BrowserViewportSelectorPreview extends {
      readonly ok: true;
      readonly matches: infer Matches;
    }
      ? Matches
      : never;
    viewport.previewResult = {
      ok: true,
      matches: sparseMatches,
      selected: null,
      automatic: null,
    };

    await expectAsync(workflow.saveFromLivePreview(draft(), null)).toBeResolvedTo({
      ok: false,
      reason: 'noMatch',
    });
  });
});

function draft(options: Partial<ManualChapterRuleDraft> = {}): ManualChapterRuleDraft {
  return {
    sourceUrl: 'https://example.com/story/1',
    direction: 'next',
    scopePathPrefix: '/story/',
    selectorMode: 'link',
    selector: 'a.next',
    selectedHref: 'https://example.com/story/2',
    ...options,
  };
}

function ruleSet(
  id: string,
  options: Partial<ManualChapterNavigationRuleSet> = {},
): ManualChapterNavigationRuleSet {
  return {
    id,
    scope: { host: 'example.com', pathPrefix: '/story/' },
    enabled: true,
    previous: null,
    next: null,
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    ...options,
  };
}

function rule(direction: 'previous' | 'next', selector: string) {
  return {
    direction,
    selectorMode: 'link' as const,
    selector,
    disambiguation: null,
    sampleLabel: direction,
    sampleHref: `https://example.com/${direction}`,
    verifiedAt: '2026-08-02T00:00:00.000Z',
    lastFailedAt: null,
    failureReason: null,
  };
}
