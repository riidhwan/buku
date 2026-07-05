import type {
  BrowserArticleExtractionResult,
  BrowserCapability,
} from './ports/browser-viewport.port';

export type BrowserNoticeKind =
  | 'loadFailed'
  | 'unsupportedCapability'
  | 'copied'
  | 'readingModeUnavailable'
  | 'readingModeFailed';

export interface BrowserNotice {
  readonly kind: BrowserNoticeKind;
  readonly message: string;
  readonly url: string | null;
}

const capabilityMessages: Record<BrowserCapability, string> = {
  camera: 'Camera access is not supported in Explore Browser.',
  customScheme: 'This link type is not supported in Explore Browser.',
  download: 'Downloads are not supported in Explore Browser.',
  fileUpload: 'File upload is not supported in Explore Browser.',
  geolocation: 'Location access is not supported in Explore Browser.',
  microphone: 'Microphone access is not supported in Explore Browser.',
  newWindow: 'Pop-up windows are opened in the current Explore Browser session when possible.',
  unknown: 'This page requested something Explore Browser does not support.',
};

export function browserNoticeForUnsupportedCapability(
  capability: BrowserCapability,
  url: string | null,
): BrowserNotice {
  return {
    kind: 'unsupportedCapability',
    message: capabilityMessages[capability],
    url,
  };
}

export function browserNoticeForLoadFailure(message: string, url: string | null): BrowserNotice {
  return {
    kind: 'loadFailed',
    message: `Page failed to load: ${message}`,
    url,
  };
}

export function browserNoticeForReadingModeResult(
  result: Exclude<BrowserArticleExtractionResult, { readonly status: 'ok' }>,
  url: string,
): BrowserNotice {
  if (result.status === 'unavailable') {
    return {
      kind: 'readingModeUnavailable',
      message: 'Reading Mode is not available for this page.',
      url,
    };
  }

  return {
    kind: 'readingModeFailed',
    message: `Reading Mode failed: ${result.message}`,
    url,
  };
}
