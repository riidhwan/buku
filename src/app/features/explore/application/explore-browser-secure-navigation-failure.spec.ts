import { toSecureNavigationFailure } from './explore-browser-secure-navigation-failure';

describe('toSecureNavigationFailure', () => {
  it('offers the original HTTP URL when an upgraded secure site is unavailable', () => {
    expect(
      toSecureNavigationFailure({
        reason: 'secureUnavailable',
        url: 'https://example.com/chapter',
        originalHttpUrl: 'http://example.com/chapter',
      }),
    ).toEqual({
      reason: 'secureUnavailable',
      title: 'Secure site could not be reached.',
      message: 'Buku upgraded the HTTP link, but the HTTPS destination did not load.',
      attemptedUrl: 'https://example.com/chapter',
      externalUrl: 'http://example.com/chapter',
      externalActionLabel: 'Open insecure link in device browser',
    });
  });

  it('does not offer an insecure handoff for offline failures', () => {
    const failure = toSecureNavigationFailure({
      reason: 'offline',
      url: 'https://example.com/',
      originalHttpUrl: 'http://example.com/',
    });

    expect(failure.externalUrl).toBeNull();
    expect(failure.externalActionLabel).toBeNull();
  });

  it('does not offer a URL-only handoff for insecure form submissions', () => {
    const failure = toSecureNavigationFailure({
      reason: 'insecureForm',
      url: 'https://example.com/submit',
      originalHttpUrl: 'http://example.com/submit',
    });

    expect(failure.externalUrl).toBeNull();
    expect(failure.message).toContain('submitted data');
  });

  it('maps the remaining secure failure reasons', () => {
    const cases = [
      ['downgradeLoop', 'The site kept requesting an insecure connection.'],
      ['tooManyUpgrades', 'Too many insecure redirects.'],
    ] as const;

    for (const [reason, title] of cases) {
      expect(
        toSecureNavigationFailure({
          reason,
          url: 'https://example.com/',
          originalHttpUrl: 'http://example.com/',
        }).title,
      ).toBe(title);
    }
  });

  it('omits the external action when an ordinary HTTPS destination is unavailable', () => {
    const failure = toSecureNavigationFailure({
      reason: 'secureUnavailable',
      url: 'https://example.com/',
      originalHttpUrl: null,
    });

    expect(failure.externalUrl).toBeNull();
    expect(failure.externalActionLabel).toBeNull();
  });
});
