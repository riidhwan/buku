# Use continuous Series Entry Reading

Library Series Entry Reading starts from the selected saved Series Entry and continues forward by appending one later saved Series Entry from the same Series when the user reaches the bottom. The route remains anchored to the originally selected entry, toolbar previous/next entry buttons are not part of this reading model, and the reader stops with a quiet "No more saved entries." boundary when the Series has no later saved entries.

This keeps Library reading scoped to persisted snapshots instead of source-site chapter discovery, avoids adding reading-progress persistence before that domain exists, and treats failures to load the next saved entry as local retryable failures rather than silently skipping saved content.
