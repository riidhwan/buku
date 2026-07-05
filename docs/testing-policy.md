# Testing Policy

Buku uses coverage as a guardrail, not as the definition of test confidence. A file reaching 100% text coverage does not prove the right behaviors are tested, and a production file lacking a same-basename spec is not automatically undertested.

The primary standard is test obligation: behavior-owning production code must have focused automated tests, either through a same-basename nearby spec or through an explicit machine-readable exception that names the tested boundary covering it.

## Default Spec Location

When a production file has test obligation, the default expectation is a same-directory, same-basename spec:

```text
src/app/features/more/application/more.facade.ts
src/app/features/more/application/more.facade.spec.ts
```

Use a different spec location only when the behavior is deliberately covered through a broader boundary. That exception must be documented in the machine-readable exception manifest.

## Files That Usually Carry Test Obligation

- Domain files that own rules, invariants, parsing, validation, or derived behavior.
- Application use cases: `*.use-case.ts`.
- Application workflows: `*-workflow.ts`.
- Policies: `*.policy.ts` or `*-policy.ts`.
- Reducers: `*.reducer.ts` or `*-reducer.ts`.
- Infrastructure adapters: `*.adapter.ts`.
- Presentation helpers or components that own meaningful UI behavior.

## Files That May Lack Nearby Specs

These files may lack same-basename specs when they contain no meaningful behavior:

- Ports: `*.port.ts`.
- Injection tokens: `*.token.ts`.
- Route declarations: `*.routes.ts`.
- Provider wiring: `provide-*.ts`.
- Type-only result, DTO, or shape files.
- Thin Angular dependency-injection facades that only expose a presentation-facing API and delegate to a behavior-owning workflow or use case.

Provider and route wiring can still need tests when the wiring is meaningful or easy to break.

## Ambiguous Files

Ambiguous files should be renamed to reveal their role or listed in the exception manifest.

For example, a presentation-facing Angular facade and a behavior-owning workflow should not both be named as facades. The preferred naming is:

```text
explore-browser.facade.ts
explore-browser-workflow.ts
```

`explore-browser.facade.ts` may be a thin dependency-injection boundary. `explore-browser-workflow.ts` owns workflow behavior and carries test obligation by default.

## Exception Manifest

Exceptions must be machine-readable and auditable. Each exception must name why the file lacks a same-basename spec and which spec covers the behavior instead.

```json
{
  "src/app/features/explore/application/explore-browser.facade.ts": {
    "classification": "thin-delegator",
    "reason": "Angular DI facade that only injects dependencies and delegates to ExploreBrowserWorkflow.",
    "coveredBy": ["src/app/features/explore/application/explore-browser-workflow.spec.ts"]
  }
}
```

The test-obligation gate should reject stale exception paths, empty reasons, and `coveredBy` entries that do not point to existing spec files.
