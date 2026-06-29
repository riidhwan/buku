import { InjectionToken } from '@angular/core';

export interface LibraryContentSanitizer {
  sanitizeContentHtml(contentHtml: string): SanitizedLibraryContent;
}

export interface SanitizedLibraryContent {
  readonly contentHtml: string;
  readonly hasRenderableContent: boolean;
}

export const LIBRARY_CONTENT_SANITIZER = new InjectionToken<LibraryContentSanitizer>(
  'LIBRARY_CONTENT_SANITIZER',
);
