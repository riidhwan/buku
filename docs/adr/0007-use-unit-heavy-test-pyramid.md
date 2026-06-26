# Use a unit-heavy test pyramid

The project favors fast unit tests for domain rules, application use cases, feature facades, signal state, and infrastructure adapters. Component tests are focused on meaningful UI behavior, while Android e2e tests are kept small and reserved for high-value flows that exercise native integration or critical user journeys.
