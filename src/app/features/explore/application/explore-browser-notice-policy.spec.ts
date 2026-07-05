import {
  browserNoticeForLoadFailure,
  browserNoticeForReadingModeResult,
  browserNoticeForUnsupportedCapability,
} from './explore-browser-notice-policy';

describe('explore browser notice policy', () => {
  it('maps unsupported capabilities to user-facing notices', () => {
    expect(browserNoticeForUnsupportedCapability('camera', 'https://example.com/')).toEqual({
      kind: 'unsupportedCapability',
      message: 'Camera access is not supported in Explore Browser.',
      url: 'https://example.com/',
    });
  });

  it('includes the failed URL and error message for load failures', () => {
    expect(browserNoticeForLoadFailure('Connection reset', 'https://example.com/')).toEqual({
      kind: 'loadFailed',
      message: 'Page failed to load: Connection reset',
      url: 'https://example.com/',
    });
  });

  it('distinguishes unavailable and failed Reading Mode results', () => {
    expect(
      browserNoticeForReadingModeResult({ status: 'unavailable' }, 'https://example.com/'),
    ).toEqual({
      kind: 'readingModeUnavailable',
      message: 'Reading Mode is not available for this page.',
      url: 'https://example.com/',
    });

    expect(
      browserNoticeForReadingModeResult(
        { status: 'failed', message: 'Extraction failed' },
        'https://example.com/',
      ),
    ).toEqual({
      kind: 'readingModeFailed',
      message: 'Reading Mode failed: Extraction failed',
      url: 'https://example.com/',
    });
  });
});
