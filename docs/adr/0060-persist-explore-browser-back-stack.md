# Persist Explore Browser Back Stack

Buku persists a capped per-tab Explore Browser Back Stack in the existing Preferences-backed Explore Browser tab session so the back button remains useful after app restarts, while still treating Explore Browser Tabs as lightweight URL slots instead of live browser sessions. The stack records only committed final URLs, collapses consecutive duplicates, keeps backward navigation only, and is restored as an Angular-managed fallback when native WebView history is empty rather than replaying old URLs into the WebView during startup.

This preserves the scope boundary from ADR 0055 while accepting a narrow, durable navigation aid for Android back-button continuity. A fallback back navigation removes the target URL from the persisted stack only after the target page successfully commits, so failed loads do not destroy the user's previous back target.

Closing an Explore Browser Tab deletes its persisted back stack because the stack exists only to support that tab's back button and should not become orphaned browsing history.

This change does not add a separate clear-history UI; users discard the persisted back stack by closing the relevant Explore Browser Tab.

Existing saved tabs without a back stack, or with malformed back stack data, are treated as having an empty stack so older sessions continue to load without a separate migration.
