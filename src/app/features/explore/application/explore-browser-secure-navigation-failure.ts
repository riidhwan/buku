import type { BrowserSecureNavigationFailureEvent } from './ports/browser-viewport.port';

export interface ExploreBrowserSecureNavigationFailure {
  readonly reason: BrowserSecureNavigationFailureEvent['reason'];
  readonly title: string;
  readonly message: string;
  readonly attemptedUrl: string;
  readonly externalUrl: string | null;
  readonly externalActionLabel: string | null;
}

export function toSecureNavigationFailure(
  event: BrowserSecureNavigationFailureEvent,
): ExploreBrowserSecureNavigationFailure {
  switch (event.reason) {
    case 'certificate':
      return createFailure(event, [
        'Secure connection could not be verified.',
        'Buku could not verify this site’s security certificate.',
        event.url,
        'Open in device browser',
      ]);
    case 'downgradeLoop':
      return createFailure(event, [
        'The site kept requesting an insecure connection.',
        'Buku stopped the navigation instead of loading the site over HTTP.',
        event.originalHttpUrl,
        'Open insecure link in device browser',
      ]);
    case 'insecureForm':
      return createFailure(event, [
        'Insecure form submission blocked.',
        'Buku cannot safely upgrade this form without losing or changing the submitted data.',
        null,
        null,
      ]);
    case 'offline':
      return createFailure(event, [
        'You appear to be offline.',
        'Check your connection, then retry the secure page.',
        null,
        null,
      ]);
    case 'tooManyUpgrades':
      return createFailure(event, [
        'Too many insecure redirects.',
        'Buku stopped the navigation after repeated HTTPS upgrades.',
        event.originalHttpUrl,
        'Open insecure link in device browser',
      ]);
    case 'secureUnavailable':
      return createFailure(event, [
        'Secure site could not be reached.',
        'Buku upgraded the HTTP link, but the HTTPS destination did not load.',
        event.originalHttpUrl,
        event.originalHttpUrl === null ? null : 'Open insecure link in device browser',
      ]);
  }
}

function createFailure(
  event: BrowserSecureNavigationFailureEvent,
  details: readonly [string, string, string | null, string | null],
): ExploreBrowserSecureNavigationFailure {
  return {
    reason: event.reason,
    title: details[0],
    message: details[1],
    attemptedUrl: event.url,
    externalUrl: details[2],
    externalActionLabel: details[3],
  };
}
