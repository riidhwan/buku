# Use app composition for feature collaboration

Feature-first structure prevents direct feature-to-feature imports, but some product workflows still need one feature to satisfy another feature's application port. Reading Mode saving into Library is the first concrete example: Explore owns the Reading Mode save UI, while Library owns Series, Series Entry, and persistence behavior.

Use `src/app/composition/` for narrow adapters that bind one feature's application port to another feature's application facade or use case. Composition code may import feature application interfaces from more than one feature, but it must not own feature domain rules, persistence behavior, native adapters, or UI.

This refines ADR-0003 and ADR-0018: app-level feature collaboration is app wiring, but it is not `core/`. `core/` remains feature-agnostic platform capability and must not depend on features.

Keep composition modules small and explicit. If collaboration grows into product behavior rather than wiring, choose one feature as the owner or introduce a new feature with its own domain and application layer.
