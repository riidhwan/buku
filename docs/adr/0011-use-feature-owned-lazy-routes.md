# Use feature-owned lazy routes

The app has a central shell route file for top-level lazy wiring, while each feature owns its internal route declarations under its presentation layer. App-wide guards live in core routing, feature-specific guards stay with the feature, and pages remain thin adapters over application facades or use cases.
