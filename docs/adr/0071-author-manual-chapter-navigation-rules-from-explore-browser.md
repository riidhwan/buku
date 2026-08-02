# Author Manual Chapter Navigation Rules from Explore Browser

Manual Chapter Navigation Rules are scoped to Chapter Navigation only; they do not override Reading Mode article extraction. A rule is created from a link in the live Explore Browser page because that is where the original source DOM and surrounding navigation context still exist.

Reading Mode's rendered article remains sanitized extracted content and is not the authoring surface for these rules. When a user needs to teach Buku a previous or next chapter link, the flow may return to or reveal the Explore Browser page, let the user choose the source-page link, persist the resulting source-domain rule, and then re-run Reading Mode extraction with that rule available.

Manual Chapter Navigation Rules may include a user-editable CSS selector for advanced users. Buku evaluates these selectors only against visible source-page links: a link selector must match `a[href]` elements directly, while a container selector must be explicitly marked as a container rule before Buku searches inside the matched container for candidate links. This keeps raw selector authoring available without letting an arbitrary element match silently become Chapter Navigation.

Selectors may resolve to more than one visible chapter link. When multiple visible links match, Buku uses the first match in source-page document order. Preview still shows all matches so the user can see which link will count.

Manual Chapter Navigation Scope defaults to the current source-page host and may be narrowed with a path prefix when a rule belongs to one work or section. Rules are not exact-page scoped by default because they should apply across adjacent chapters, and they are not registrable-domain scoped by default because subdomains can use unrelated markup.

When a valid Manual Chapter Navigation Rule and automatic Chapter Navigation detection both produce a target for the same direction, the manual rule wins. If a manual rule no longer validates on a page, Reading Mode falls back to automatic detection for that direction and surfaces the rule problem only in the advanced rule-management UI.

Manual Chapter Navigation Rules are stored as a Manual Chapter Navigation Rule Set per scope, with optional previous and next rules inside the set. Rule evaluation remains direction-specific so a broken previous rule does not disable a valid next rule.

Saving a manual rule goes through Manual Chapter Navigation Preview. Long-pressing a source-page link may seed candidate selectors, direction, and scope, but the user reviews live matches before the rule is persisted.

The authoring UI exposes a focused link context inspector rather than a full raw DOM tree. It shows the selected link's text, href, relevant attributes, and a small ancestor summary, with an advanced sanitized snippet for the selected link context when needed.

Rule authoring is available from any loaded Explore Browser page through an advanced long-press link action. It is not limited to Reading Mode being active or automatic Chapter Navigation being absent, though the preview can show whether the manual rule would override an automatically detected target.

Explore owns source-page rule authoring entry points because it owns the live page and link selection. More owns saved rule-set management because listing, editing, disabling, and deleting domain/path rules is an app settings workflow rather than browser navigation.

Manual Chapter Navigation Rule Sets can be disabled without being deleted. Disabled rule sets remain manageable but do not participate in Reading Mode extraction.

Creating a rule from a long-pressed link requires validation against the current page. Later edits from management may be saved as an Unverified Manual Chapter Navigation Rule when no loaded source page is available for preview, but unverified state is shown in management until the rule validates again.

During creation, the validated selector must include the link the user long-pressed, and the first preview match is the link that will count during Reading Mode extraction. A selector whose first match points to a different link is treated as a mismatch requiring the selector to be narrowed.

Manual Chapter Navigation Selectors use CSS selectors evaluated by Buku's injected extraction code. They do not support JavaScript or XPath. Evaluation is guarded with selector-length limits, match-count limits, error handling for invalid selectors, and visible-link filtering before a target can become Chapter Navigation.

Persisted rule sets store durable rule data and lightweight recognition context: identity, scope, enabled state, optional previous and next rules, selector mode, selector string, optional legacy disambiguation, verification metadata, sample label/href, and timestamps. Raw DOM snippets are preview-only and are not persisted.

Reading Mode extraction receives a selected, sanitized rule payload from the Explore application layer. The injected WebView extraction script evaluates that payload against the live source DOM, but it does not query persisted rule storage directly.

At most one enabled Manual Chapter Navigation Rule Set applies to a Reading Mode extraction. Selection uses the most specific matching scope for the current URL, preferring exact host match and then longest matching path prefix. Duplicate enabled scopes are rejected at save time.

Manual rule failures during ordinary Reading Mode extraction do not show reader notices. Reading Mode falls back to automatic detection for the failed direction, and failure details belong in rule management or preview surfaces.

The link context inspector keeps source-page context minimal for privacy and mobile usability. It avoids broad surrounding text, clips advanced snippets, sanitizes displayed markup, and focuses on the selected link plus relevant ancestor attributes.

Manual Chapter Navigation Rule Sets are local device settings for now. Their data shape should remain stable and serializable so future import/export can be added without changing the core rule model, but this decision does not introduce sync semantics.

Explore owns the Manual Chapter Navigation domain, application behavior, extraction integration, and persistence boundary because the rules change Reading Mode behavior and depend on the live Explore Browser page. More may provide rule-management UI, but it does not own the rule behavior; any cross-feature access must preserve Buku's feature dependency rules through an application/composition boundary.

Long-press link selection requires native WebView bridge support. The browser viewport boundary should expose a typed event for a long-pressed source-page link with bounded inspected context; Angular should not try to infer native WebView link selection from outside the WebView surface.
