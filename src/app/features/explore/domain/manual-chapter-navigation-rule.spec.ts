import {
  ManualChapterNavigationRuleSet,
  mostSpecificRuleSetForUrl,
  ruleSetAppliesToUrl,
  scopeForUrl,
  scopeKey,
  toManualChapterNavigationPayload,
} from './manual-chapter-navigation-rule';

function ruleSet(
  id: string,
  options: Partial<ManualChapterNavigationRuleSet> = {},
): ManualChapterNavigationRuleSet {
  return {
    id,
    scope: { host: 'example.com', pathPrefix: null },
    enabled: true,
    previous: null,
    next: null,
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    ...options,
  };
}

describe('Manual Chapter Navigation Rule domain', () => {
  it('normalizes scope hosts and optional path prefixes', () => {
    expect(scopeForUrl('https://Example.com/story/1', '').host).toBe('example.com');
    expect(scopeKey(scopeForUrl('https://example.com/story/1', null))).toBe('example.com');
    expect(scopeKey(scopeForUrl('https://example.com/story/1', '/story/'))).toBe(
      'example.com/story/',
    );
  });

  it('matches enabled host and path-prefix scopes', () => {
    expect(
      ruleSetAppliesToUrl(
        ruleSet('host', { enabled: false, scope: { host: 'example.com', pathPrefix: null } }),
        'https://example.com/story/1',
      ),
    ).toBeFalse();
    expect(
      ruleSetAppliesToUrl(
        ruleSet('story', { scope: { host: 'example.com', pathPrefix: '/story/' } }),
        'https://example.com/story/1',
      ),
    ).toBeTrue();
    expect(
      ruleSetAppliesToUrl(
        ruleSet('other', { scope: { host: 'example.com', pathPrefix: '/other/' } }),
        'https://example.com/story/1',
      ),
    ).toBeFalse();
    expect(
      ruleSetAppliesToUrl(
        ruleSet('host', { scope: { host: 'elsewhere.example', pathPrefix: null } }),
        'https://example.com/story/1',
      ),
    ).toBeFalse();
    expect(ruleSetAppliesToUrl(ruleSet('host'), 'not a url')).toBeFalse();
  });

  it('ignores disabled rules and selects the longest matching path prefix', () => {
    const selected = mostSpecificRuleSetForUrl(
      [
        ruleSet('host'),
        ruleSet('disabled', {
          enabled: false,
          scope: { host: 'example.com', pathPrefix: '/story/' },
        }),
        ruleSet('specific', {
          scope: { host: 'example.com', pathPrefix: '/story/arc/' },
        }),
      ],
      'https://example.com/story/arc/chapter-1',
    );

    expect(selected?.id).toBe('specific');
  });

  it('serializes only enabled direction rules into extraction payloads', () => {
    const payload = toManualChapterNavigationPayload(
      ruleSet('host', {
        next: {
          direction: 'next',
          selectorMode: 'link',
          selector: 'a.next',
          disambiguation: null,
          sampleLabel: 'Next',
          sampleHref: '/next',
          verifiedAt: '2026-08-02T00:00:00.000Z',
          lastFailedAt: null,
          failureReason: null,
        },
      }),
    );

    expect(payload).toEqual({
      next: {
        selectorMode: 'link',
        selector: 'a.next',
        disambiguation: null,
      },
    });
    expect(toManualChapterNavigationPayload(ruleSet('empty'))).toBeUndefined();
  });
});
