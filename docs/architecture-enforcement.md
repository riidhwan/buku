# Architecture Enforcement

The architecture is protected through agent instructions, documentation, lint rules, and CI.

## Agent Instructions

Future agents must read `AGENTS.md` first. It points to the project structure docs, ADRs, and the non-negotiable dependency rules.

## Documentation

- `docs/project-structure.md` defines the target source layout.
- `docs/scaffold-checklist.md` defines the scaffold and verification checklist.
- `docs/architecture-glossary.md` defines binding engineering terms for code placement and dependency decisions.
- `CONTEXT.md` defines product and domain language.
- `docs/adr/` records architectural decisions and their rationale.

If a future change conflicts with these documents, update the docs and add an ADR when the decision is hard to reverse, surprising without context, and based on a real trade-off.

## Automated Checks

The following rules are enforced by tooling:

- strict TypeScript
- strict Angular templates
- ESLint with type-aware rules
- ESLint complexity limits for TypeScript control flow, nesting, function length, and parameter count
- ESLint boundaries for architectural imports
- path-specific ESLint rules for domain, application, ports, infrastructure, presentation, core, and shared code
- restricted feature, environment, Capacitor, and console imports
- Stylelint for SCSS, including selector nesting limits
- Prettier formatting
- CI web and Android quality jobs

Run:

```bash
pnpm format:check
pnpm lint
pnpm lint:styles
pnpm exec tsc -p tsconfig.spec.json --noEmit
pnpm build
pnpm cap:sync:android
```

For Android changes, also run from `android/`:

```bash
./gradlew test
./gradlew lint
./gradlew assembleDebug
```

## Review Checks

Some rules need review judgment:

- whether a concept belongs in `core/`, `shared/`, or a feature
- whether duplication is ready to become shared
- whether a new adapter properly isolates native, storage, or network APIs
- whether a feature has enough unit coverage at the domain/application boundary
- whether a proposed architecture change needs a new ADR
