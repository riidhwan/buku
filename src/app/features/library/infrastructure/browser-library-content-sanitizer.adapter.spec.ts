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

  it('reports when sanitized content has no renderable body', () => {
    const sanitizer = new BrowserLibraryContentSanitizerAdapter();

    expect(sanitizer.sanitizeContentHtml('<script>bad()</script>')).toEqual({
      contentHtml: '',
      hasRenderableContent: false,
    });
  });
});
