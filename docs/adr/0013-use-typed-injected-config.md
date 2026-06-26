# Use typed injected config

Angular environment files are used only as build-time inputs for selecting environment-specific values. Application code consumes configuration through typed injected tokens, which keeps feature code independent of build modes and lets tests provide explicit config fakes.
