# Use Zone.js initially

The initial scaffold uses Angular's default Zone.js change detection while still using signals for feature-local state. Zoneless Angular can be revisited after real Ionic navigation, overlays, lifecycle behavior, native plugin callbacks, and tests prove it is worth the additional compatibility risk.
