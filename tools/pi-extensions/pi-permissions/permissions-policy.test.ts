import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parsePermissionConfig,
  resolveCommandChecks,
  type PermissionConfig,
} from './permissions-policy.ts';

const config: PermissionConfig = {
  permission: {
    '*': 'ask',
    'find *': 'allow',
    'git status *': 'allow',
    'rm *': 'deny',
  },
};

describe('parsePermissionConfig', () => {
  it('falls back to ask for invalid config', () => {
    assert.deepEqual(parsePermissionConfig({}), { permission: { '*': 'ask' } });
  });

  it('keeps valid decisions and ignores invalid entries', () => {
    assert.deepEqual(
      parsePermissionConfig({
        permission: {
          '*': 'deny',
          'git status *': 'allow',
          ' ': 'allow',
          'rm *': 'block',
        },
      }),
      {
        permission: {
          '*': 'deny',
          'git status *': 'allow',
        },
      },
    );
  });

  it('adds ask fallback when config omits wildcard fallback', () => {
    assert.deepEqual(parsePermissionConfig({ permission: { 'find *': 'allow' } }), {
      permission: {
        'find *': 'allow',
        '*': 'ask',
      },
    });
  });
});

describe('resolveCommandChecks', () => {
  it('allows a command matching an allow wildcard', () => {
    assert.deepEqual(resolveCommandChecks('git status --short', config), [
      { command: 'git status --short', decision: 'allow' },
    ]);
  });

  it('uses the wildcard fallback for unknown commands', () => {
    assert.deepEqual(resolveCommandChecks('echo hello', config), [
      { command: 'echo hello', decision: 'ask' },
    ]);
  });

  it('uses exact full-command rule before splitting chained commands', () => {
    assert.deepEqual(
      resolveCommandChecks('git status --short && echo hello', {
        permission: {
          '*': 'ask',
          'git status --short && echo hello': 'allow',
        },
      }),
      [{ command: 'git status --short && echo hello', decision: 'allow' }],
    );
  });

  it('checks every shell segment independently', () => {
    assert.deepEqual(
      resolveCommandChecks(
        'git status --short && gh repo view --json defaultBranchRef || true',
        config,
      ),
      [
        { command: 'git status --short', decision: 'allow' },
        { command: 'gh repo view --json defaultBranchRef', decision: 'ask' },
        { command: 'true', decision: 'ask' },
      ],
    );
  });

  it('does not split shell operators inside quoted strings', () => {
    assert.deepEqual(resolveCommandChecks('echo "a && b" && find src', config), [
      { command: 'echo "a && b"', decision: 'ask' },
      { command: 'find src', decision: 'allow' },
    ]);
  });

  it('reports denied segments independently', () => {
    assert.deepEqual(resolveCommandChecks('git status --short; rm -rf tmp', config), [
      { command: 'git status --short', decision: 'allow' },
      { command: 'rm -rf tmp', decision: 'deny' },
    ]);
  });
});
