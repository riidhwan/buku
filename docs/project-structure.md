# Project Structure

This project is an Android-first Ionic Angular application. It does not optimize for web compatibility.

For how these rules are enforced, see `docs/architecture-enforcement.md`.

## Scaffold Baseline

The project starts as a root-level single Ionic Angular app generated from the blank Ionic starter, then immediately reshaped into this structure.

Baseline choices:

- package manager: pnpm
- visible app name: `Buku`
- Android package id: `me.ramdhani.buku`
- platform target: Capacitor Android only
- repository layout: app at the repository root, not under `apps/mobile/`
- generated starter: blank Ionic Angular starter
- sample features: none

Expected root-level shape after scaffold:

```text
android/
docs/
src/
capacitor.config.ts
package.json
pnpm-lock.yaml
```

## Source Layout

```text
src/app/
  app.routes.ts
  core/
  shared/
  features/
```

## Core

`core/` contains app-wide platform and wiring code. It must not contain feature business concepts, and it must not depend on any feature.

```text
src/app/core/
  bootstrap/
  config/
  errors/
    app-error.ts
    error-reporter.ts
    error-reporter.token.ts
    noop-error-reporter.ts
    global-error-handler.ts
  logging/
    logger.ts
    logger.token.ts
    console-logger.ts
  native/
    app-lifecycle/
    network/
  routing/
  storage/
```

Use `core/` for app configuration, global error handling, logging setup, top-level routing helpers, storage setup, and native capabilities that are genuinely app-wide.

## Shared

`shared/` contains reusable code that is proven to be shared by multiple features. It is organized by responsibility, not by vague buckets.

```text
src/app/shared/
  domain/
  application/
  presentation/
    components/
    directives/
    pipes/
  testing/
    builders/
    fakes/
    matchers/
```

Rules:

- Do not create `shared/services` or `shared/models`.
- Do not put feature-specific concepts in `shared/`.
- Promote code into `shared/` only after real reuse proves it is generic.
- `shared/testing` is test-only and must not be imported by production code.

## Features

Features own their domain, application behavior, infrastructure adapters, and presentation.

```text
src/app/features/<feature-name>/
  domain/
    <concept>.ts
    <concept>.spec.ts

  application/
    <feature>.facade.ts
    <feature>.facade.spec.ts
    <action>.use-case.ts
    <action>.use-case.spec.ts
    ports/
      <dependency>.port.ts

  infrastructure/
    <dependency>.adapter.ts
    <dependency>.adapter.spec.ts
    provide-<feature>.ts

  presentation/
    <feature>.routes.ts
    pages/
      <feature>.page.ts
      <feature>.page.html
      <feature>.page.scss
      <feature>.page.spec.ts
    components/
```

## Dependency Direction

Features must not import from other features directly.

Within a feature:

```text
presentation -> application -> domain
infrastructure -> application/domain
```

Rules:

- `domain/` must be pure TypeScript with no Angular, Ionic, Capacitor, storage, HTTP, or signal imports.
- `application/` owns use cases, ports, facades, and feature-local signal state.
- `infrastructure/` implements application-layer ports.
- `presentation/` owns Ionic pages, components, and feature route declarations.
- Capacitor APIs are allowed only inside infrastructure adapters or app-wide core native adapters.
- Expected application failures should be returned as typed results; exceptions are reserved for unexpected failures and programmer errors.

## Routing

`src/app/app.routes.ts` wires top-level lazy routes. Each feature owns its internal route declarations under `presentation/`.

```text
src/app/features/<feature-name>/presentation/<feature-name>.routes.ts
```

Use standalone Angular components and route declarations. Do not add feature `NgModule` files.

## Configuration

Angular environment files are build-time inputs only. Application code consumes configuration through typed injected tokens under `core/config/`.

```text
src/app/core/config/
  app-config.ts
  app-config.token.ts
  provide-app-config.ts
```

Feature code must not import environment files directly.

## Persistence

Persistence is accessed through application-layer ports and implemented by infrastructure adapters.

- Use Capacitor Preferences for small settings and flags.
- Use SQLite through `@capacitor-community/sqlite` for structured local data, queryable records, offline workflows, and data that needs migrations.
- Keep one app-wide SQLite database capability under `core/storage`; it owns connection lifecycle, startup initialization, migration registration, and generic raw query primitives only.
- Keep ordered SQLite schema migrations under `core/storage/sqlite/migrations` so global database history is auditable from one place.
- Keep feature SQL statements, table row mapping, data migration from older feature storage, and repository behavior in feature infrastructure adapters.
- Use repo-owned raw SQL migration definitions registered through the SQLite upgrade statement API.
- Keep offline-capable boundaries, but do not make every feature offline-first by default.

## State

Feature state is local by default and exposed from the application layer with Angular signals. A global store is not part of the baseline architecture.

Global state is reserved for true app-wide concerns such as session, settings, network status, and device capabilities.

## Testing

The default test strategy is unit-heavy.

- Prefer Vitest for unit tests if the current Ionic Angular toolchain supports it cleanly.
- Use the Angular-supported default runner temporarily only if Vitest is brittle at scaffold time.
- Test domain rules with pure unit tests.
- Test application use cases, facades, and signal state directly.
- Test infrastructure adapters with mocked native, storage, or network dependencies.
- Test presentation components only when they contain meaningful UI behavior.
- Do not add e2e tooling until the first critical user or native integration flow exists.
- Use Maestro as the likely default when Android e2e tests become necessary.

## Logging And Errors

Use a core logging abstraction rather than direct `console` calls. Direct console usage is allowed only inside the logger implementation.

Expected application failures should be returned as typed results from application code. Unexpected errors should flow through the global error handler and internal error reporter boundary.

No external crash reporting provider is part of the initial scaffold. Add Sentry, Firebase, or another provider later behind the existing reporter interface when distribution and privacy requirements are known.

## Styling

Use Ionic components, Ionic theme variables, and SCSS.

```text
src/
  global.scss
  theme/
    variables.scss
```

Rules:

- component and page styles stay local by default
- global styles are limited to Ionic setup, theme tokens, resets, and base rules
- feature-specific styling must not be placed in `global.scss`
- do not add Tailwind initially
- use Ionicons as the only initial icon library
- use Ionic UI components directly in presentation code unless a reusable product-specific UI pattern emerges

## Imports

Use path aliases and ESLint rules to enforce boundaries.

Path aliases:

```json
{
  "@core/*": ["src/app/core/*"],
  "@shared/*": ["src/app/shared/*"],
  "@features/*": ["src/app/features/*"],
  "@env/*": ["src/environments/*"]
}
```

Do not add a broad `@app/*` alias. It makes import boundaries harder to audit.

Barrel files are allowed only at intentional public boundaries with small APIs. Do not create automatic `index.ts` files in every folder.

## Quality Gates

The scaffold should enable strict quality gates from the beginning:

- strict TypeScript
- strict Angular templates
- type-aware ESLint
- TypeScript complexity limits for control flow, nesting, function length, and parameter count
- import boundary enforcement
- no direct feature-to-feature imports
- no direct Capacitor imports outside adapters
- no direct environment imports from feature code
- Prettier formatting
- Stylelint for CSS/SCSS, including selector nesting limits
- lint warnings fail CI

Tooling responsibilities:

- Prettier owns formatting.
- ESLint owns TypeScript and Angular rules.
- `eslint-plugin-boundaries` owns architectural element rules.
- Targeted `no-restricted-imports` rules own sharp bans such as direct Capacitor, environment, console, and cross-feature imports.
- Stylelint owns CSS and SCSS rules.
- Fast pre-commit hooks format and lint staged files.
- CI remains authoritative.

Package scripts should be simple aliases around standard tool commands. Do not add a custom orchestration script layer initially.

## CI

Use GitHub Actions from the initial scaffold.

Split CI into web and Android quality jobs.

The web quality job should run:

```text
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm lint:styles
pnpm test
pnpm build
```

The Android quality job should run:

```text
pnpm install --frozen-lockfile
pnpm android:sync:debug
./gradlew test
./gradlew lint
./gradlew assembleDebug
```

Do not pin Java before the Android scaffold exists. Use the JDK required by the generated Capacitor Android project's Android Gradle Plugin and Android Studio baseline, then pin that verified version explicitly in CI and local documentation.

Release signing uses a long-lived Android keystore kept outside git and injected into GitHub Actions from repository secrets. The first release channel is GitHub Releases, which publishes signed APKs for direct Android installation and future in-app updates. See `docs/release-playbook.md` for the release process.

## Angular Runtime

Use Angular's default Zone.js change detection initially. Feature state should still use signals, but zoneless Angular is deferred until real Ionic navigation, overlays, lifecycle behavior, native plugin callbacks, and tests prove it is worth the compatibility risk.

## Dependency Maintenance

Use Dependabot from the start with a conservative weekly schedule and no auto-merge.

Track at least:

- npm dependencies
- GitHub Actions
- Android/Gradle ecosystem updates where practical

## Deferred Scope

Do not scaffold these until product requirements exist:

- authentication/session handling
- HTTP/API infrastructure
- analytics
- external crash reporting provider
- sample/example feature

When these concerns are introduced later, they must follow the same boundary rules: feature code depends on application ports, app-wide integrations live in `core/`, and vendor SDKs stay behind adapters.

## Scaffold Completion

Generated Ionic and Angular defaults must be cleaned before the scaffold is considered complete.

Completion requires:

- no unused generated pages or components
- no fake feature names
- no direct environment imports outside bootstrap/config
- no direct Capacitor imports outside allowed adapters/core native
- no direct `console`
- no lint warnings
- strict TypeScript passes
- tests pass
- Android debug build passes
