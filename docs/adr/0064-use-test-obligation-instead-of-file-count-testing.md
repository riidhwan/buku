# Use test obligation instead of file count testing

Buku uses test obligation rather than per-file test count as the unit testing standard. Behavior-owning files must have focused tests or an explicit machine-readable exception, while thin dependency-injection wrappers, route declarations, provider wiring, tokens, ports, and type-only files may lack nearby specs when they contain no meaningful behavior. This keeps high coverage from becoming a paper target while avoiding brittle tests that only prove delegation or file existence.
