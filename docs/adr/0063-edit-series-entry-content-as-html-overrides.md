# Edit Series Entry content as HTML overrides

Series Entry edits are stored as optional Series Entry Content Overrides instead of replacing the original saved Reading Mode snapshot. The override is canonical sanitized HTML rendered by Buku's reader, while the user edits through a visual editor over the rendered content rather than raw HTML or Markdown.

Overrides are persisted separately from `library_series_entries.content_html`, using one current override per Series Entry. This preserves the source snapshot, keeps Library reading on the same HTML rendering path as saved Reading Mode content, makes reset-to-original a delete of the override, and avoids lossy HTML-to-Markdown round-tripping for links, headings, lists, images, blockquotes, and other extracted article structure.

The first edit surface is a Library-owned page for one Series Entry. It edits body content only, starts from the currently displayed effective content, requires explicit save, supports cancel and reset-to-original, allows deleting existing media such as images, and does not provide revision history, diff view, metadata editing, media insertion, or link-target editing. Library ordering, counts, titles, and original entry timestamps are unchanged by content overrides; UI may show quiet edited indicators where useful.

Edited HTML is treated as untrusted input. A Library application use case validates and sanitizes the edited content through a port before persistence, blocks empty overrides, and reports expected edit failures as typed results.
