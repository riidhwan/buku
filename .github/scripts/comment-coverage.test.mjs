import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { coverageCommentBody } from './comment-coverage.mjs';

const coverage = (statements, branches, functions, lines) => ({
  statements: { pct: statements },
  branches: { pct: branches },
  functions: { pct: functions },
  lines: { pct: lines },
});

describe('coverageCommentBody', () => {
  it('includes overall coverage totals before files below 100%', () => {
    const body = coverageCommentBody({
      total: coverage(98.25, 99, 100, 98.5),
      '/repo/src/high.ts': coverage(100, 100, 100, 100),
      '/repo/src/low.ts': coverage(95, 100, 100, 97.125),
    });

    assert.match(body, /\| Total \| 98\.25% \| 99% \| 100% \| 98\.50% \|/);
    assert.match(body, /\| `\/repo\/src\/low\.ts` \| 95% \| 100% \| 100% \| 97\.13% \|/);
    assert.doesNotMatch(body, /high\.ts/);
    assert.ok(body.indexOf('| Overall |') < body.indexOf('### Files below 100%'));
  });

  it('still shows overall coverage when all reported files are at 100%', () => {
    const body = coverageCommentBody({
      total: coverage(100, 100, 100, 100),
      '/repo/src/high.ts': coverage(100, 100, 100, 100),
    });

    assert.match(body, /\| Total \| 100% \| 100% \| 100% \| 100% \|/);
    assert.match(body, /All reported files are at 100% coverage\./);
  });
});
