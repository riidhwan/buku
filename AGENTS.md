# Agent Instructions

@/home/dhani/.codex/RTK.md

This is an Android-first Ionic Angular project. Before changing code, read:

- `CONTEXT.md`
- `docs/architecture-glossary.md`
- `docs/project-structure.md`
- `docs/scaffold-checklist.md`
- relevant ADRs in `docs/adr/`

## Architectural Contract

Follow the documented architecture unless the user explicitly asks to revisit it.

- Keep the app Android-first; do not optimize for web compatibility.
- Use standalone Ionic Angular.
- Keep the app at the repository root.
- Keep features under `src/app/features/<feature-name>/`.
- Use the feature layers `domain/`, `application/`, `infrastructure/`, and `presentation/`.
- Do not add placeholder/sample features.
- Do not add feature `NgModule` files.
- Do not add a broad `@app/*` alias.

## Dependency Direction

Features must not import from other features directly.

Allowed feature direction:

```text
presentation -> application -> domain
infrastructure -> application/domain
```

Layer rules:

- `domain/` is pure TypeScript only.
- `application/` owns use cases, ports, facades, and feature-local signal state.
- `infrastructure/` implements application ports and isolates Capacitor/native/storage/http APIs.
- `presentation/` owns Ionic pages, components, and feature route declarations.

## Shared And Core

- `core/` is app-wide wiring/platform capability only; it must not contain feature business concepts.
- `shared/` is for proven reuse only.
- Do not create `shared/services` or `shared/models`.
- Prefer local duplication until a shared abstraction is obvious.

## Strictness

Keep strictness high.

- Do not introduce `any`.
- Do not ignore lint warnings.
- Do not use direct `console` outside `src/app/core/logging/console-logger.ts`.
- Do not import `@capacitor/*` outside infrastructure adapters, core native adapters, or Capacitor config.
- Do not import environment files from feature code; expose config through typed injected tokens.
- Use typed results for expected application failures.
- Use exceptions only for programmer errors, violated invariants, or unexpected failures.

## Tests And Verification

For meaningful code changes, add or update focused tests.

Run the smallest useful checks while working, and before handoff run the relevant quality gates:

```bash
rtk pnpm format:check
rtk pnpm lint
rtk pnpm lint:styles
rtk pnpm exec tsc -p tsconfig.spec.json --noEmit
rtk pnpm build
rtk pnpm cap:sync:android
```

When Android files or Capacitor integration change, also run:

```bash
rtk ./gradlew test
rtk ./gradlew lint
rtk ./gradlew assembleDebug
```

Run Gradle commands from `android/`.

## Changing The Architecture

Do not silently change the architecture. If a change conflicts with an ADR or `docs/project-structure.md`, stop and surface the trade-off. If the user accepts the change, update the relevant docs and add a new ADR when the decision is hard to reverse, surprising without context, and the result of a real trade-off.
