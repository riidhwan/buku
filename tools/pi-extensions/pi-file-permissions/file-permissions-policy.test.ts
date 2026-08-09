import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { describe, it } from 'node:test';
import {
  findDeniedOperation,
  getShellPathCandidates,
  isOperationAllowed,
  parseFilePermissionsConfig,
} from './file-permissions-policy.ts';

const cwd = '/home/dhani/project/buku';

function config(rules: Record<string, Array<'read' | 'write'>>) {
  return parseFilePermissionsConfig({ rules });
}

describe('parseFilePermissionsConfig', () => {
  it('rejects rule operations other than read or write', () => {
    assert.throws(
      () => parseFilePermissionsConfig({ rules: { '*': ['read', 'execute'] } }),
      /only "read" and\/or "write"/,
    );
  });

  it('expands home-directory patterns', () => {
    assert.equal(config({ '~/test/*': ['read'] }).rules[0]?.pattern, `${homedir()}/test/*`);
  });
});

describe('isOperationAllowed', () => {
  it('allows project files through the wildcard rule', () => {
    const permissions = config({ '*': ['read', 'write'], '.env': [] });

    assert.equal(isOperationAllowed('.gitignore', 'read', cwd, permissions), true);
    assert.equal(isOperationAllowed('src/app/app.routes.ts', 'write', cwd, permissions), true);
  });

  it('lets a more-specific empty rule deny a protected file', () => {
    const permissions = config({ '*': ['read', 'write'], '.env': [] });

    assert.equal(isOperationAllowed('.env', 'read', cwd, permissions), false);
    assert.equal(isOperationAllowed('.env', 'write', cwd, permissions), false);
  });

  it('denies outside-project paths by default even when wildcard allows project files', () => {
    const permissions = config({ '*': ['read', 'write'] });

    assert.equal(isOperationAllowed('/home/dhani/test/h.txt', 'read', cwd, permissions), false);
    assert.equal(isOperationAllowed('../secret.txt', 'read', cwd, permissions), false);
  });

  it('allows explicitly configured outside-project reads with home-directory patterns', () => {
    const permissions = config({ '*': ['read', 'write'], '~/test/*': ['read'] });

    assert.equal(isOperationAllowed('/home/dhani/test/h.txt', 'read', cwd, permissions), true);
    assert.equal(isOperationAllowed('/home/dhani/test/h.txt', 'write', cwd, permissions), false);
  });

  it('supports recursive directory rules', () => {
    const permissions = config({ '*': ['read', 'write'], './x/**': [] });

    assert.equal(isOperationAllowed('./x/a/b.txt', 'read', cwd, permissions), false);
    assert.equal(isOperationAllowed('./x.txt', 'read', cwd, permissions), true);
  });
});

describe('findDeniedOperation', () => {
  it('returns the first denied operation', () => {
    const permissions = config({ '*': ['read', 'write'], '~/test/*': ['read'] });

    assert.equal(
      findDeniedOperation('/home/dhani/test/h.txt', ['read', 'write'], cwd, permissions),
      'write',
    );
  });
});

describe('getShellPathCandidates', () => {
  it('extracts path-looking shell tokens without splitting quoted paths', () => {
    assert.deepEqual(getShellPathCandidates('cat "~/test/h.txt" && echo done'), ['~/test/h.txt']);
  });

  it('ignores command flags', () => {
    assert.deepEqual(getShellPathCandidates('grep -R pattern ./src'), ['./src']);
  });
});
