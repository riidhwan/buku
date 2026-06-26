# Feature-first structure with explicit shared boundaries

The app is organized feature-first, with each feature owning its domain, application, infrastructure, and presentation code. Features must not import from other features directly; reusable code belongs in a clearly named `shared/` area, app-wide integration belongs in `core/`, and ambiguous duplication should remain local until an owning concept is clear.
