# Render Reading Mode from WebView extraction

Buku's Reading Mode is a dedicated Explore reader page rendered by Ionic Angular from article content extracted inside the current Explore Browser WebView. Extraction runs against the live loaded document with Mozilla Readability from the maintained `@mozilla/readability` package, then returns an untrusted, in-memory article snapshot to the application layer; the reader page hides the WebView and renders sanitized article HTML without treating Reading Mode as a second browser or persisted reading history.

Links activated from Reading Mode leave the reader and load through the Explore Browser session, preserving Explore's browser controls and unsupported-capability handling instead of turning the reader page into a nested browser.

The Readability runner should use Angular and Capacitor's existing asset or TypeScript pipeline before adding any custom prebuild step, so the normal `pnpm build` and `cap sync android` path remains authoritative.

Extraction outcomes are typed application results: unavailable article content is expected and distinct from unexpected bridge or script failure.
