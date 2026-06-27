# Scaffold Checklist

Use this checklist to create the initial Android-first Ionic Angular app.

## Generate App

- Generate a blank Ionic Angular app named `Buku`.
- Use pnpm as the package manager.
- Keep the app at the repository root.
- Configure the Android package id as `me.ramdhani.buku`.
- Add Capacitor Android only.
- Do not add iOS.
- Do not add sample, placeholder, tabs, or sidemenu features.

## Reshape Source

- Create `src/app/core/`.
- Create `src/app/shared/`.
- Create `src/app/features/`.
- Keep `src/app/app.routes.ts` as the top-level lazy route shell.
- Remove or rewrite generated code that violates the feature-first structure.
- Use standalone Angular only; do not add feature `NgModule` files.
- Use Angular's default Zone.js change detection initially.

## Core Boundaries

- Add typed injected config under `src/app/core/config/`.
- Add logging abstraction under `src/app/core/logging/`.
- Add internal error reporter boundary under `src/app/core/errors/`.
- Add app-wide native boundaries only when needed.
- Add app-wide storage setup only when needed.
- Keep feature business concepts out of `core/`.

## Shared Boundaries

- Create responsibility-based shared folders only as needed:
  - `shared/domain/`
  - `shared/application/`
  - `shared/presentation/`
  - `shared/testing/`
- Do not create `shared/services`.
- Do not create `shared/models`.
- Do not promote code to shared until reuse is real.

## Feature Template

- Use this structure for real features:

```text
src/app/features/<feature-name>/
  domain/
  application/
    ports/
  infrastructure/
  presentation/
    pages/
    components/
```

- Keep domain code pure TypeScript.
- Keep signal state in the application layer.
- Keep Capacitor and native APIs behind infrastructure adapters.
- Keep Ionic imports in presentation code.
- Do not allow feature-to-feature imports.

## TypeScript And Angular Strictness

- Enable TypeScript `strict`.
- Enable `noUncheckedIndexedAccess`.
- Enable `exactOptionalPropertyTypes`.
- Enable strict Angular templates.
- Add path aliases for app boundaries:
  - `@core/*`
  - `@shared/*`
  - `@features/*`
  - `@env/*`
- Do not add a broad `@app/*` alias.
- Prevent direct environment imports from feature code.

## Linting And Formatting

- Configure type-aware ESLint.
- Configure `eslint-plugin-boundaries`.
- Configure targeted `no-restricted-imports`.
- Forbid direct feature-to-feature imports.
- Forbid direct Capacitor imports outside adapters.
- Forbid direct environment imports from feature code.
- Forbid direct `console` outside the logger implementation.
- Configure Prettier.
- Configure Stylelint for CSS/SCSS.
- Fail CI on lint warnings.

## Package Scripts

- Keep package scripts as simple aliases around tool commands.
- Do not add a custom orchestration script layer initially.
- Include scripts for:
  - `start`
  - `build`
  - `test`
  - `test:watch`
  - `lint`
  - `lint:styles`
  - `format`
  - `format:check`
  - `cap:sync:android`
  - `android:build:debug`

## Testing

- Prefer Vitest if the Ionic Angular toolchain supports it cleanly.
- Use the Angular-supported default runner only if Vitest is brittle.
- Add unit tests for domain rules, use cases, facades, signal state, and adapters.
- Add component tests only for meaningful UI behavior.
- Do not add e2e tooling until a real critical flow exists.

## Styling

- Use Ionic components and SCSS.
- Keep page and component styles local.
- Keep global styles limited to Ionic setup, theme tokens, resets, and base rules.
- Do not add Tailwind initially.
- Use Ionicons only initially.

## CI And Automation

- Add GitHub Actions CI.
- Split CI into web and Android quality jobs.
- The web quality job must run:

```text
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm lint:styles
pnpm test
pnpm build
```

- The Android quality job must run:

```text
pnpm install --frozen-lockfile
pnpm android:sync:debug
./gradlew test
./gradlew lint
./gradlew assembleDebug
```

- Pin the CI JDK only after the generated Android Gradle Plugin requirement is verified.
- Add fast pre-commit hooks for staged formatting/linting.
- Add Dependabot with weekly updates and no auto-merge.
- Defer release signing.

## Scaffold Completion

- Clean generated Ionic and Angular defaults before the scaffold is considered done.
- Remove unused generated pages and components.
- Remove fake feature names.
- Ensure there are no lint warnings.
- Ensure strict TypeScript passes.
- Ensure tests pass.
- Ensure Android debug build passes.

## Deferred Until Requirements Exist

- Do not scaffold auth/session.
- Do not scaffold HTTP/API infrastructure.
- Do not scaffold analytics.
- Do not add an external crash reporting provider.
- Do not add a sample feature.
