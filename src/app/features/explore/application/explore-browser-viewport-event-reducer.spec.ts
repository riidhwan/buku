import { reduceBrowserViewportEvent } from './explore-browser-viewport-event-reducer';

describe('reduceBrowserViewportEvent', () => {
  it('maps secure navigation failures to replacement state without committing navigation', () => {
    expect(
      reduceBrowserViewportEvent({
        type: 'secureNavigationFailed',
        event: {
          reason: 'certificate',
          url: 'https://example.com/',
          originalHttpUrl: 'http://example.com/',
        },
      }),
    ).toEqual({
      inputValue: 'https://example.com/',
      currentUrl: 'https://example.com/',
      loading: false,
      secureNavigationFailure: {
        reason: 'certificate',
        title: 'Secure connection could not be verified.',
        message: 'Buku could not verify this site’s security certificate.',
        attemptedUrl: 'https://example.com/',
        externalUrl: 'https://example.com/',
        externalActionLabel: 'Open in device browser',
      },
    });
  });
  it('maps navigation events to browser state updates', () => {
    const reduction = reduceBrowserViewportEvent({
      type: 'navigation',
      committed: false,
      state: {
        url: 'https://example.com/',
        loading: true,
        canGoBack: true,
        canGoForward: false,
      },
    });

    expect(reduction).toEqual({
      inputValue: 'https://example.com/',
      currentUrl: 'https://example.com/',
      loading: true,
      nativeCanGoBack: true,
      canGoForward: false,
      secureNavigationFailure: null,
    });
  });

  it('includes committed navigation details when navigation commits', () => {
    const reduction = reduceBrowserViewportEvent({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/',
        title: 'Example',
        loading: false,
        canGoBack: false,
        canGoForward: true,
      },
    });

    expect(reduction.committedNavigation).toEqual({
      url: 'https://example.com/',
      title: 'Example',
    });
  });

  it('normalizes missing committed page titles to null', () => {
    const reduction = reduceBrowserViewportEvent({
      type: 'navigation',
      committed: true,
      state: {
        url: 'https://example.com/',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      },
    });

    expect(reduction.committedNavigation?.title).toBeNull();
  });

  it('maps load failures to loading state and a notice', () => {
    const reduction = reduceBrowserViewportEvent({
      type: 'loadFailed',
      event: {
        url: 'https://example.com/',
        description: 'Network error',
      },
    });

    expect(reduction.loading).toBeFalse();
    expect(reduction.notice).toEqual({
      kind: 'loadFailed',
      message: 'Page failed to load: Network error',
      url: 'https://example.com/',
    });
  });

  it('maps unsupported capabilities to notices', () => {
    const reduction = reduceBrowserViewportEvent({
      type: 'capabilityUnsupported',
      event: {
        capability: 'download',
        url: 'https://example.com/file.pdf',
      },
    });

    expect(reduction.notice).toEqual({
      kind: 'unsupportedCapability',
      message: 'Downloads are not supported in Explore Browser.',
      url: 'https://example.com/file.pdf',
    });
  });
});
