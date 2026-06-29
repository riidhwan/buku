import { BrowserLibraryContentSanitizerAdapter } from './browser-library-content-sanitizer.adapter';

describe('BrowserLibraryContentSanitizerAdapter', () => {
  it('removes active content, event handlers, and unsafe URLs', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    const result = sanitizer.sanitizeContentHtml(
      '<p onclick="bad()">Text <a href="javascript:bad()">link</a></p><script>bad()</script>',
    );

    expect(result).toEqual({
      contentHtml: '<p>Text <a>link</a></p>',
      hasRenderableContent: true,
    });
  });

  it('removes data HTML URLs', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(
      sanitizer.sanitizeContentHtml('<a href="data:text/html,<script>bad()</script>">x</a>'),
    ).toEqual({
      contentHtml: '<a>x</a>',
      hasRenderableContent: true,
    });
  });

  it('removes unsafe URL schemes from URI attributes', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(
      sanitizer.sanitizeContentHtml(
        '<a href="vbscript:bad()">vb</a><img src="data:image/svg+xml,<svg></svg>">',
      ),
    ).toEqual({
      contentHtml: '<a>vb</a><img>',
      hasRenderableContent: true,
    });
  });

  it('removes obfuscated active URL schemes', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(sanitizer.sanitizeContentHtml('<a href="java&#10;script:bad()">x</a>')).toEqual({
      contentHtml: '<a>x</a>',
      hasRenderableContent: true,
    });
  });

  it('keeps safe absolute and relative URLs', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(
      sanitizer.sanitizeContentHtml(
        '<a href="https://example.test/a,b">web</a><a href="/local">local</a>',
      ),
    ).toEqual({
      contentHtml: '<a href="https://example.test/a,b">web</a><a href="/local">local</a>',
      hasRenderableContent: true,
    });
  });

  it('keeps toolbar-supported formatting elements and normalizes browser tags', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(
      sanitizer.sanitizeContentHtml(
        '<p>Para <b data-kind="important">bold</b> <i>italic</i></p><h2>Major</h2><h3>Minor</h3><ul><li>One</li></ul><ol><li>Two</li></ol>',
      ),
    ).toEqual({
      contentHtml:
        '<p>Para <strong data-kind="important">bold</strong> <em>italic</em></p><h2>Major</h2><h3>Minor</h3><ul><li>One</li></ul><ol><li>Two</li></ol>',
      hasRenderableContent: true,
    });
  });

  it('strips editor-only selection classes and unsafe formatting attributes', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(
      sanitizer.sanitizeContentHtml(
        '<p class="library-entry-edit-media-selected kept" style="color:red" onclick="bad()">Text</p><img class="library-entry-edit-media-selected" src="https://example.test/a.jpg">',
      ),
    ).toEqual({
      contentHtml: '<p class="kept">Text</p><img src="https://example.test/a.jpg">',
      hasRenderableContent: true,
    });
  });

  it('keeps empty, fragment, and safe srcset URLs', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(
      sanitizer.sanitizeContentHtml(
        '<a href="">empty</a><a href="#section">jump</a><img srcset="https://example.test/a.png 1x, /b.png 2x">',
      ),
    ).toEqual({
      contentHtml:
        '<a href="">empty</a><a href="#section">jump</a><img srcset="https://example.test/a.png 1x, /b.png 2x">',
      hasRenderableContent: true,
    });
  });

  it('removes unsafe or malformed srcset values', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(
      sanitizer.sanitizeContentHtml(
        '<img srcset="https://example.test/a.png 1x, javascript:bad() 2x"><img srcset=",">',
      ),
    ).toEqual({
      contentHtml: '<img><img>',
      hasRenderableContent: true,
    });
  });

  it('removes malformed URLs', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(sanitizer.sanitizeContentHtml('<a href="http://[">bad</a>')).toEqual({
      contentHtml: '<a>bad</a>',
      hasRenderableContent: true,
    });
  });

  it('reports when sanitized content has no renderable body', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(sanitizer.sanitizeContentHtml('<script>bad()</script>')).toEqual({
      contentHtml: '',
      hasRenderableContent: false,
    });
  });
});
