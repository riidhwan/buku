# Keep core to app-wide wiring

`core/` contains app-wide configuration, errors, logging, routing, bootstrap, storage setup, and platform capabilities that are not owned by a specific feature. It must not contain feature business concepts, and it must not depend on any feature.
