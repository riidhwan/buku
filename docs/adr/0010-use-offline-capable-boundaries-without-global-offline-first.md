# Use offline-capable boundaries without global offline-first

The app is not globally offline-first by default, because feature requirements are not yet known. Repository ports, isolated storage adapters, explicit sync boundaries, and app-wide network status keep offline behavior possible where a feature needs it without imposing sync complexity on every feature.
