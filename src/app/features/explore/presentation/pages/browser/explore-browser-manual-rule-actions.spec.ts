import { signal } from '@angular/core';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import {
  BrowserSourceLinkContext,
  BrowserViewportSelectorPreview,
} from '../../../application/ports/browser-viewport.port';
import { ExploreBrowserManualRuleActions } from './explore-browser-manual-rule-actions';

class FakeExploreBrowserFacade {
  public readonly sourceLinkLongPress = signal<BrowserSourceLinkContext | null>({
    pageUrl: 'https://example.com/story/1',
    href: 'https://example.com/story/2?view=full',
    text: 'Next',
    attributes: [
      { name: 'id', value: 'next-link' },
      { name: 'class', value: 'chapter next' },
      { name: 'rel', value: 'next nofollow' },
      { name: 'aria-label', value: 'Next chapter' },
      { name: 'title', value: 'Go to next chapter' },
      { name: 'href', value: '/story/2?view=full' },
    ],
    ancestors: [
      {
        tagName: 'NAV',
        id: 'chapters',
        className: 'pager next',
        role: 'navigation',
        ariaLabel: 'Chapter navigation',
      },
    ],
  });
  public previewResult: BrowserViewportSelectorPreview = {
    ok: true,
    matches: [{ href: 'https://example.com/story/2', label: 'Next' }],
    selected: { href: 'https://example.com/story/2', label: 'Next' },
    automatic: null,
  };
  public savedDraft: unknown = null;
  public saveResult: { readonly ok: true } | { readonly ok: false; readonly reason: string } = {
    ok: true,
  };
  public dismissed = false;

  public previewManualChapterNavigation(): Promise<BrowserViewportSelectorPreview> {
    return Promise.resolve(this.previewResult);
  }

  public saveManualChapterNavigationRule(draft: unknown) {
    this.savedDraft = draft;
    return Promise.resolve(this.saveResult);
  }

  public dismissSourceLinkLongPress(): void {
    this.dismissed = true;
  }
}

describe('ExploreBrowserManualRuleActions', () => {
  let facade: FakeExploreBrowserFacade;
  let actions: ExploreBrowserManualRuleActions;

  beforeEach(() => {
    facade = new FakeExploreBrowserFacade();
    actions = new ExploreBrowserManualRuleActions(facade as unknown as ExploreBrowserFacade);
  });

  it('updates editor state and clears stale previews', () => {
    actions.preview.set(facade.previewResult);
    actions.saveError.set('Old error');

    actions.updateDirection('previous');
    actions.updateSelectorMode('container');
    actions.updateSelector('nav a.next');
    actions.updateScopePathPrefix(' /story/ ');
    actions.updateSelector(null);
    actions.updateScopePathPrefix(null);

    expect(actions.direction()).toBe('previous');
    expect(actions.selectorMode()).toBe('container');
    expect(actions.selector()).toBe('');
    expect(actions.scopePathPrefix()).toBeNull();
    expect(actions.preview()).toBeNull();
    expect(actions.saveError()).toBeNull();
  });

  it('ignores invalid direction and selector mode values', () => {
    actions.updateDirection('invalid');
    actions.updateSelectorMode('invalid');

    expect(actions.direction()).toBe('next');
    expect(actions.selectorMode()).toBe('link');
  });

  it('previews and saves the rule for the long-pressed source link', async () => {
    await actions.previewRule();
    expect(actions.preview()).toEqual(facade.previewResult);

    await actions.saveRule();

    expect(facade.savedDraft).toEqual({
      sourceUrl: 'https://example.com/story/1',
      direction: 'next',
      scopePathPrefix: null,
      selectorMode: 'link',
      selector: '',
      selectedHref: 'https://example.com/story/2?view=full',
    });
    expect(actions.preview()).toBeNull();
    expect(actions.saveError()).toBeNull();
    expect(facade.dismissed).toBeTrue();
  });

  it('shows save failures and closes the editor', async () => {
    facade.saveResult = { ok: false, reason: 'invalidSelector' };

    await actions.saveRule();
    expect(actions.saveError()).toBe('Selector is not valid CSS.');

    actions.closeEditor();

    expect(actions.saveError()).toBeNull();
    expect(actions.preview()).toBeNull();
    expect(facade.dismissed).toBeTrue();
  });

  it('formats ancestor summaries and handles missing long-press context', async () => {
    facade.sourceLinkLongPress.set(null);

    await actions.previewRule();
    await actions.saveRule();

    expect(facade.savedDraft).toBeNull();
    expect(actions.preview()).toEqual(facade.previewResult);
    expect(
      actions.ancestorSummary({
        tagName: 'NAV',
        id: 'chapters',
        className: 'pager next',
        role: null,
        ariaLabel: null,
      }),
    ).toBe('nav#chapters.pager next');
    expect(
      actions.ancestorSummary({
        tagName: 'A',
        id: null,
        className: null,
        role: null,
        ariaLabel: null,
      }),
    ).toBe('a');
  });

  it('formats bounded link context and applies selector candidates', () => {
    const sourceLink = facade.sourceLinkLongPress();
    if (sourceLink === null) {
      fail('Expected source link context.');
      return;
    }
    const ancestor = sourceLink.ancestors[0];
    if (ancestor === undefined) {
      fail('Expected ancestor context.');
      return;
    }

    expect(actions.linkElementSummary(sourceLink)).toBe(
      '<a id="next-link" class="chapter next" rel="next nofollow" aria-label="Next chapter" title="Go to next chapter" href="/story/2?view=full">Next</a>',
    );
    expect(actions.ancestorElementSummary(ancestor)).toBe(
      '<nav id="chapters" class="pager next" role="navigation" aria-label="Chapter navigation">',
    );
    expect(actions.selectorCandidates(sourceLink)).toEqual([
      { label: 'Link href', selector: 'a[href$="/story/2?view=full"]' },
      { label: 'Link id', selector: 'a#next-link[href]' },
      { label: 'Link class', selector: 'a.chapter.next[href]' },
      { label: 'Link rel', selector: 'a[rel~="next"]' },
      { label: 'Link label', selector: 'a[aria-label="Next chapter"]' },
      { label: 'Link title', selector: 'a[title="Go to next chapter"]' },
      { label: 'nav context', selector: 'nav#chapters a[href]' },
    ]);

    actions.preview.set(facade.previewResult);
    actions.useSelectorCandidate('nav#chapters a[href]');

    expect(actions.selector()).toBe('nav#chapters a[href]');
    expect(actions.preview()).toBeNull();
  });

  it('escapes selector candidates and handles sparse context', () => {
    const sourceLink: BrowserSourceLinkContext = {
      pageUrl: 'https://example.com/story/1',
      href: 'not a url',
      text: null,
      attributes: [
        { name: 'id', value: '2 next' },
        { name: 'class', value: 'chapter:item next\\link' },
        { name: 'aria-label', value: 'Next "chapter"' },
      ],
      ancestors: [
        {
          tagName: 'DIV',
          id: null,
          className: null,
          role: 'navigation',
          ariaLabel: null,
        },
      ],
    };
    const rootHrefSourceLink: BrowserSourceLinkContext = {
      ...sourceLink,
      href: 'https://example.com/',
      text: 'A'.repeat(81),
      attributes: [],
      ancestors: [
        {
          tagName: 'SECTION',
          id: null,
          className: 'chapter pager',
          role: null,
          ariaLabel: null,
        },
        {
          tagName: 'SPAN',
          id: null,
          className: null,
          role: null,
          ariaLabel: null,
        },
      ],
    };
    const plainAncestor = rootHrefSourceLink.ancestors[1];
    if (plainAncestor === undefined) {
      fail('Expected plain ancestor context.');
      return;
    }

    expect(actions.linkElementSummary(sourceLink)).toBe(
      '<a id="2 next" class="chapter:item next\\link" aria-label="Next &quot;chapter&quot;"></a>',
    );
    expect(actions.selectorCandidates(sourceLink)).toEqual([
      { label: 'Link id', selector: 'a#\\32 \\20 next[href]' },
      { label: 'Link class', selector: 'a.chapter\\3a item.next\\5c link[href]' },
      { label: 'Link label', selector: 'a[aria-label="Next \\"chapter\\""]' },
      { label: 'div context', selector: 'div[role="navigation"] a[href]' },
    ]);
    expect(actions.selectorCandidates(rootHrefSourceLink)).toEqual([
      { label: 'section context', selector: 'section.chapter.pager a[href]' },
    ]);
    expect(actions.linkElementSummary(rootHrefSourceLink)).toBe(`<a>${'A'.repeat(80)}</a>`);
    expect(actions.ancestorElementSummary(plainAncestor)).toBe('<span>');
  });

  it('maps rule save failure reasons to editor messages', async () => {
    for (const [reason, message] of [
      ['mismatchedSelection', 'Selector does not resolve to the selected link.'],
      ['duplicateScope', 'A rule set already exists for this scope.'],
      ['noMatch', 'Selector did not match the selected link.'],
      ['persistenceFailed', 'Rule could not be saved.'],
    ] as const) {
      facade.saveResult = { ok: false, reason };

      await actions.saveRule();

      expect(actions.saveError()).toBe(message);
    }
  });
});
