interface BukuExploreWindow extends Window {
  readonly BukuExplore: {
    findChapterLink(direction: 'previous' | 'next'): { href: string; label: string | null } | null;
    extractArticle(): {
      readonly status: 'ok' | 'unavailable' | 'failed';
      readonly article?: {
        readonly title: string;
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
          return {
            title: 'Readable article',
            byline: null,
            siteName: null,
            excerpt: null,
            publishedTime: null,
            content: '<p>Readable body.</p>',
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
});
