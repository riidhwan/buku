import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  classifyTestObligation,
  formatTestObligationReport,
  testObligationReportForFiles,
} from './test-obligation.mjs';

describe('test obligation report', () => {
  it('requires a nearby spec for clear behavior-owning roles', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'buku-test-obligation-'));
    const file = 'src/app/features/more/application/check-for-app-update.use-case.ts';
    writeFile(root, file, 'export class CheckForAppUpdateUseCase {}');
    writeManifest(root, {});

    const result = testObligationReportForFiles([file], { root });

    assert.equal(result.hasFailures, true);
    assert.match(formatTestObligationReport(result), /missing nearby spec/);
  });

  it('accepts behavior-owning files with same-basename specs', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'buku-test-obligation-'));
    const file = 'src/app/features/explore/application/browser-url-policy.ts';
    writeFile(root, file, 'export class BrowserUrlPolicy {}');
    writeFile(
      root,
      'src/app/features/explore/application/browser-url-policy.spec.ts',
      'export {};',
    );
    writeManifest(root, {});

    const result = testObligationReportForFiles([file], { root });

    assert.equal(result.hasFailures, false);
    assert.match(formatTestObligationReport(result), /browser-url-policy\.ts: policy/);
  });

  it('validates exception coveredBy specs', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'buku-test-obligation-'));
    const file = 'src/app/features/explore/application/explore-browser.facade.ts';
    writeFile(root, file, 'export class ExploreBrowserFacade {}');
    writeManifest(root, {
      [file]: {
        classification: 'thin-delegator',
        reason: 'Angular DI facade that only delegates to a workflow.',
        coveredBy: ['src/app/features/explore/application/explore-browser-workflow.spec.ts'],
      },
    });

    const result = testObligationReportForFiles([file], { root });

    assert.equal(result.hasFailures, true);
    assert.match(formatTestObligationReport(result), /coveredBy spec does not exist/);
  });

  it('warns for ambiguous facade and application roles', () => {
    assert.equal(
      classifyTestObligation('src/app/features/explore/application/explore-browser.facade.ts').kind,
      'ambiguous',
    );
    assert.equal(
      classifyTestObligation(
        'src/app/features/explore/application/explore-reading-chapter-navigator.ts',
      ).kind,
      'ambiguous',
    );
  });

  it('does not warn for ambiguous files with nearby specs', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'buku-test-obligation-'));
    const file = 'src/app/features/explore/application/explore-browser.facade.ts';
    writeFile(root, file, 'export class ExploreBrowserFacade {}');
    writeFile(
      root,
      'src/app/features/explore/application/explore-browser.facade.spec.ts',
      'export {};',
    );
    writeManifest(root, {});

    const result = testObligationReportForFiles([file], { root });

    assert.deepEqual(result.warnings, []);
  });
});

function writeFile(root, file, text) {
  const absolutePath = path.join(root, file);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text);
}

function writeManifest(root, manifest) {
  writeFile(root, 'scripts/test-obligation-exceptions.json', `${JSON.stringify(manifest)}\n`);
}
