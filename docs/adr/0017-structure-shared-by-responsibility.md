# Structure shared by responsibility

Shared code is organized by responsibility rather than by vague buckets: `shared/domain`, `shared/application`, `shared/presentation`, and `shared/testing`. The project avoids generic `shared/services` and `shared/models`; code is promoted to shared only after real reuse proves that it is not feature-specific.
