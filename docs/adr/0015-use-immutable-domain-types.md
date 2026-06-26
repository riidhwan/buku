# Use immutable domain types

Domain code defaults to immutable plain TypeScript types and pure functions, with branded primitives or richer value objects introduced only when they prevent invalid states or protect important invariants. Domain code must remain free of Angular, Ionic, Capacitor, storage, HTTP, and signal dependencies.
