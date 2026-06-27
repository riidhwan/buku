import { SqliteMigration } from '../sqlite-migration';

export const libraryInitialSchemaMigration: SqliteMigration = {
  version: 1,
  statements: [
    `
      CREATE TABLE IF NOT EXISTS library_series (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        normalized_title TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS library_series_entries (
        id TEXT PRIMARY KEY NOT NULL,
        series_id TEXT NOT NULL,
        display_title TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_host TEXT,
        article_title TEXT NOT NULL,
        byline TEXT,
        site_name TEXT,
        published_time TEXT,
        content_html TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (series_id) REFERENCES library_series(id) ON DELETE CASCADE,
        UNIQUE(series_id, source_url)
      );
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_library_series_entries_series_created_at
      ON library_series_entries(series_id, created_at);
    `,
  ],
};
