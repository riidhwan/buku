import { signal } from '@angular/core';
import type { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import type { ReadingChapterDirection } from '../../../application/explore-browser-reading-mode-policy';
import type {
  BrowserSourceLinkAncestor,
  BrowserSourceLinkContext,
  BrowserViewportSelectorPreview,
  ManualChapterNavigationPreviewInput,
} from '../../../application/ports/browser-viewport.port';
import type { ManualChapterSelectorMode } from '../../../domain/manual-chapter-navigation-rule';

export interface ManualRuleSelectorCandidate {
  readonly label: string;
  readonly selector: string;
}

export class ExploreBrowserManualRuleActions {
  public readonly direction = signal<ReadingChapterDirection>('next');
  public readonly selectorMode = signal<ManualChapterSelectorMode>('link');
  public readonly selector = signal('');
  public readonly scopePathPrefix = signal<string | null>(null);
  public readonly preview = signal<BrowserViewportSelectorPreview | null>(null);
  public readonly saveError = signal<string | null>(null);

  public constructor(private readonly browser: ExploreBrowserFacade) {}

  public updateDirection(value: string | number | null | undefined): void {
    if (value === 'previous' || value === 'next') {
      this.direction.set(value);
      this.preview.set(null);
    }
  }

  public updateSelectorMode(value: string | number | null | undefined): void {
    if (value === 'link' || value === 'container') {
      this.selectorMode.set(value);
      this.preview.set(null);
    }
  }

  public updateSelector(value: string | null | undefined): void {
    this.selector.set(value ?? '');
    this.preview.set(null);
    this.saveError.set(null);
  }

  public useSelectorCandidate(selector: string): void {
    this.updateSelector(selector);
  }

  public updateScopePathPrefix(value: string | null | undefined): void {
    const trimmed = value?.trim() ?? '';
    this.scopePathPrefix.set(trimmed === '' ? null : trimmed);
  }

  public async previewRule(): Promise<void> {
    this.saveError.set(null);
    this.preview.set(await this.browser.previewManualChapterNavigation(this.previewInput()));
  }

  public async saveRule(): Promise<void> {
    const sourceLink = this.browser.sourceLinkLongPress();
    if (sourceLink === null) {
      return;
    }

    const result = await this.browser.saveManualChapterNavigationRule({
      sourceUrl: sourceLink.pageUrl,
      direction: this.direction(),
      scopePathPrefix: this.scopePathPrefix(),
      selectorMode: this.selectorMode(),
      selector: this.selector(),
      selectedHref: sourceLink.href,
    });
    if (!result.ok) {
      this.saveError.set(this.saveFailureMessage(result.reason));
      return;
    }

    this.preview.set(null);
    this.saveError.set(null);
    this.browser.dismissSourceLinkLongPress();
  }

  public closeEditor(): void {
    this.browser.dismissSourceLinkLongPress();
    this.preview.set(null);
    this.saveError.set(null);
  }

  public ancestorSummary(ancestor: BrowserSourceLinkAncestor): string {
    return `${ancestor.tagName.toLowerCase()}${ancestor.id === null ? '' : `#${ancestor.id}`}${
      ancestor.className === null ? '' : `.${ancestor.className}`
    }`;
  }

  public linkElementSummary(sourceLink: BrowserSourceLinkContext): string {
    const attributes = sourceLink.attributes
      .filter((attribute) =>
        ['id', 'class', 'rel', 'title', 'aria-label', 'href'].includes(attribute.name),
      )
      .map((attribute) => `${attribute.name}="${this.htmlAttribute(attribute.value)}"`)
      .join(' ');
    const text = sourceLink.text === null ? '' : this.clipped(sourceLink.text, 80);
    return `<a${attributes === '' ? '' : ` ${attributes}`}>${text}</a>`;
  }

  public ancestorElementSummary(ancestor: BrowserSourceLinkAncestor): string {
    const attributeEntries: readonly (readonly [string, string | null])[] = [
      ['id', ancestor.id],
      ['class', ancestor.className],
      ['role', ancestor.role],
      ['aria-label', ancestor.ariaLabel],
    ];
    const attributes = attributeEntries
      .filter((attribute): attribute is readonly [string, string] => attribute[1] !== null)
      .map(([name, value]) => `${name}="${this.htmlAttribute(value)}"`)
      .join(' ');

    return `<${ancestor.tagName.toLowerCase()}${attributes === '' ? '' : ` ${attributes}`}>`;
  }

  public selectorCandidates(
    sourceLink: BrowserSourceLinkContext,
  ): readonly ManualRuleSelectorCandidate[] {
    const candidates: ManualRuleSelectorCandidate[] = [];
    this.addCandidate(candidates, 'Link href', this.hrefSuffixSelector(sourceLink.href));
    this.addCandidate(candidates, 'Link id', this.linkIdSelector(sourceLink));
    this.addCandidate(candidates, 'Link class', this.linkClassSelector(sourceLink));
    this.addCandidate(candidates, 'Link rel', this.attributeTokenSelector(sourceLink, 'rel'));
    this.addCandidate(
      candidates,
      'Link label',
      this.attributeExactSelector(sourceLink, 'aria-label'),
    );
    this.addCandidate(candidates, 'Link title', this.attributeExactSelector(sourceLink, 'title'));

    for (const ancestor of sourceLink.ancestors.slice(0, 3)) {
      this.addCandidate(
        candidates,
        `${ancestor.tagName.toLowerCase()} context`,
        this.ancestorSelector(ancestor),
      );
    }

    return candidates;
  }

  private previewInput(): ManualChapterNavigationPreviewInput {
    return {
      direction: this.direction(),
      selectorMode: this.selectorMode(),
      selector: this.selector(),
      selectedHref: this.browser.sourceLinkLongPress()?.href ?? null,
    };
  }

  private saveFailureMessage(reason: string): string {
    switch (reason) {
      case 'invalidSelector':
        return 'Selector is not valid CSS.';
      case 'mismatchedSelection':
        return 'Selector does not resolve to the selected link.';
      case 'duplicateScope':
        return 'A rule set already exists for this scope.';
      case 'noMatch':
        return 'Selector did not match the selected link.';
      default:
        return 'Rule could not be saved.';
    }
  }

  private addCandidate(
    candidates: ManualRuleSelectorCandidate[],
    label: string,
    selector: string | null,
  ): void {
    if (selector === null || candidates.some((candidate) => candidate.selector === selector)) {
      return;
    }

    candidates.push({ label, selector });
  }

  private linkIdSelector(sourceLink: BrowserSourceLinkContext): string | null {
    const id = this.sourceLinkAttribute(sourceLink, 'id');
    return id === null ? null : `a#${this.cssIdentifier(id)}[href]`;
  }

  private linkClassSelector(sourceLink: BrowserSourceLinkContext): string | null {
    const classSelector = this.classSelector(this.sourceLinkAttribute(sourceLink, 'class'));
    return classSelector === null ? null : `a${classSelector}[href]`;
  }

  private attributeTokenSelector(
    sourceLink: BrowserSourceLinkContext,
    attributeName: string,
  ): string | null {
    const token = this.sourceLinkAttribute(sourceLink, attributeName)?.split(/\s+/)[0] ?? null;
    return token === null || token === ''
      ? null
      : `a[${attributeName}~="${this.cssString(token)}"]`;
  }

  private attributeExactSelector(
    sourceLink: BrowserSourceLinkContext,
    attributeName: string,
  ): string | null {
    const value = this.sourceLinkAttribute(sourceLink, attributeName);
    return value === null ? null : `a[${attributeName}="${this.cssString(value)}"]`;
  }

  private hrefSuffixSelector(href: string): string | null {
    try {
      const url = new URL(href);
      const suffix = `${url.pathname}${url.search}`;
      return suffix === '' || suffix === '/' ? null : `a[href$="${this.cssString(suffix)}"]`;
    } catch (_error) {
      return null;
    }
  }

  private ancestorSelector(ancestor: BrowserSourceLinkAncestor): string | null {
    if (ancestor.id !== null) {
      return `${ancestor.tagName.toLowerCase()}#${this.cssIdentifier(ancestor.id)} a[href]`;
    }

    const classSelector = this.classSelector(ancestor.className);
    if (classSelector !== null) {
      return `${ancestor.tagName.toLowerCase()}${classSelector} a[href]`;
    }

    return ancestor.role === null
      ? null
      : `${ancestor.tagName.toLowerCase()}[role="${this.cssString(ancestor.role)}"] a[href]`;
  }

  private classSelector(className: string | null): string | null {
    const classes = className?.split(/\s+/).filter(Boolean).slice(0, 2) ?? [];
    return classes.length === 0
      ? null
      : classes.map((classToken) => `.${this.cssIdentifier(classToken)}`).join('');
  }

  private sourceLinkAttribute(sourceLink: BrowserSourceLinkContext, name: string): string | null {
    return sourceLink.attributes.find((attribute) => attribute.name === name)?.value ?? null;
  }

  private htmlAttribute(value: string): string {
    return this.clipped(value, 160).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  private cssString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private cssIdentifier(value: string): string {
    return value.replace(/^-?\d|[^a-zA-Z0-9_-]/g, (character) => {
      const hex = character.charCodeAt(0).toString(16);
      return `\\${hex} `;
    });
  }

  private clipped(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }
}
