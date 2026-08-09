import {
  CONFIG_DIR_NAME,
  isToolCallEventType,
  type ExtensionAPI,
} from '@earendil-works/pi-coding-agent';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  findDeniedOperation,
  getShellPathCandidates,
  parseFilePermissionsConfig,
  type FilePermissionsConfig,
} from './file-permissions-policy.ts';

const EXTENSION_NAME = 'pi-file-permissions';

function getConfigPath(cwd: string): string {
  return join(cwd, CONFIG_DIR_NAME, 'extensions', EXTENSION_NAME, 'config.json');
}

async function loadConfig(cwd: string): Promise<FilePermissionsConfig> {
  const rawConfig = await readFile(getConfigPath(cwd), 'utf8');
  return parseFilePermissionsConfig(JSON.parse(rawConfig) as unknown);
}

function getBlockedPathResult(toolName: string, path: string, operation: 'read' | 'write') {
  return {
    block: true,
    reason: `${toolName} ${operation} access is blocked for path: ${path}`,
    terminate: true,
  };
}

export default function piFilePermissions(pi: ExtensionAPI) {
  pi.on('tool_call', async (event, ctx) => {
    if (!ctx.isProjectTrusted()) {
      return {
        block: true,
        reason: `${EXTENSION_NAME} only reads project config in trusted projects.`,
      };
    }

    let config: FilePermissionsConfig;
    try {
      config = await loadConfig(ctx.cwd);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown configuration error';
      return { block: true, reason: `Failed to read ${EXTENSION_NAME} config: ${message}` };
    }

    if (isToolCallEventType('read', event)) {
      const deniedOperation = findDeniedOperation(event.input.path, ['read'], ctx.cwd, config);
      if (deniedOperation !== undefined) {
        return getBlockedPathResult(event.toolName, event.input.path, deniedOperation);
      }
    }

    if (isToolCallEventType('write', event) || isToolCallEventType('edit', event)) {
      const deniedOperation = findDeniedOperation(event.input.path, ['write'], ctx.cwd, config);
      if (deniedOperation !== undefined) {
        return getBlockedPathResult(event.toolName, event.input.path, deniedOperation);
      }
    }

    if (isToolCallEventType('grep', event) || isToolCallEventType('find', event)) {
      const searchPath = event.input.path ?? '.';
      const deniedOperation = findDeniedOperation(searchPath, ['read'], ctx.cwd, config);
      if (deniedOperation !== undefined) {
        return getBlockedPathResult(event.toolName, searchPath, deniedOperation);
      }
    }

    if (isToolCallEventType('ls', event)) {
      const listPath = event.input.path ?? '.';
      const deniedOperation = findDeniedOperation(listPath, ['read'], ctx.cwd, config);
      if (deniedOperation !== undefined) {
        return getBlockedPathResult(event.toolName, listPath, deniedOperation);
      }
    }

    if (isToolCallEventType('bash', event)) {
      const deniedPath = getShellPathCandidates(event.input.command).find(
        (path) => findDeniedOperation(path, ['read', 'write'], ctx.cwd, config) !== undefined,
      );

      if (deniedPath !== undefined) {
        return {
          block: true,
          reason: `Bash command references a path without read/write permission: ${deniedPath}`,
          terminate: true,
        };
      }
    }

    return undefined;
  });
}
