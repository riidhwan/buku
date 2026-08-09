# Pi File Permissions Extension

Opt-in Pi extension for project-local file permissions.

The source is tracked here so the extension can be shared without auto-loading for every developer. Pi only auto-loads extensions from `.pi/extensions/`, and `.pi/` is intentionally git-ignored.

## Enable locally

Copy this extension directory to your local Pi extensions directory:

```text
.pi/extensions/pi-file-permissions/
```

Copy `config.example.json` as `config.json` inside that local extension directory, then edit it for your own rules.

Reload Pi after code changes:

```text
/reload
```

Config changes are read on each tool call and do not require `/reload`.

## Config

```json
{
  "rules": {
    "*": ["read", "write"],
    ".env": [],
    ".env.*": [],
    "~/test/*": ["read"]
  }
}
```

Rule values are allowed operations:

- `read` - allows `read`, `grep`, `find`, and `ls` for matching paths
- `write` - allows `write` and `edit` for matching paths
- `[]` - denies read and write access for matching paths

Outside-project paths are denied by default unless an absolute or home-directory rule allows them, such as `~/test/*` or `/tmp/pi-output/**`.

Supported wildcards:

- `*` matches inside one path segment
- `**` matches recursively across path segments

## Test

```bash
node --test tools/pi-extensions/pi-file-permissions/file-permissions-policy.test.ts
```
