# Use distributed Route Targets for view routes

Buku view routes use a shared core `RouteTarget` helper for Angular command arrays and encoded URL strings, while actual route target builders stay with their routing owner: top-level tab targets in app-wide routing and feature-internal targets beside each feature's presentation routes. This preserves feature-owned lazy routing and avoids a global route registry that would centralize feature business concepts, while still removing caller reliance on memorized path segment ordering, parameter placement, and URL encoding rules.

Feature presentation code may execute navigation with Angular `Router`, `routerLink`, Ionic `href`, or `defaultHref`, but it should receive destination shape from the owning route target builder rather than reconstructing route strings inline. Navigation history choices such as `replaceUrl` remain with the workflow or UI interaction that owns the user action.
