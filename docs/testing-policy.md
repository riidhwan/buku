# Testing Policy

Buku uses coverage as a guardrail, not as the definition of test confidence. A file reaching 100% text coverage does not prove the right behaviors are tested, and a production file lacking a same-basename spec is not automatically undertested.

The primary standard is test obligation: behavior-owning production code must have focused automated tests, either through a same-basename nearby spec or through an explicit machine-readable exception that names the tested boundary covering it.

The preferred test surface is the same interface callers use. Tests should prove behavior through a module's public interface instead of reaching into extracted helpers only because they are easier to instantiate. If the useful behavior is hard to test except through many shallow modules, reconsider the module shape before adding more specs.

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
- Presentation workflows that own UI-only behavior, such as DOM selection, editor formatting state, or Ionic event adaptation.

## Files That May Lack Nearby Specs

These files may lack same-basename specs when they contain no meaningful behavior:

- Ports: `*.port.ts`.
- Injection tokens: `*.token.ts`.
- Route declarations: `*.routes.ts`.
- Provider wiring: `provide-*.ts`.
- Type-only result, DTO, or shape files.
- Thin Angular dependency-injection facades that only expose a presentation-facing API and delegate to a behavior-owning workflow or use case.
- Extracted helpers whose behavior is fully covered through a deeper module interface listed in the exception manifest.

Provider and route wiring can still need tests when the wiring is meaningful or easy to break.

## Testing And Module Depth

Test obligation follows behavioral responsibility, but architecture review should still ask whether the tested module is deep enough.

Use these signals during review:

- A same-basename spec that mostly verifies pass-through calls suggests a shallow module.
- A page spec that needs large fake facades, many DOM interactions, or repeated persistence setup may indicate product behavior should move behind an application workflow.
- A facade spec that duplicates workflow specs may indicate the facade should be classified as thin wiring or the workflow interface should absorb more behavior.
- A policy spec is useful when the policy hides a real rule; it is noise when the caller still has to know how to sequence several policies correctly.
- A port fake with many methods that each need setup may indicate the port interface is too broad for its seam.

Do not refactor just to reduce spec length. Refactor when tests reveal poor locality: one product behavior requires setup or assertions across several modules.

## Presentation Workflow Promotion

Presentation workflows may stay in `presentation/` when they adapt Ionic, Angular, DOM selection, focus, editor commands, or transient view state. Their tests can use Angular, DOM, and Ionic fakes because that is the behavior being protected.

Promote a presentation workflow to `application/` when most of its tests are about product state transitions, persistence outcomes, expected failure mapping, or route-independent user decisions. After promotion, page specs should mostly verify binding and UI adaptation, while application workflow specs verify the product behavior through a smaller interface.

## Ambiguous Files

Ambiguous files should be renamed to reveal their role or listed in the exception manifest.

For example, a presentation-facing Angular facade and a behavior-owning workflow should not both be named as facades. The preferred naming is:

```text
explore-browser.facade.ts
explore-browser-workflow.ts
```

`explore-browser.facade.ts` may be a thin dependency-injection boundary. `explore-browser-workflow.ts` owns workflow behavior and carries test obligation by default.

Thin facades should stay thin. If a facade begins to own sequencing, expected failure mapping, or state transitions, either give it focused tests as the behavior-owning module or move that behavior into a named workflow and keep the facade as Angular wiring.

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
