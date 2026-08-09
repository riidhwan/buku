import {
  CONFIG_DIR_NAME,
  isToolCallEventType,
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parsePermissionConfig,
  resolveCommandChecks,
  type CommandPermissionCheck,
  type PermissionConfig,
} from './permissions-policy.ts';

const EXTENSION_NAME = 'pi-permissions';
const ALLOW_ONCE_OPTION = 'Allow once';
const ALWAYS_ALLOW_OPTION = 'Always allow on this project';
const DENY_OPTION = 'No';

function getConfigPath(cwd: string): string {
  return join(cwd, CONFIG_DIR_NAME, 'extensions', EXTENSION_NAME, 'config.json');
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function loadConfig(cwd: string): Promise<PermissionConfig> {
  try {
    const rawConfig = await readFile(getConfigPath(cwd), 'utf8');
    return parsePermissionConfig(JSON.parse(rawConfig) as unknown);
  } catch (error: unknown) {
    if (isFileNotFoundError(error)) {
      return parsePermissionConfig({ permission: { '*': 'ask' } });
    }

    throw error;
  }
}

async function saveConfig(cwd: string, config: PermissionConfig): Promise<void> {
  await writeFile(getConfigPath(cwd), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function confirmCommand(
  command: string,
  checks: CommandPermissionCheck[],
  config: PermissionConfig,
  ctx: ExtensionContext,
) {
  const deniedCheck = checks.find((check) => check.decision === 'deny');
  if (deniedCheck !== undefined) {
    return {
      block: true,
      reason: `Command denied by ${EXTENSION_NAME}: ${deniedCheck.command}`,
    };
  }

  const askChecks = checks.filter((check) => check.decision === 'ask');
  if (askChecks.length === 0) {
    return undefined;
  }

  if (!ctx.hasUI) {
    return {
      block: true,
      reason: `Command requires approval but no UI is available: ${askChecks[0]?.command ?? command}`,
    };
  }

  for (const check of askChecks) {
    const prompt =
      check.command === command
        ? `Allow command?\n\n${command}`
        : `Allow command segment?\n\n${check.command}\n\nFull command:\n${command}`;

    const choice = await ctx.ui.select(prompt, [
      ALLOW_ONCE_OPTION,
      ALWAYS_ALLOW_OPTION,
      DENY_OPTION,
    ]);

    if (choice === ALWAYS_ALLOW_OPTION) {
      const patternPrompt =
        check.command === command
          ? `Allow command pattern for:\n\n${command}`
          : `Allow command pattern for segment:\n\n${check.command}\n\nFull command:\n${command}`;
      const pattern = await ctx.ui.editor(patternPrompt, check.command);
      const trimmedPattern = pattern?.trim();
      if (trimmedPattern === undefined || trimmedPattern.length === 0) {
        return { block: true, reason: `Empty allow pattern for command: ${check.command}` };
      }

      config.permission[trimmedPattern] = 'allow';
      await saveConfig(ctx.cwd, config);
      ctx.ui.notify(`Saved allow rule for: ${trimmedPattern}`, 'info');
      continue;
    }

    if (choice !== ALLOW_ONCE_OPTION) {
      return { block: true, reason: `Command blocked by user: ${check.command}` };
    }
  }

  return undefined;
}

export default function (pi: ExtensionAPI) {
  pi.on('tool_call', async (event, ctx) => {
    if (!isToolCallEventType('bash', event)) {
      return undefined;
    }

    if (!ctx.isProjectTrusted()) {
      return {
        block: true,
        reason: `${EXTENSION_NAME} only reads project config in trusted projects.`,
      };
    }

    let config: PermissionConfig;
    try {
      config = await loadConfig(ctx.cwd);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown configuration error';
      return { block: true, reason: `Failed to read ${EXTENSION_NAME} config: ${message}` };
    }

    const command = event.input.command;
    const checks = resolveCommandChecks(command, config);
    return confirmCommand(command, checks, config, ctx);
  });
}
