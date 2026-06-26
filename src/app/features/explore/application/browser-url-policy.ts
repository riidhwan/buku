export type BrowserUrlFailureReason = 'empty' | 'invalid' | 'search_terms' | 'unsupported_scheme';

export interface BrowserUrlSuccess {
  readonly ok: true;
  readonly url: string;
}

export interface BrowserUrlFailure {
  readonly ok: false;
  readonly reason: BrowserUrlFailureReason;
  readonly message: string;
}

export type BrowserUrlPolicyResult = BrowserUrlSuccess | BrowserUrlFailure;

const schemePattern = /^[a-z][a-z\d+.-]*:/i;
const allowedSchemes = new Set(['http:', 'https:']);

export class BrowserUrlPolicy {
  public normalize(input: string): BrowserUrlPolicyResult {
    const trimmedInput = input.trim();

    if (trimmedInput.length === 0) {
      return {
        ok: false,
        reason: 'empty',
        message: 'Enter a web address.',
      };
    }

    if (/\s/.test(trimmedInput)) {
      return {
        ok: false,
        reason: 'search_terms',
        message: 'Enter a URL, not search terms.',
      };
    }

    const explicitScheme = schemePattern.exec(trimmedInput)?.[0].toLowerCase() ?? null;
    if (explicitScheme !== null && !allowedSchemes.has(explicitScheme)) {
      return {
        ok: false,
        reason: 'unsupported_scheme',
        message: 'Only HTTP and HTTPS links are supported.',
      };
    }

    const candidate = explicitScheme === null ? `https://${trimmedInput}` : trimmedInput;

    try {
      const url = new URL(candidate);

      if (!this.hasValidHost(url)) {
        return {
          ok: false,
          reason: 'invalid',
          message: 'Enter a valid web address.',
        };
      }

      return {
        ok: true,
        url: url.toString(),
      };
    } catch (_error) {
      return {
        ok: false,
        reason: 'invalid',
        message: 'Enter a valid web address.',
      };
    }
  }

  private hasValidHost(url: URL): boolean {
    return (
      url.hostname.includes('.') && !url.hostname.startsWith('.') && !url.hostname.endsWith('.')
    );
  }
}
