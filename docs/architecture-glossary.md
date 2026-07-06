# Architecture Glossary

This glossary defines the engineering terms used in Buku's architecture. These definitions are binding for code placement, dependency decisions, and module-depth review.

For product language, use `CONTEXT.md`. Keep this document focused on implementation architecture.

## Module

Any implementation unit with an interface that other code depends on.

A module can be a function, class, file, feature slice, adapter, facade, workflow, or policy. The term is deliberately scale-neutral so architecture review can ask the same question at every size: does this interface give callers enough leverage for the complexity it introduces?

Do not use file count or layer count as a proxy for module quality. A small file can still be shallow, and a larger workflow can be justified when it concentrates behavior behind a smaller interface.

## Interface

Everything a caller must know to use a module correctly.

An interface includes public methods and types, but also state ordering, invariants, expected failures, side effects, persistence timing, native capability assumptions, and test setup. A TypeScript `interface` is only one possible part of a module interface.

Keep interfaces small enough that callers do not need to understand the module's implementation details. When presentation code has to know tab lifecycle, viewport lifecycle, reading mode invalidation, persistence timing, and notice behavior separately, the interface is probably too broad even if the imports follow the layer rules.

## Depth

The amount of behavior hidden behind a module interface.

A deep module gives callers high leverage: callers learn a small interface and get substantial behavior. A shallow module has an interface nearly as complex as its implementation, so it adds ceremony without improving locality.

Use the deletion test during review: if deleting a module would mostly remove pass-through code, the module is shallow; if deleting it would spread rules, sequencing, error handling, or native/persistence knowledge across callers, the module is earning its place.

Depth review is separate from dependency-direction review. A module can obey every import rule and still be shallow.

## Seam

A place where behavior can change without editing the caller.

Ports create seams for outside-world dependencies, facades create seams between presentation and application behavior, and adapters sit behind seams. Add a seam when it improves locality, when two real adapters exist or are likely, or when it protects callers from volatile implementation knowledge.

Do not add a seam just to satisfy a template. One adapter with no meaningful variation is a hypothetical seam; keep it only when it hides real complexity or protects a dependency direction that matters.

## Adapter

An infrastructure-layer class that implements an application-layer port using a concrete external dependency.

Adapters live under `src/app/features/<feature>/infrastructure/` unless they wrap a genuinely app-wide native capability in `core/`.

Adapters may import Capacitor, native APIs, storage implementations, HTTP clients, or other outside-world dependencies. They must not leak those dependencies into presentation, application, or domain code.

## Application Layer

The feature layer that owns use cases, facades, ports, and feature-local signal state.

Application code lives under `src/app/features/<feature>/application/`.

Application code may depend on the feature's domain layer. It must not import Ionic, Capacitor, environment files, presentation code, or infrastructure adapters.

## Core

App-wide wiring and platform capability code.

Core code lives under `src/app/core/`.

Use core for configuration, bootstrap, global errors, logging, app-wide routing helpers, app-wide storage setup, and app-wide native boundaries. Core must not contain feature business concepts and must not depend on features.

## Domain Layer

The pure TypeScript layer for feature business concepts, value types, invariants, and rules.

Domain code lives under `src/app/features/<feature>/domain/`.

Domain code must not import Angular, Ionic, Capacitor, storage, HTTP, signals, environment files, presentation code, application code, or infrastructure code.

## Facade

An application-layer service that gives presentation code a stable API for a feature workflow.

Facades live under `src/app/features/<feature>/application/` and are named `<feature-or-workflow>.facade.ts`.

A facade may expose feature-local signal state, call use cases or policies, coordinate ports, and return typed results for expected failures. Presentation code should call a facade instead of directly coordinating ports or adapters.

A facade should be deep enough to reduce what presentation code must know. A facade with many pass-through methods can still be acceptable as Angular dependency-injection wiring, but only when the behavior is clearly owned by a deeper workflow or use case and tested there. If callers must coordinate several facade methods in the right order to perform one product action, prefer deepening the facade or introducing an application workflow.

When a class primarily owns workflow behavior rather than serving as the presentation-facing Angular dependency-injection boundary, name it as a workflow instead of a facade. This keeps the facade role narrow enough for test-obligation tooling and review.

## Feature

A vertical product slice under `src/app/features/<feature-name>/`.

Each real feature owns its own `domain/`, `application/`, `infrastructure/`, and `presentation/` folders as needed. Features must not import from other features directly.

Do not add placeholder or sample features.

## Infrastructure Layer

The feature layer that connects application code to concrete platform, persistence, native, browser, network, or device APIs.

Infrastructure code lives under `src/app/features/<feature>/infrastructure/`.

Infrastructure implements application ports, provides dependency-injection wiring for the feature, and isolates outside-world APIs from the rest of the feature.

## Injection Token

An Angular dependency-injection key used when the requested dependency is an interface, configuration value, or otherwise needs an explicit runtime token.

Use typed injection tokens for ports and configuration boundaries. Feature code must consume configuration through typed tokens, not by importing environment files.

## Port

An application-layer interface that describes a dependency the feature needs from outside the application layer.

Ports live under `src/app/features/<feature>/application/ports/` and are named `<dependency>.port.ts`.

Ports must describe what the application needs, not the concrete technology used to provide it. A port must not import Capacitor, Ionic, browser APIs, storage implementations, HTTP clients, presentation code, or infrastructure code.

A port should be stable at the seam it creates. Splitting a broad port is useful when callers use independent capabilities separately or when different adapters would implement those capabilities differently. Keeping a broad port is useful when the operations must share lifecycle, ordering, caching, or native state.

## Presentation Layer

The feature layer that owns Ionic Angular UI.

Presentation code lives under `src/app/features/<feature>/presentation/`.

Use presentation for route declarations, pages, UI components, templates, and styles. Presentation code may call application facades and read application state, but it must not import infrastructure adapters, Capacitor APIs, storage implementations, or feature code from other features.

Presentation may own UI-only workflows such as DOM selection, editor focus, local popover state, and Ionic event handling. Promote a presentation workflow into the application layer when it owns product state transitions, multi-step persistence decisions, expected failure mapping, or reusable feature behavior that should be testable without Ionic or DOM setup.

## Provider

Angular dependency-injection wiring that binds ports, facades, policies, and adapters for a feature or app-wide capability.

Feature providers live under `src/app/features/<feature>/infrastructure/` and are named `provide-<feature>.ts`.

Providers may connect an application-layer port token to an infrastructure adapter with `useExisting`, `useClass`, or equivalent Angular provider wiring.

Feature-to-feature composition adapters do not belong inside either feature unless one feature truly owns the use case. Put collaboration code at `src/app/composition/` or another explicitly documented owning module so direct feature imports do not hide in root-level files.

## Raw SQL

Handwritten SQL statements owned by infrastructure code.

Feature SQL lives with the feature infrastructure adapter that executes and maps it. Core storage may expose generic query, run, execute, transaction, and migration primitives, but it must not contain feature table names, row shapes, or business queries.

## Shared

Reusable code that has already proven it is generic across multiple features.

Shared code lives under `src/app/shared/` and is organized by responsibility: `domain/`, `application/`, `presentation/`, and `testing/`.

Do not create `shared/services` or `shared/models`. Prefer local duplication until a shared abstraction is obvious.

## Typed Result

A typed return value for an expected application failure.

Use typed results when a user action or outside-world operation can fail in a known way. Reserve exceptions for programmer errors, violated invariants, and unexpected failures.

Infrastructure adapters should map native, storage, and network failures into typed application errors before presentation code turns them into UI state.

## Test Obligation

The expectation that a production file or behavior-owning unit has focused automated tests proving its meaningful behavior.

Test obligation follows behavioral responsibility rather than file count. Files that own rules, state transitions, workflow decisions, persistence behavior, error mapping, or UI behavior need focused tests. Thin dependency-injection wrappers, route declarations, provider wiring, tokens, ports, and type-only files may lack nearby specs when their behavior is covered through the nearest meaningful boundary or when they contain no behavior to test.

## SQLite Migration

An ordered database schema change for the app-wide SQLite database.

Migrations are repo-owned raw SQL definitions registered through the SQLite integration during app startup. Migration files may create or change feature-owned tables, but feature data migrations from an older storage adapter stay in that feature's infrastructure.

## Use Case

An application-layer operation that performs one focused user or system action.

Use cases live under `src/app/features/<feature>/application/` and are named `<action>.use-case.ts`.

Use cases may coordinate domain rules and ports. They should return typed results for expected failures.

## Workflow

An application-layer coordinator that owns a multi-step feature interaction, state transition sequence, or long-lived application state that is broader than one use case.

Workflows live under `src/app/features/<feature>/application/` and are named `<feature-or-interaction>-workflow.ts`. A workflow is behavior-owning and carries test obligation by default.

A workflow should provide locality for rules that otherwise spread across pages, facades, policies, and adapters. Prefer one workflow interface for a coherent product interaction over many shallow helper modules when callers would otherwise need to know the sequencing.
