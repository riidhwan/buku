interface BukuExploreWindow extends Window {
  readonly BukuExplore: {
    findChapterLink(direction: 'previous' | 'next'): { href: string; label: string | null } | null;
    findChapterLinkWithManual(
      direction: 'previous' | 'next',
      manualChapterNavigation: {
        readonly previous?: {
          readonly selectorMode: 'link' | 'container';
          readonly selector: string;
          readonly disambiguation: { readonly href: string; readonly label: string | null } | null;
        };
        readonly next?: {
          readonly selectorMode: 'link' | 'container';
          readonly selector: string;
          readonly disambiguation: { readonly href: string; readonly label: string | null } | null;
        };
      },
    ): { href: string; label: string | null } | null;
    previewManualChapterNavigation(input: {
      readonly direction: 'previous' | 'next';
      readonly selectorMode: 'link' | 'container';
      readonly selector: string;
      readonly selectedHref: string | null;
    }): {
      readonly ok: boolean;
      readonly reason?: string;
      readonly matches: readonly { readonly href: string; readonly label: string | null }[];
      readonly selected?: { readonly href: string; readonly label: string | null } | null;
      readonly automatic: { readonly href: string; readonly label: string | null } | null;
    };
    extractArticle(options?: {
      readonly manualChapterNavigation?: {
        readonly next?: {
          readonly selectorMode: 'link' | 'container';
          readonly selector: string;
          readonly disambiguation: { readonly href: string; readonly label: string | null } | null;
        };
      };
    }): {
      readonly status: 'ok' | 'unavailable' | 'failed';
      readonly article?: {
        readonly title: string;
        readonly contentHtml: string;
        readonly textContent: string;
        readonly length: number;
        readonly previousChapter?: { readonly href: string; readonly label: string | null };
        readonly nextChapter?: { readonly href: string; readonly label: string | null };
      };
    };
  };
}

interface ReadabilityWindow extends Window {
  Readability: new (document: Document) => {
    parse(): {
      title: string;
      byline: string | null;
      siteName: string | null;
      excerpt: string | null;
      publishedTime: string | null;
      content: string;
      textContent: string;
      length: number;
    } | null;
  };
}

describe('Explore injected scripts', () => {
  async function loadScript(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Script fixture could not be loaded: ${path}`);
    }

    return response.text();
  }

  async function withScriptWindow<T>(
    bodyHtml: string,
    callback: (scriptWindow: BukuExploreWindow & ReadabilityWindow) => T,
    options: { readonly readableContentHtml?: string } = {},
  ): Promise<T> {
    const [chapterNavigationScript, articleExtractionScript] = await Promise.all([
      loadScript('assets/explore/chapter-navigation.js'),
      loadScript('assets/explore/article-extraction.js'),
    ]);
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    await new Promise<void>((resolve) => {
      frame.addEventListener(
        'load',
        () => {
          resolve();
        },
        { once: true },
      );
      frame.src = '/assets/explore/chapter-navigation.js';
    });

    const frameDocument = frame.contentDocument;
    const scriptWindow = frame.contentWindow as BukuExploreWindow & ReadabilityWindow;

    if (frameDocument === null) {
      document.body.removeChild(frame);
      throw new Error('Script test frame could not be created.');
    }

    frameDocument.body.innerHTML = bodyHtml;

    try {
      appendScript(frameDocument, chapterNavigationScript);
      scriptWindow.Readability = class {
        public constructor(private readonly readableDocument: Document) {}

        public parse() {
          const textContent = this.readableDocument.body.textContent;
          const content = options.readableContentHtml ?? '<p>Readable body.</p>';
          return {
            title: 'Readable article',
            byline: null,
            siteName: null,
            excerpt: null,
            publishedTime: null,
            content,
            textContent,
            length: textContent.length,
          };
        }
      };
      appendScript(frameDocument, articleExtractionScript);
      return callback(scriptWindow);
    } finally {
      document.body.removeChild(frame);
    }
  }

  function appendScript(frameDocument: Document, source: string): void {
    const script = frameDocument.createElement('script');
    script.text = source;
    frameDocument.head.appendChild(script);
  }

  it('detects explicit chapter links before pagination links', async () => {
    const result = await withScriptWindow(
      '<main>' +
        '<a href="/page-2">Next page</a>' +
        '<a href="/chapter-2">Next chapter</a>' +
        '</main>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );

    expect(result).toEqual({ href: '/chapter-2', label: 'Next chapter' });
  });

  it('detects next page labels only inside pagination context', async () => {
    const outsidePagination = await withScriptWindow(
      '<main><a href="/page-2">Next page</a></main>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );
    const insidePagination = await withScriptWindow(
      '<nav aria-label="Pagination"><a href="/page-2">Next page</a></nav>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );

    expect(outsidePagination).toBeNull();
    expect(insidePagination).toEqual({ href: '/page-2', label: 'Next page' });
  });

  it('keeps bare next labels scoped to navigation context', async () => {
    const outsideNavigation = await withScriptWindow(
      '<main><a href="/chapter-2">Next</a></main>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );
    const insideNavigation = await withScriptWindow(
      '<nav><a href="/chapter-2">Next</a></nav>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );

    expect(outsideNavigation).toBeNull();
    expect(insideNavigation).toEqual({ href: '/chapter-2', label: 'Next' });
  });

  it('detects WordPress post navigation when the direction label is outside the chapter link', async () => {
    const result = await withScriptWindow(
      '<article>' +
        '<p>' +
        '<a href="/chapter-1"><strong>Previous</strong></a> | ' +
        '<a href="/toc"><strong>Main</strong></a> | ' +
        '<a href="/chapter-2"><strong>Ne</strong><strong>x</strong><strong>t</strong></a>' +
        '</p>' +
        '</article>' +
        '<div class="post-navigation">' +
        '<div class="post-nav-next"><p>Next</p><h4><a href="/chapter-2">WM V1C0002</a></h4></div>' +
        '</div>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );

    expect(result).toEqual({ href: '/chapter-2', label: 'WM V1C0002' });
  });

  it('ignores self links and conflicting candidates', async () => {
    const selfLink = await withScriptWindow(
      '<nav><a href="#next">Next chapter</a></nav>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );
    const conflictingLinks = await withScriptWindow(
      '<nav>' +
        '<a href="/chapter-2">Next chapter</a>' +
        '<a href="/chapter-3">Next chapter</a>' +
        '</nav>',
      (scriptWindow) => scriptWindow.BukuExplore.findChapterLink('next'),
    );

    expect(selfLink).toBeNull();
    expect(conflictingLinks).toBeNull();
  });

  it('adds chapter links to extracted article snapshots', async () => {
    const result = await withScriptWindow(
      '<article>Readable body.</article>' +
        '<nav>' +
        '<a href="/chapter-1">Previous chapter</a>' +
        '<a href="/chapter-3">Next chapter</a>' +
        '</nav>',
      (scriptWindow) => scriptWindow.BukuExplore.extractArticle(),
    );

    expect(result).toEqual({
      status: 'ok',
      article: jasmine.objectContaining({
        title: 'Readable article',
        previousChapter: { href: '/chapter-1', label: 'Previous chapter' },
        nextChapter: { href: '/chapter-3', label: 'Next chapter' },
      }),
    });
  });

  it('uses valid manual chapter links before automatic detection', async () => {
    const result = await withScriptWindow(
      '<article>Readable body.</article>' +
        '<nav><a href="/automatic">Next chapter</a></nav>' +
        '<a class="manual-next" href="/manual">Continue</a>',
      (scriptWindow) =>
        scriptWindow.BukuExplore.extractArticle({
          manualChapterNavigation: {
            next: {
              selectorMode: 'link',
              selector: 'a.manual-next',
              disambiguation: null,
            },
          },
        }),
    );

    expect(result.article?.nextChapter).toEqual({ href: '/manual', label: 'Continue' });
  });

  it('falls back to automatic chapter links when a manual selector fails', async () => {
    const result = await withScriptWindow(
      '<article>Readable body.</article><nav><a href="/automatic">Next chapter</a></nav>',
      (scriptWindow) =>
        scriptWindow.BukuExplore.extractArticle({
          manualChapterNavigation: {
            next: {
              selectorMode: 'link',
              selector: 'a.missing-next',
              disambiguation: null,
            },
          },
        }),
    );

    expect(result.article?.nextChapter).toEqual({ href: '/automatic', label: 'Next chapter' });
  });

  it('previews link and container selectors using the first visible match', async () => {
    const container = await withScriptWindow(
      '<div class="chapter-next"><span><a href="/chapter-2">Next</a></span></div>',
      (scriptWindow) =>
        scriptWindow.BukuExplore.previewManualChapterNavigation({
          direction: 'next',
          selectorMode: 'container',
          selector: '.chapter-next',
          selectedHref: null,
        }),
    );
    const multiple = await withScriptWindow(
      '<a class="chapter" href="/chapter-2">Next</a><a class="chapter" href="/chapter-3">Next</a>',
      (scriptWindow) =>
        scriptWindow.BukuExplore.previewManualChapterNavigation({
          direction: 'next',
          selectorMode: 'link',
          selector: 'a.chapter',
          selectedHref: null,
        }),
    );

    expect(container.ok).toBeTrue();
    expect(container.selected).toEqual({ href: '/chapter-2', label: 'Next' });
    expect(multiple).toEqual(
      jasmine.objectContaining({
        ok: true,
        selected: { href: '/chapter-2', label: 'Next' },
      }),
    );
  });

  it('uses the first manual chapter link when a selector matches multiple links', async () => {
    const result = await withScriptWindow(
      '<article>Readable body.</article>' +
        '<a class="manual-next" href="/first">Top next</a>' +
        '<a class="manual-next" href="/second">Bottom next</a>',
      (scriptWindow) =>
        scriptWindow.BukuExplore.extractArticle({
          manualChapterNavigation: {
            next: {
              selectorMode: 'link',
              selector: 'a.manual-next',
              disambiguation: null,
            },
          },
        }),
    );

    expect(result.article?.nextChapter).toEqual({ href: '/first', label: 'Top next' });
  });

  it('reports invalid and over-broad manual selectors without throwing', async () => {
    const invalid = await withScriptWindow('', (scriptWindow) =>
      scriptWindow.BukuExplore.previewManualChapterNavigation({
        direction: 'next',
        selectorMode: 'link',
        selector: 'a[',
        selectedHref: null,
      }),
    );
    const tooMany = await withScriptWindow(
      Array.from({ length: 51 }, (_value, index) => `<a href="/${String(index)}">Next</a>`).join(
        '',
      ),
      (scriptWindow) =>
        scriptWindow.BukuExplore.previewManualChapterNavigation({
          direction: 'next',
          selectorMode: 'link',
          selector: 'a',
          selectedHref: null,
        }),
    );

    expect(invalid.reason).toBe('invalidSelector');
    expect(tooMany.reason).toBe('tooManyMatches');
  });

  it('removes compact trailing chapter navigation from extracted article content', async () => {
    const result = await withScriptWindow(
      '<article>' +
        '<p>His dreams were expanding!</p>' +
        '<p><a href="/chapter-1">Previous</a> | <a href="/toc">Main</a> | <a href="/chapter-3">Ne x t</a></p>' +
        '</article>',
      (scriptWindow) => scriptWindow.BukuExplore.extractArticle(),
      {
        readableContentHtml:
          '<div>' +
          '<p>His dreams were expanding!</p>' +
          '<p><a href="/chapter-1">Previous</a> | <a href="/toc">Main</a> | <a href="/chapter-3">Ne x t</a></p>' +
          '</div>',
      },
    );

    expect(result.article?.contentHtml).toContain('His dreams were expanding!');
    expect(result.article?.contentHtml).not.toContain('Previous');
    expect(result.article?.contentHtml).not.toContain('Main');
    expect(result.article?.contentHtml).not.toContain('Next');
    expect(result.article?.textContent).toBe('His dreams were expanding!');
    expect(result.article?.length).toBe('His dreams were expanding!'.length);
  });

  it('removes trailing post navigation from extracted article content', async () => {
    const result = await withScriptWindow(
      '<article>' +
        '<p>His dreams were expanding!</p>' +
        '<div class="post-navigation">' +
        '<div class="post-nav-prev"><p>Previous</p><h4><a href="/chapter-1">WM Prologue C0000</a></h4></div>' +
        '<div class="post-nav-next"><p>Next</p><h4><a href="/chapter-3">WM V1C0002</a></h4></div>' +
        '</div>' +
        '</article>',
      (scriptWindow) => scriptWindow.BukuExplore.extractArticle(),
      {
        readableContentHtml:
          '<div>' +
          '<p>His dreams were expanding!</p>' +
          '<div class="post-navigation">' +
          '<div class="post-nav-prev"><p>Previous</p><h4><a href="/chapter-1">WM Prologue C0000</a></h4></div>' +
          '<div class="post-nav-next"><p>Next</p><h4><a href="/chapter-3">WM V1C0002</a></h4></div>' +
          '</div>' +
          '</div>',
      },
    );

    expect(result.article?.contentHtml).toContain('His dreams were expanding!');
    expect(result.article?.contentHtml).not.toContain('WM Prologue C0000');
    expect(result.article?.contentHtml).not.toContain('WM V1C0002');
    expect(result.article?.textContent).toBe('His dreams were expanding!');
  });

  it('removes compact chapter navigation even when post content follows it', async () => {
    const result = await withScriptWindow(
      '<article>' +
        '<p>His dreams were expanding!</p>' +
        '<p><a href="/chapter-1">Previous</a> | <a href="/toc">Main</a> | <a href="/chapter-3">Next</a></p>' +
        '<h3>Share this:</h3>' +
        '</article>',
      (scriptWindow) => scriptWindow.BukuExplore.extractArticle(),
      {
        readableContentHtml:
          '<div>' +
          '<p>His dreams were expanding!</p>' +
          '<p><a href="/chapter-1">Previous</a> | <a href="/toc">Main</a> | <a href="/chapter-3">Next</a></p>' +
          '<h3>Share this:</h3>' +
          '</div>',
      },
    );

    expect(result.article?.contentHtml).toContain('His dreams were expanding!');
    expect(result.article?.contentHtml).toContain('Share this:');
    expect(result.article?.contentHtml).not.toContain('Previous');
    expect(result.article?.contentHtml).not.toContain('Main');
    expect(result.article?.contentHtml).not.toContain('Next');
  });
});
