import { BrowserUrlPolicy } from './browser-url-policy';

describe('BrowserUrlPolicy', () => {
  let policy: BrowserUrlPolicy;

  beforeEach(() => {
    policy = new BrowserUrlPolicy();
  });

  it('accepts full HTTPS URLs', () => {
    expect(policy.normalize('https://example.com/path').ok).toBeTrue();
    expect(policy.normalize('https://example.com/path')).toEqual({
      ok: true,
      url: 'https://example.com/path',
    });
  });

  it('accepts full HTTP URLs', () => {
    expect(policy.normalize('http://example.com')).toEqual({
      ok: true,
      url: 'http://example.com/',
    });
  });

  it('accepts uppercase HTTP schemes', () => {
    expect(policy.normalize('HTTPS://example.com')).toEqual({
      ok: true,
      url: 'https://example.com/',
    });
  });

  it('normalizes bare domains to HTTPS', () => {
    expect(policy.normalize('example.com')).toEqual({
      ok: true,
      url: 'https://example.com/',
    });
  });

  it('rejects invalid input', () => {
    const result = policy.normalize('example');

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.reason).toBe('invalid');
    }
  });

  it('rejects malformed URLs', () => {
    const result = policy.normalize('http://[');

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.reason).toBe('invalid');
    }
  });

  it('rejects search terms', () => {
    const result = policy.normalize('example search');

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.reason).toBe('search_terms');
    }
  });

  it('rejects custom schemes', () => {
    const result = policy.normalize('mailto:reader@example.com');

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.reason).toBe('unsupported_scheme');
    }
  });

  it('rejects empty input', () => {
    const result = policy.normalize('  ');

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.reason).toBe('empty');
    }
  });
});
