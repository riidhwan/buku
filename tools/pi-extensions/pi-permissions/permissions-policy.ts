export type PermissionDecision = 'allow' | 'ask' | 'deny';

export interface PermissionConfig {
  permission: Record<string, PermissionDecision>;
}

export interface CommandPermissionCheck {
  command: string;
  decision: PermissionDecision;
}

const DEFAULT_DECISION: PermissionDecision = 'ask';

export function parsePermissionConfig(value: unknown): PermissionConfig {
  if (typeof value !== 'object' || value === null || !('permission' in value)) {
    return { permission: { '*': DEFAULT_DECISION } };
  }

  const rawPermission = value.permission;
  if (typeof rawPermission !== 'object' || rawPermission === null || Array.isArray(rawPermission)) {
    return { permission: { '*': DEFAULT_DECISION } };
  }

  const permission: Record<string, PermissionDecision> = {};
  for (const [pattern, decision] of Object.entries(rawPermission)) {
    if (pattern.trim().length > 0 && isPermissionDecision(decision)) {
      permission[pattern] = decision;
    }
  }

  if (!('*' in permission)) {
    permission['*'] = DEFAULT_DECISION;
  }

  return { permission };
}

export function resolveCommandChecks(
  command: string,
  config: PermissionConfig,
): CommandPermissionCheck[] {
  const exactDecision = config.permission[command];
  if (exactDecision !== undefined) {
    return [{ command, decision: exactDecision }];
  }

  const segments = splitShellCommandSegments(command);
  if (segments.length <= 1) {
    return [{ command, decision: resolveSingleCommandDecision(command, config) }];
  }

  return segments.map((segment) => ({
    command: segment,
    decision: resolveSingleCommandDecision(segment, config),
  }));
}

function isPermissionDecision(value: unknown): value is PermissionDecision {
  return value === 'allow' || value === 'ask' || value === 'deny';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardPatternMatches(pattern: string, command: string): boolean {
  const regexSource = pattern
    .split('*')
    .map((part) => escapeRegExp(part))
    .join('.*');

  return new RegExp(`^${regexSource}$`).test(command);
}

function splitShellCommandSegments(command: string): string[] {
  const segments: string[] = [];
  let segmentStart = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command.charAt(index);
    const nextCharacter = command.charAt(index + 1);

    if (escaped) {
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

    if (inSingleQuote || inDoubleQuote) {
      continue;
    }

    const isDoubleOperator =
      (character === '&' && nextCharacter === '&') || (character === '|' && nextCharacter === '|');
    const isSingleOperator = character === ';' || character === '|' || character === '\n';

    if (isDoubleOperator || isSingleOperator) {
      const segment = command.slice(segmentStart, index).trim();
      if (segment.length > 0) {
        segments.push(segment);
      }

      index += isDoubleOperator ? 1 : 0;
      segmentStart = index + 1;
    }
  }

  const finalSegment = command.slice(segmentStart).trim();
  if (finalSegment.length > 0) {
    segments.push(finalSegment);
  }

  return segments;
}

function resolveSingleCommandDecision(
  command: string,
  config: PermissionConfig,
): PermissionDecision {
  let fallback = DEFAULT_DECISION;

  for (const [pattern, decision] of Object.entries(config.permission)) {
    if (pattern === '*') {
      fallback = decision;
      continue;
    }

    if (wildcardPatternMatches(pattern, command)) {
      return decision;
    }
  }

  return fallback;
}
