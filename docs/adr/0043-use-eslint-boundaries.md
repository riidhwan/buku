# Use ESLint boundaries

The project uses `eslint-plugin-boundaries` for architectural element rules and targeted `no-restricted-imports` rules for sharp bans. This fits the single-app structure better than Nx module boundaries while still enforcing feature layers, cross-feature isolation, Capacitor boundaries, environment import restrictions, and console usage rules.
