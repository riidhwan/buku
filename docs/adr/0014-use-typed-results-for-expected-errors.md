# Use typed results for expected errors

Expected application failures are represented as typed results from use cases and facades, while exceptions are reserved for programmer errors, violated invariants, and unexpected failures. Infrastructure adapters map native, storage, and network failures into typed application errors before presentation code turns them into UI state.
