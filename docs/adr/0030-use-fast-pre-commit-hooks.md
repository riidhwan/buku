# Use fast pre-commit hooks

The project uses fast pre-commit hooks for local feedback, such as formatting and linting staged files. Hooks must stay lightweight and are not authoritative; CI remains the source of truth for full linting, tests, builds, Capacitor sync, and Android checks.
