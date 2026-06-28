export interface BrowserOpenResult {
  readonly ok: boolean;
}

export interface BrowserReadingModeResult {
  readonly ok: boolean;
}

export type BrowserReadingChapterNavigationResult =
  | {
      readonly ok: true;
      readonly destination: 'reader' | 'browser';
    }
  | {
      readonly ok: false;
    };
