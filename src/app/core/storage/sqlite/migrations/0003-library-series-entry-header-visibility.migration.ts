import { SqliteMigration } from '../sqlite-migration';

export const librarySeriesEntryHeaderVisibilityMigration: SqliteMigration = {
  version: 3,
  statements: [
    `
      ALTER TABLE library_series_entries
      ADD COLUMN reader_header_visible INTEGER NOT NULL DEFAULT 1;
    `,
  ],
};
