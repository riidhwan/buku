import { SqliteMigration } from '../sqlite-migration';

export const librarySeriesEntryContentOverridesMigration: SqliteMigration = {
  version: 2,
  statements: [
    `
      CREATE TABLE IF NOT EXISTS library_series_entry_content_overrides (
        entry_id TEXT PRIMARY KEY NOT NULL,
        content_html TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES library_series_entries(id) ON DELETE CASCADE
      );
    `,
  ],
};
