import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { architectureReportForFiles, formatArchitectureReport } from './architecture-report.mjs';

describe('architecture report', () => {
  it('reports facade responsibility drift signals', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'buku-architecture-report-'));
    const file = 'src/app/features/explore/application/explore-browser.facade.ts';
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      `
        import { Injectable } from '@angular/core';
        import { BrowserUrlPolicy } from './browser-url-policy';

        export class ExploreBrowserFacade {
          public openTab(): void {}
          public persistSession(): void {}
          private goBackThroughHistory(): void {}
          private showReadingArticle(): void {}
          private showNoticeMessage(): void {}
          private normalizeUrl(): void {}
          private loadChapter(): void {}
          private syncViewport(): void {}
        }
      `,
    );

    const result = architectureReportForFiles([file], { root });
    assert.equal(result.reports.length, 1);
    assert.deepEqual(result.reports[0]?.signals, [
      'tab',
      'session',
      'back-navigation',
      'reading-mode',
      'notice',
      'url-policy',
      'chapter',
      'viewport',
      'persistence',
    ]);
    assert.match(formatArchitectureReport(result), /facade shows several responsibility signals/);
  });

  it('marks files beyond the hard budget as hard failures', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'buku-architecture-report-'));
    const file = 'src/app/features/library/domain/large-domain.ts';
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      Array.from({ length: 190 }, () => 'export {};').join('\n'),
    );

    const result = architectureReportForFiles([file], { root });
    assert.equal(result.hasHardFailure, true);
    assert.match(formatArchitectureReport(result), /exceeds hard feature-domain budget/);
  });
});
