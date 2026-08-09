import { homedir } from 'node:os';
import { basename, isAbsolute, relative, resolve } from 'node:path';

const OPERATIONS = ['read', 'write'] as const;

type FileOperation = (typeof OPERATIONS)[number];

export interface PermissionRule {
  pattern: string;
  operations: ReadonlySet<FileOperation>;
  specificity: number;
  absolute: boolean;
}

export interface FilePermissionsConfig {
  rules: readonly PermissionRule[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFileOperation(value: unknown): value is FileOperation {
  return OPERATIONS.some((operation) => operation === value);
}

function toSlashPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function getPatternSpecificity(pattern: string): number {
  return pattern.replaceAll('*', '').length;
}

function expandHomePattern(pattern: string): string {
  if (pattern === '~') {
    return toSlashPath(homedir());
  }

  if (pattern.startsWith('~/')) {
    return `${toSlashPath(homedir())}/${pattern.slice(2)}`;
  }

  return pattern;
}

export function parseFilePermissionsConfig(value: unknown): FilePermissionsConfig {
  if (!isRecord(value)) {
    throw new Error('Config must be a JSON object.');
  }

  const rules = value['rules'];
  if (!isRecord(rules)) {
    throw new Error('Config must include a "rules" object.');
  }

  return {
    rules: Object.entries(rules).map(([pattern, operations]) => {
      if (!Array.isArray(operations) || !operations.every(isFileOperation)) {
        throw new Error(
          `Rule "${pattern}" must be an array containing only "read" and/or "write".`,
        );
      }

      const expandedPattern = expandHomePattern(pattern);

      return {
        pattern: expandedPattern,
        operations: new Set(operations),
        specificity: getPatternSpecificity(expandedPattern),
        absolute: isAbsolute(expandedPattern),
      };
    }),
  };
}

function stripToolPathPrefix(path: string): string {
  return path.startsWith('@') ? path.slice(1) : path;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globPatternMatches(pattern: string, candidate: string): boolean {
  const segments = pattern.split('**');
  const regexSource = segments
    .map((segment) => segment.split('*').map(escapeRegExp).join('[^/]*'))
    .join('.*');

  return new RegExp(`^${regexSource}$`).test(candidate);
}

interface PathInfo {
  absolutePath: string;
  relativePath: string;
  outsideProject: boolean;
  candidates: readonly string[];
}

function getPathInfo(path: string, cwd: string): PathInfo {
  const rawPath = stripToolPathPrefix(path);
  const absolutePath = toSlashPath(isAbsolute(rawPath) ? resolve(rawPath) : resolve(cwd, rawPath));
  const relativePath = toSlashPath(relative(cwd, absolutePath));
  const outsideProject =
    relativePath === '..' || relativePath.startsWith('../') || isAbsolute(relativePath);

  return {
    absolutePath,
    relativePath,
    outsideProject,
    candidates: [
      toSlashPath(rawPath),
      relativePath,
      relativePath.startsWith('../') ? relativePath : `./${relativePath}`,
      basename(rawPath),
      absolutePath,
    ],
  };
}

function findMatchingRule(
  pathInfo: PathInfo,
  rules: readonly PermissionRule[],
): PermissionRule | undefined {
  const matchingRules = rules.filter((rule) => {
    const candidates = rule.absolute ? [pathInfo.absolutePath] : pathInfo.candidates;
    return candidates.some((candidate) => globPatternMatches(toSlashPath(rule.pattern), candidate));
  });

  return matchingRules.sort((left, right) => right.specificity - left.specificity)[0];
}

export function isOperationAllowed(
  path: string,
  operation: FileOperation,
  cwd: string,
  config: FilePermissionsConfig,
): boolean {
  const pathInfo = getPathInfo(path, cwd);
  const matchingRule = findMatchingRule(pathInfo, config.rules);

  if (pathInfo.outsideProject && matchingRule?.absolute !== true) {
    return false;
  }

  if (matchingRule === undefined) {
    return true;
  }

  return matchingRule.operations.has(operation);
}

export function findDeniedOperation(
  path: string,
  operations: readonly FileOperation[],
  cwd: string,
  config: FilePermissionsConfig,
): FileOperation | undefined {
  return operations.find((operation) => !isOperationAllowed(path, operation, cwd, config));
}

export function getShellPathCandidates(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (const character of command) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (character === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && /\s/.test(character)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += character;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens
    .map((token) => token.replace(/^[<>|;&]+/, '').replace(/[<>|;&]+$/, ''))
    .filter(
      (token) =>
        !token.startsWith('-') &&
        (token.startsWith('/') ||
          token.startsWith('./') ||
          token.startsWith('../') ||
          token.includes('/') ||
          token.includes('.')),
    );
}
