# Use embedded WebView for Explore Browser

Buku's Explore Browser renders web pages in an embedded native WebView owned by the Explore feature rather than launching a system browser or custom tab. This keeps URL entry, navigation controls, unsupported-capability messaging, and a future reading-mode handoff inside Buku's product flow, at the cost of owning more browser-adjacent native behavior; reading mode itself remains outside this decision's scope.
