# Pi Permissions Extension

Opt-in Pi extension for project-local command permissions.

The source is tracked here so the extension can be shared without auto-loading for every developer. Pi only auto-loads extensions from `.pi/extensions/`, and `.pi/` is intentionally git-ignored.

## Enable locally

From the repository root:

```bash
mkdir -p .pi/extensions/pi-permissions
ln -sf ../../../tools/pi-extensions/pi-permissions/index.ts .pi/extensions/pi-permissions/index.ts
ln -sf ../../../tools/pi-extensions/pi-permissions/permissions-policy.ts .pi/extensions/pi-permissions/permissions-policy.ts
cp tools/pi-extensions/pi-permissions/config.example.json .pi/extensions/pi-permissions/config.json
```

Then reload Pi:

```text
/reload
```

Edit `.pi/extensions/pi-permissions/config.json` for your own local allow/ask/deny rules. That file is ignored by git.

## Config

```json
{
  "permission": {
    "*": "ask",
    "git status *": "allow",
    "rm *": "ask"
  }
}
```

Supported decisions:

- `allow` - run without prompting
- `ask` - prompt before running
- `deny` - block without prompting

Wildcard `*` matches any text inside one command segment. Chained shell commands are split and checked segment-by-segment, so allowing `git status *` does not automatically allow `git status --short && gh repo view`.

When prompted, `Always allow on this project` opens an editor prefilled with the command segment. Accept it as-is or edit it to a wildcard pattern such as `git pull origin *` before saving.

## Test

```bash
node --test tools/pi-extensions/pi-permissions/permissions-policy.test.ts
```
